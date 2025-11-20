import { customAlphabet } from 'nanoid'
import fs from 'node:fs'
import path from 'node:path'
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
import { DEMO_DECK_PRICE, sampleDecks, seededCreatorDecks } from './deckData.js'

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)
const resolveDataDir = () => {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR
  }
  const isLambdaEnv = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.LAMBDA_TASK_ROOT)
  if (isLambdaEnv) {
    return path.join('/tmp', 'pocketpoker-data')
  }
  const nestedPath = path.join(process.cwd(), 'backend', 'data')
  if (fs.existsSync(nestedPath)) {
    return nestedPath
  }
  return path.join(process.cwd(), 'data')
}

const dataDir = resolveDataDir()
const persistFile = path.join(dataDir, 'persist.json')

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
    progress: 120,
    rewardXp: 500,
    rewardDescription: 'Legendary card shimmer',
    state: 'active',
    objective: 'xp_earned',
  },
]

const sampleLeaderboard: LeaderboardEntry[] = [
  { id: 'p1', walletAddress: '0xMint', username: 'MintMonarch', elo: 1820, wins: 402, rank: 1 },
  { id: 'p2', walletAddress: '0xEdge', username: 'EdgeOfRiver', elo: 1788, wins: 376, rank: 2 },
  { id: 'p3', walletAddress: '0xTact', username: 'DeckTactician', elo: 1742, wins: 341, rank: 3 },
  { id: 'p4', walletAddress: '0xPulse', username: 'PulseRunner', elo: 1690, wins: 298, rank: 4 },
  { id: 'p5', walletAddress: '0xVibe', username: 'VibeDealer', elo: 1655, wins: 260, rank: 5 },
  { id: 'p6', walletAddress: '0xNova', username: 'NovaRift', elo: 1622, wins: 240, rank: 6 },
]

const defaultAvatar = (seed: string) => `https://avatar.vercel.sh/${seed}`

type PersistedState = {
  creatorDecks: CreatorDeckSubmission[]
  purchases: DeckPurchase[]
}

export class MemoryStore {
  private profiles = new Map<WalletAddress, UserProfile>()
  private matches = new Map<string, Match>()
  private queues = new Map<number, QueueTicket[]>()
  private missions = new Map<WalletAddress, Mission[]>()
  private creatorDecks = new Map<string, CreatorDeckSubmission>()
  private creditHolds = new Map<string, { walletAddress: WalletAddress; amount: number }>()
  private purchases: DeckPurchase[] = []

  constructor() {
    this.loadPersistedState()
  }

