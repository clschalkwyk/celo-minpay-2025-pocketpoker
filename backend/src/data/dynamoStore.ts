import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { customAlphabet } from 'nanoid'
import type {
  CreatorDeckSubmission,
  DeckPurchase,
  DeckTheme,
  LeaderboardEntry,
  Match,
  Mission,
  QueueTicket,
  UserProfile,
  WalletAddress,
} from '../types.js'
import { sampleDecks, seededCreatorDecks } from './deckData.js'

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)
const tableName = process.env.DYNAMO_TABLE_NAME

const dynamoRegion = process.env.AWS_REGION ?? process.env.ASSET_UPLOAD_REGION ?? 'us-east-1'

const docClient = tableName
  ? DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: dynamoRegion,
      }),
      {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      },
    )
  : null

const sampleMissions: Mission[] = [
  {
    id: 'mission-1',
    title: 'Warm-up Laps',
    description: 'Play 3 matches today.',
    type: 'daily',
    target: 3,
    progress: 1,
    rewardXp: 150,
    rewardDescription: 'Daily XP bonus',
    state: 'active',
    objective: 'matches_played',
  },
  {
    id: 'mission-2',
    title: 'Rank Push',
    description: 'Earn 400 XP this week.',
    type: 'seasonal',
    target: 400,
    progress: 220,
    rewardXp: 400,
    rewardDescription: 'XP boost toward Street Ace',
    state: 'active',
    objective: 'xp_earned',
  },
  {
    id: 'mission-3',
    title: 'Queue Warrior',
    description: 'Play 5 matches with any stake.',
    type: 'daily',
    target: 5,
    progress: 2,
    rewardXp: 250,
    rewardDescription: 'Unlocks Sunrise Mirage preview',
    state: 'active',
    objective: 'matches_played',
  },
  {
    id: 'mission-4',
    title: 'Grind the Glow',
    description: 'Earn 600 XP from wins this week.',
    type: 'seasonal',
    target: 600,
    progress: 450,
    rewardXp: 600,
    rewardDescription: 'Unlocks Holofoil Flux preview',
    state: 'active',
    objective: 'xp_earned',
  },
]

const sampleLeaderboard: LeaderboardEntry[] = Array.from({ length: 8 }).map((_, index) => ({
  id: `leader-${index + 1}`,
  walletAddress: `0xLEADER${index + 1}`,
  username: `Ranker_${index + 1}`,
  elo: 1800 - index * 20,
  wins: 30 - index * 2,
  rank: index + 1,
}))

const pkProfile = (wallet: string) => `PROFILE#${wallet}`
const skProfile = 'PROFILE'
const skMission = (missionId: string) => `MISSION#${missionId}`
const pkMatch = (matchId: string) => `MATCH#${matchId}`
const skMatch = 'DETAIL'
const pkCreatorSubmission = (id: string) => `CREATOR_SUBMISSION#${id}`
const skCreatorSubmission = 'DETAIL'
const pkSubmissionFeed = 'CREATOR_SUBMISSIONS'
const skSubmissionFeed = (status: string, submittedAt: number, id: string) =>
  `STATUS#${status}#${String(submittedAt).padStart(13, '0')}#${id}`
const pkPurchases = 'PURCHASES'
const skPurchase = (timestamp: number, id: string) => `PURCHASE#${String(timestamp).padStart(13, '0')}#${id}`
const pkQueueStake = (stake: number) => `QUEUE#${stake}`
const skQueueTicket = (timestamp: number, ticketId: string) =>
  `TICKET#${String(timestamp).padStart(13, '0')}#${ticketId}`
const pkQueueWallet = (wallet: string) => `QUEUE_WALLET#${wallet}`
const skQueueWallet = (stake: number, ticketId: string) => `TICKET#${stake}#${ticketId}`
const pkCreditHold = (ticketId: string) => `CREDIT_HOLD#${ticketId}`
const skCreditHold = 'DETAIL'

const ensureClient = () => {
  if (!tableName || !docClient) {
    throw new Error('DYNAMO_TABLE_NAME must be set to use DynamoStore')
  }
  return docClient
}

export class DynamoStore {
  private client = ensureClient()

  getDecks(): DeckTheme[] {
    return sampleDecks
  }

  async listCreatorDecks() {
    const items = await this.fetchSubmissions()
    return items
  }