  private loadPersistedState() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      if (!fs.existsSync(persistFile)) {
        const state: PersistedState = { creatorDecks: seededCreatorDecks, purchases: [] }
        fs.writeFileSync(persistFile, JSON.stringify(state, null, 2))
      }
      const raw = fs.readFileSync(persistFile, 'utf-8')
      const parsed = JSON.parse(raw) as PersistedState
      const rawDecks = parsed.creatorDecks?.length ? parsed.creatorDecks : seededCreatorDecks
      this.creatorDecks = new Map<string, CreatorDeckSubmission>(rawDecks.map((deck) => [deck.id, { ...deck }]))
      this.purchases = parsed.purchases ?? []
    } catch (err) {
      console.error('Failed to load persisted state', err)
      this.creatorDecks.clear()
      seededCreatorDecks.forEach((deck) => this.creatorDecks.set(deck.id, { ...deck }))
      this.purchases = []
    }
  }

  private persistState() {
    const state: PersistedState = {
      creatorDecks: Array.from(this.creatorDecks.values()),
      purchases: this.purchases,
    }
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(persistFile, JSON.stringify(state, null, 2))
    } catch (err) {
      console.error('Failed to persist state', err)
    }
  }

  getDecks() {
    const creatorDeckThemes: DeckTheme[] = this.listCreatorDecks()
      .filter((submission) => submission.status === 'approved' && !submission.nsfwFlag)
      .map((submission) => ({
        id: submission.id,
        name: submission.deckName,
        rarity: submission.rarity,
        description: submission.description,
        previewImageUrl: submission.previewImageUrl,
        unlockCondition: 'Creator submission',
        creatorName: submission.creatorName,
        status: 'live_soon',
        price: DEMO_DECK_PRICE,
      }))
    return [...sampleDecks, ...creatorDeckThemes]
  }

  private cloneMissions() {
    return sampleMissions.map((mission) => ({ ...mission }))
  }

  getMissions(walletAddress: WalletAddress) {
    const existing = this.missions.get(walletAddress)
    if (existing) return existing
    const initial = this.cloneMissions()
    this.missions.set(walletAddress, initial)
    return initial
  }

  recordMissionProgress(walletAddress: WalletAddress, payload: { matchesPlayed?: number; xpEarned?: number }) {
    const missions = this.getMissions(walletAddress)
    const { matchesPlayed = 0, xpEarned = 0 } = payload
    const updated = missions.map((mission): Mission => {
      if (mission.state === ('claimed' as Mission['state'])) return mission
      let progress = mission.progress
      if (mission.objective === 'matches_played') {
        progress = Math.min(mission.target, progress + matchesPlayed)
      } else if (mission.objective === 'xp_earned') {
        progress = Math.min(mission.target, progress + xpEarned)
      }
      const state: Mission['state'] = progress >= mission.target ? 'completed' : mission.state
      return { ...mission, progress, state }
    })
    this.missions.set(walletAddress, updated)
    return updated
  }

  claimMission(walletAddress: WalletAddress, missionId: string) {
    const missions = this.getMissions(walletAddress)
    const updated = missions.map((mission): Mission =>
      mission.id === missionId && mission.state === 'completed' ? { ...mission, state: 'claimed' } : mission,
    )
    this.missions.set(walletAddress, updated)
    return updated.find((mission) => mission.id === missionId)
  }

  listCreatorDecks() {
    return Array.from(this.creatorDecks.values()).sort((a, b) => b.submittedAt - a.submittedAt)
  }

  submitCreatorDeck(payload: {
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
    this.creatorDecks.set(submission.id, submission)
    this.persistState()
    return submission
  }

  updateCreatorDeckStatus(id: string, status: CreatorDeckSubmission['status'], reviewNotes?: string) {
    const existing = this.creatorDecks.get(id)
    if (!existing) return undefined
    const submission = { ...existing, status, reviewNotes }
    this.creatorDecks.set(id, submission)
    this.persistState()
    return submission
  }

  updateCreatorDeck(id: string, updates: Partial<CreatorDeckSubmission>) {
    const existing = this.creatorDecks.get(id)
    if (!existing) return undefined
    const submission = { ...existing, ...updates }
    this.creatorDecks.set(id, submission)
    this.persistState()
    return submission
  }

  getLeaderboard() {
    return sampleLeaderboard
  }

  getOrCreateProfile(walletAddress: WalletAddress): UserProfile {
    const existing = this.profiles.get(walletAddress)
    if (existing) return existing
    const profile: UserProfile = {
      id: nanoid(),
      walletAddress,
      username: `Player_${walletAddress.slice(2, 6)}`,
      avatarUrl: defaultAvatar(walletAddress),
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
    this.profiles.set(walletAddress, profile)
    return profile
  }

  updateProfile(profile: UserProfile) {
    this.profiles.set(profile.walletAddress, profile)
  }

  spendCredits(walletAddress: WalletAddress, amount: number) {
    if (amount <= 0) return this.getOrCreateProfile(walletAddress)
    const profile = this.getOrCreateProfile(walletAddress)
    if (profile.credits < amount) {
      throw new Error('Insufficient credits')
    }
    profile.credits -= amount
    this.updateProfile(profile)
    return profile
  }

  adjustCredits(walletAddress: WalletAddress, amount: number) {
    if (amount === 0) return this.getOrCreateProfile(walletAddress)
    const profile = this.getOrCreateProfile(walletAddress)
    profile.credits = Math.max(0, profile.credits + amount)
    this.updateProfile(profile)
    return profile
  }

  listMatches() {
    return Array.from(this.matches.values())
  }

  getMatch(matchId: string) {
    return this.matches.get(matchId)
  }

  saveMatch(match: Match) {
    this.matches.set(match.id, match)
  }

  updateMatchState(matchId: string, updates: Partial<Match>) {
    const current = this.matches.get(matchId)
    if (!current) return undefined
    const next = { ...current, ...updates }
    this.matches.set(matchId, next)
    return next
  }

  enqueue(ticket: QueueTicket) {
    const queue = this.queues.get(ticket.stake) ?? []
    queue.push(ticket)
    this.queues.set(ticket.stake, queue)
  }

  dequeuePair(stake: number) {
    const queue = this.queues.get(stake)
    if (!queue || queue.length < 2) return undefined
    const pair = queue.splice(0, 2)
    for (const ticket of pair) {
      this.consumeCreditHold(ticket.id)
    }
    return pair
  }

  clearTicket(walletAddress: WalletAddress) {
    for (const [stake, queue] of this.queues.entries()) {
      const idx = queue.findIndex((ticket) => ticket.walletAddress === walletAddress)
      if (idx >= 0) {
        const [ticket] = queue.splice(idx, 1)
        this.queues.set(stake, queue)
        if (ticket) {
          this.refundCreditHold(ticket.id)
        }
        return true
      }
    }
    return false
  }

  reserveCreditHold(ticketId: string, walletAddress: WalletAddress, amount: number) {
    this.creditHolds.set(ticketId, { walletAddress, amount })
  }

  consumeCreditHold(ticketId: string) {
    this.creditHolds.delete(ticketId)
  }

  refundCreditHold(ticketId: string) {
    const hold = this.creditHolds.get(ticketId)
    if (!hold) return false
    this.creditHolds.delete(ticketId)
    this.adjustCredits(hold.walletAddress, hold.amount)
    return true
  }

  recordPurchase(payload: Omit<DeckPurchase, 'id' | 'purchasedAt'>) {
    const purchase: DeckPurchase = {
      id: `purchase-${nanoid()}`,
      purchasedAt: Date.now(),
      ...payload,
    }
    this.purchases.unshift(purchase)
    this.persistState()
    return purchase
  }

  listPurchases() {
    return [...this.purchases]
  }

  getAdminStats() {
    const submissions = this.listCreatorDecks()
    const purchases = this.purchases
    const totalSales = purchases.reduce((sum, purchase) => sum + purchase.price, 0)
    const totalPlatformFees = purchases.reduce((sum, purchase) => sum + purchase.platformFee, 0)
    const totalCreatorShare = purchases.reduce((sum, purchase) => sum + purchase.creatorShare, 0)
    return {
      submissions: {
        pending: submissions.filter((s) => s.status === 'pending').length,
        approved: submissions.filter((s) => s.status === 'approved').length,
        rejected: submissions.filter((s) => s.status === 'rejected').length,
      },
      sales: {
        totalSales,
        totalPlatformFees,
        totalCreatorShare,
        count: purchases.length,
      },
    }
  }

  reset() {
    this.profiles.clear()
    this.matches.clear()
    this.queues.clear()
    this.missions.clear()
    this.creatorDecks.clear()
    seededCreatorDecks.forEach((deck) => {
      this.creatorDecks.set(deck.id, { ...deck })
    })
    this.purchases = []
    this.persistState()
  }

  createMatch(stake: number, playerA: UserProfile, playerB: UserProfile): Match {
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
    this.matches.set(match.id, match)
    return match
  }

  createBotProfile(): UserProfile {
    const walletAddress = `0xBOT${nanoid()}`
    const bot: UserProfile = {
      id: nanoid(),
      walletAddress,
      username: `CPU_${walletAddress.slice(-4)}`,
      avatarUrl: defaultAvatar(walletAddress),
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
    this.profiles.set(walletAddress, bot)
    return bot
  }
}