  private async fetchSubmissions(status?: 'pending' | 'approved' | 'rejected'): Promise<CreatorDeckSubmission[]> {
    const results: CreatorDeckSubmission[] = []
    let exclusiveStartKey: Record<string, unknown> | undefined
    do {
      const resp = await this.client.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': pkSubmissionFeed,
          },
          ExclusiveStartKey: exclusiveStartKey,
          ScanIndexForward: false,
        }),
      )
      const items = resp.Items ?? []
      for (const item of items) {
        if (!item.submission) continue
        const submission = item.submission as CreatorDeckSubmission
        if (status && submission.status !== status) continue
        results.push(submission)
      }
      exclusiveStartKey = resp.LastEvaluatedKey
    } while (exclusiveStartKey)

    if (!results.length) {
      await this.seedCreatorDecks()
      return this.fetchSubmissions(status)
    }

    return results
  }

  private async seedCreatorDecks() {
    const writes = seededCreatorDecks.flatMap((submission) => {
      const feedItem = {
        PutRequest: {
          Item: {
            PK: pkSubmissionFeed,
            SK: skSubmissionFeed(submission.status, submission.submittedAt, submission.id),
            submission,
          },
        },
      }
      const detailItem = {
        PutRequest: {
          Item: {
            PK: pkCreatorSubmission(submission.id),
            SK: skCreatorSubmission,
            submission,
          },
        },
      }
      return [feedItem, detailItem]
    })

    if (!writes.length) return
    for (let i = 0; i < writes.length; i += 25) {
      const chunk = writes.slice(i, i + 25)
      await this.client.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName!]: chunk,
          },
        }),
      )
    }
  }

  async submitCreatorDeck(payload: {
    deckName: string
    creatorName: string
    rarity: DeckTheme['rarity']
    description: string
    previewImageUrl: string
  }) {
    const submission: CreatorDeckSubmission = {
      id: `creator-${nanoid()}`,
      deckName: payload.deckName,
      creatorName: payload.creatorName,
      rarity: payload.rarity,
      description: payload.description,
      previewImageUrl: payload.previewImageUrl,
      status: 'pending',
      submittedAt: Date.now(),
      nsfwFlag: false,
    }

    await this.client.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName!]: [
            {
              PutRequest: {
                Item: {
                  PK: pkCreatorSubmission(submission.id),
                  SK: skCreatorSubmission,
                  submission,
                },
              },
            },
            {
              PutRequest: {
                Item: {
                  PK: pkSubmissionFeed,
                  SK: skSubmissionFeed(submission.status, submission.submittedAt, submission.id),
                  submission,
                },
              },
            },
          ],
        },
      }),
    )

    return submission
  }

  async updateCreatorDeck(
    id: string,
    updates: Partial<CreatorDeckSubmission>,
  ): Promise<CreatorDeckSubmission | undefined> {
    const existing = await this.getCreatorDeck(id)
    if (!existing) return undefined
    const next: CreatorDeckSubmission = { ...existing, ...updates }
    await this.client.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName!]: [
            {
              PutRequest: {
                Item: {
                  PK: pkCreatorSubmission(id),
                  SK: skCreatorSubmission,
                  submission: next,
                },
              },
            },
            {
              PutRequest: {
                Item: {
                  PK: pkSubmissionFeed,
                  SK: skSubmissionFeed(next.status, next.submittedAt, next.id),
                  submission: next,
                },
              },
            },
          ],
        },
      }),
    )
    return next
  }

  private async getCreatorDeck(id: string): Promise<CreatorDeckSubmission | undefined> {
    const resp = await this.client.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: pkCreatorSubmission(id),
          SK: skCreatorSubmission,
        },
      }),
    )
    return (resp.Item?.submission as CreatorDeckSubmission | undefined) ?? undefined
  }

  async updateCreatorDeckStatus(id: string, status: CreatorDeckSubmission['status'], reviewNotes?: string) {
    return this.updateCreatorDeck(id, { status, reviewNotes })
  }

  getLeaderboard() {
    return sampleLeaderboard
  }

  async getOrCreateProfile(walletAddress: WalletAddress): Promise<UserProfile> {
    const existing = await this.fetchProfile(walletAddress)
    if (existing) return existing
    const profile = this.createDefaultProfile(walletAddress)
    await this.saveProfile(profile)
    await this.seedMissions(walletAddress)
    return profile
  }

  private async fetchProfile(walletAddress: WalletAddress): Promise<UserProfile | undefined> {
    const resp = await this.client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: pkProfile(walletAddress), SK: skProfile },
      }),
    )
    return resp.Item?.profile as UserProfile | undefined
  }

  private async saveProfile(profile: UserProfile) {
    await this.client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: pkProfile(profile.walletAddress),
          SK: skProfile,
          profile,
        },
      }),
    )
  }

  updateProfile(profile: UserProfile) {
    return this.saveProfile(profile)
  }

  async spendCredits(walletAddress: WalletAddress, amount: number) {
    const profile = await this.getOrCreateProfile(walletAddress)
    if (profile.credits < amount) throw new Error('Insufficient credits')
    profile.credits -= amount
    await this.saveProfile(profile)
    return profile
  }

  async adjustCredits(walletAddress: WalletAddress, amount: number) {
    const profile = await this.getOrCreateProfile(walletAddress)
    profile.credits = Math.max(0, profile.credits + amount)
    await this.saveProfile(profile)
    return profile
  }

  async getMissions(walletAddress: WalletAddress): Promise<Mission[]> {
    const items = await this.client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :mission)',
        ExpressionAttributeValues: {
          ':pk': pkProfile(walletAddress),
          ':mission': 'MISSION#',
        },
      }),
    )
    if (!items.Items?.length) {
      await this.seedMissions(walletAddress)
      return this.getMissions(walletAddress)
    }
    return items.Items.map((item) => item.mission as Mission)
  }

  private async seedMissions(walletAddress: WalletAddress) {
    const writes = sampleMissions.map((mission) => ({
      PutRequest: {
        Item: {
          PK: pkProfile(walletAddress),
          SK: skMission(mission.id),
          mission,
        },
      },
    }))
    for (let i = 0; i < writes.length; i += 25) {
      const chunk = writes.slice(i, i + 25)
      await this.client.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName!]: chunk,
          },
        }),
      )
    }
  }

  async recordMissionProgress(walletAddress: WalletAddress, payload: { matchesPlayed?: number; xpEarned?: number }) {
    const missions = await this.getMissions(walletAddress)
    const { matchesPlayed = 0, xpEarned = 0 } = payload
    const updated = missions.map((mission): Mission => {
      if (mission.state === 'claimed') return mission
      let progress = mission.progress
      if (mission.objective === 'matches_played') {
        progress = Math.min(mission.target, progress + matchesPlayed)
      } else if (mission.objective === 'xp_earned') {
        progress = Math.min(mission.target, progress + xpEarned)
      }
      const state = progress >= mission.target ? 'completed' : mission.state
      return { ...mission, progress, state }
    })
    await this.persistMissions(walletAddress, updated)
    return updated
  }

  async claimMission(walletAddress: WalletAddress, missionId: string) {
    const missions = await this.getMissions(walletAddress)
    const updated = missions.map((mission): Mission =>
      mission.id === missionId && mission.state === 'completed' ? { ...mission, state: 'claimed' } : mission,
    )
    await this.persistMissions(walletAddress, updated)
    return updated.find((mission) => mission.id === missionId)
  }

  private async persistMissions(walletAddress: WalletAddress, missions: Mission[]) {
    for (const mission of missions) {
      await this.client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: pkProfile(walletAddress),
            SK: skMission(mission.id),
            mission,
          },
        }),
      )
    }
  }

  listMatches(): Match[] {
    throw new Error('listMatches not supported in DynamoStore')
  }

  async getMatch(matchId: string) {
    const resp = await this.client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: pkMatch(matchId), SK: skMatch },
      }),
    )
    return resp.Item?.match as Match | undefined
  }

  async saveMatch(match: Match) {
    await this.client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: pkMatch(match.id),
          SK: skMatch,
          match,
        },
      }),
    )
  }

  async createMatch(stake: number, playerA: UserProfile, playerB: UserProfile): Promise<Match> {
    const match: Match = {
      id: nanoid(),
      stake,
      pot: stake * 2,
      createdAt: Date.now(),
      state: 'active',
      playerA: {
        playerId: playerA.id,
        walletAddress: playerA.walletAddress,
        username: playerA.username,
        deckId: playerA.activeDeckId,
        cards: [],
        ready: true,
      },
      playerB: {
        playerId: playerB.id,
        walletAddress: playerB.walletAddress,
        username: playerB.username,
        deckId: playerB.activeDeckId,
        cards: [],
        ready: true,
      },
    }
    await this.saveMatch(match)
    return match
  }

  createBotProfile(): UserProfile {
    const walletAddress = `0xBOT${nanoid()}`
    const bot: UserProfile = {
      id: nanoid(),
      walletAddress,
      username: `CPU_${walletAddress.slice(-4)}`,
      avatarUrl: `https://avatar.vercel.sh/${walletAddress}`,
      elo: 1400 + Math.floor(Math.random() * 80),
      level: 10,
      xp: 0,
      xpToNextLevel: 200,
      credits: 0,
      activeDeckId: 'deck-creator',
      unlockedDeckIds: sampleDecks.map((deck) => deck.id),
      stats: {
        matches: 0,
        wins: 0,
        losses: 0,
        streak: 0,
      },
    }
    return bot
  }

  async enqueue(ticket: QueueTicket) {
    const walletKey = pkQueueWallet(ticket.walletAddress)
    await this.client.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName!]: [
            {
              PutRequest: {
                Item: {
                  PK: pkQueueStake(ticket.stake),
                  SK: skQueueTicket(ticket.enqueuedAt, ticket.id),
                  ticket,
                },
              },
            },
            {
              PutRequest: {
                Item: {
                  PK: walletKey,
                  SK: skQueueWallet(ticket.stake, ticket.id),
                  ticket,
                },
              },
            },
          ],
        },
      }),
    )
  }

  async dequeuePair(stake: number) {
    const resp = await this.client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pkQueueStake(stake) },
        Limit: 2,
        ScanIndexForward: true,
      }),
    )
    const tickets = (resp.Items ?? []).map((item) => item.ticket as QueueTicket)
    if (tickets.length < 2) return undefined
    await this.deleteQueueTickets(stake, tickets)
    await Promise.all(tickets.map((ticket) => this.consumeCreditHold(ticket.id)))
    return tickets
  }

  private async deleteQueueTickets(stake: number, tickets: QueueTicket[]) {
    const deletes = tickets.flatMap((ticket) => [
      {
        DeleteRequest: {
          Key: {
            PK: pkQueueStake(stake),
            SK: skQueueTicket(ticket.enqueuedAt, ticket.id),
          },
        },
      },
      {
        DeleteRequest: {
          Key: {
            PK: pkQueueWallet(ticket.walletAddress),
            SK: skQueueWallet(stake, ticket.id),
          },
        },
      },
    ])
    for (let i = 0; i < deletes.length; i += 25) {
      const chunk = deletes.slice(i, i + 25)
      await this.client.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName!]: chunk,
          },
        }),
      )
    }
  }

  async clearTicket(walletAddress: WalletAddress) {
    const resp = await this.client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pkQueueWallet(walletAddress) },
        Limit: 1,
      }),
    )
    const item = resp.Items?.[0]
    if (!item) return false
    const ticket = item.ticket as QueueTicket
    await this.deleteQueueTickets(ticket.stake, [ticket])
    await this.refundCreditHold(ticket.id)
    return true
  }

  async reserveCreditHold(ticketId: string, walletAddress: WalletAddress, amount: number) {
    await this.client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: pkCreditHold(ticketId),
          SK: skCreditHold,
          hold: {
            walletAddress,
            amount,
          },
        },
      }),
    )
  }

  async consumeCreditHold(ticketId: string) {
    await this.client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: pkCreditHold(ticketId),
          SK: skCreditHold,
        },
      }),
    )
  }

  async refundCreditHold(ticketId: string) {
    const resp = await this.client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: pkCreditHold(ticketId), SK: skCreditHold },
      }),
    )
    const hold = resp.Item?.hold as { walletAddress: WalletAddress; amount: number } | undefined
    if (!hold) return false
    await this.consumeCreditHold(ticketId)
    await this.adjustCredits(hold.walletAddress, hold.amount)
    return true
  }

  async recordPurchase(payload: Omit<DeckPurchase, 'id' | 'purchasedAt'>) {
    const purchase: DeckPurchase = {
      id: `purchase-${nanoid()}`,
      purchasedAt: Date.now(),
      ...payload,
    }
    await this.client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: pkPurchases,
          SK: skPurchase(purchase.purchasedAt, purchase.id),
          purchase,
        },
      }),
    )
    return purchase
  }

  async listPurchases() {
    const resp = await this.client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': pkPurchases },
        ScanIndexForward: false,
        Limit: 50,
      }),
    )
    return (resp.Items ?? []).map((item) => item.purchase as DeckPurchase)
  }

  async getAdminStats() {
    const submissions = await this.listCreatorDecks()
    const purchases = await this.listPurchases()
    const totalSales = purchases.reduce((sum, purchase) => sum + purchase.price, 0)
    const totalPlatformFees = purchases.reduce((sum, purchase) => sum + purchase.platformFee, 0)
    const totalCreatorShare = purchases.reduce((sum, purchase) => sum + purchase.creatorShare, 0)
    return {
      submissions: {
        pending: submissions.filter((submission) => submission.status === 'pending').length,
        approved: submissions.filter((submission) => submission.status === 'approved').length,
        rejected: submissions.filter((submission) => submission.status === 'rejected').length,
      },
      sales: {
        totalSales,
        totalPlatformFees,
        totalCreatorShare,
        count: purchases.length,
      },
    }
  }

  async reset() {
    // No-op for DynamoDB-backed store
  }

  private createDefaultProfile(walletAddress: WalletAddress): UserProfile {
    return {
      id: nanoid(),
      walletAddress,
      username: `Player_${walletAddress.slice(2, 6)}`,
      avatarUrl: `https://avatar.vercel.sh/${walletAddress}`,
      elo: 1500,
      level: 1,
      xp: 0,
      xpToNextLevel: 200,
      activeDeckId: sampleDecks[0]!.id,
      unlockedDeckIds: sampleDecks.map((deck) => deck.id),
      credits: 50,
      stats: {
        matches: 0,
        wins: 0,
        losses: 0,
        streak: 0,
      },
    }
  }
}
