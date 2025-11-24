import { MemoryStore } from './memoryStore.js'
import { DynamoStore } from './dynamoStore.js'
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

type AdminStatsSummary = {
  submissions: { pending: number; approved: number; rejected: number }
  sales: { totalSales: number; totalPlatformFees: number; totalCreatorShare: number; count: number }
}

export interface DataStore {
  getDecks(): DeckTheme[]
  listCreatorDecks(): Promise<CreatorDeckSubmission[]>
  submitCreatorDeck(payload: {
    deckName: string
    creatorName: string
    creatorWallet?: WalletAddress
    rarity: DeckTheme['rarity']
    description: string
    previewImageUrl: string
    price?: number // Added price field
  }): Promise<CreatorDeckSubmission>
  updateCreatorDeck(id: string, updates: Partial<CreatorDeckSubmission>): Promise<CreatorDeckSubmission | undefined>
  updateCreatorDeckStatus(id: string, status: CreatorDeckSubmission['status'], reviewNotes?: string): Promise<CreatorDeckSubmission | undefined>
  getLeaderboard(): Promise<LeaderboardEntry[]>
  getOrCreateProfile(walletAddress: WalletAddress): Promise<UserProfile>
  updateProfile(profile: UserProfile): Promise<void>
  resetProfile(walletAddress: WalletAddress): Promise<UserProfile>
  spendCredits(walletAddress: WalletAddress, amount: number): Promise<UserProfile>
  adjustCredits(walletAddress: WalletAddress, amount: number): Promise<UserProfile>
  getMissions(walletAddress: WalletAddress): Promise<Mission[]>
  recordMissionProgress(walletAddress: WalletAddress, payload: { matchesPlayed?: number; xpEarned?: number }): Promise<Mission[]>
  claimMission(walletAddress: WalletAddress, missionId: string): Promise<Mission | undefined>
  getAdminStats(): Promise<AdminStatsSummary>
  recordPurchase(payload: Omit<DeckPurchase, 'id' | 'purchasedAt'>): Promise<DeckPurchase>
  listPurchases(): Promise<DeckPurchase[]>
  createBotProfile(): UserProfile
  enqueue(ticket: QueueTicket): Promise<void>
  dequeuePair(stake: number): Promise<QueueTicket[] | undefined>
  clearTicket(walletAddress: WalletAddress): Promise<boolean>
  getQueueStatus(): Promise<{ stake: number; count: number }[]>
  reserveCreditHold(ticketId: string, walletAddress: WalletAddress, amount: number): Promise<void>
  refundCreditHold(ticketId: string): Promise<boolean>
  getMatch(matchId: string): Promise<Match | undefined>
  findMatchForWallet(walletAddress: WalletAddress): Promise<Match | undefined>
  markPlayerReady(matchId: string, walletAddress: WalletAddress): Promise<Match | undefined>
  mapTicketsToMatch(ticketIds: string[], matchId: string): Promise<void>
  findMatchForTicket(ticketId: string): Promise<Match | undefined>
  clearTicketMatch(ticketId: string): Promise<void>
  saveMatch(match: Match): Promise<void>
  createMatch(stake: number, playerA: UserProfile, playerB: UserProfile): Promise<Match>
  reset(): Promise<void>
}

class MemoryStoreAdapter implements DataStore {
  constructor(private readonly backing = new MemoryStore()) {}

  getDecks() {
    return this.backing.getDecks()
  }

  async listCreatorDecks() {
    return this.backing.listCreatorDecks()
  }

  submitCreatorDeck(payload: {
    deckName: string
    creatorName: string
    creatorWallet?: WalletAddress
    rarity: DeckTheme['rarity']
    description: string
    previewImageUrl: string
    price?: number
  }) {
    return Promise.resolve(this.backing.submitCreatorDeck(payload))
  }

  updateCreatorDeck(id: string, updates: Partial<CreatorDeckSubmission>) {
    return Promise.resolve(this.backing.updateCreatorDeck(id, updates))
  }

  updateCreatorDeckStatus(id: string, status: CreatorDeckSubmission['status'], reviewNotes?: string) {
    return Promise.resolve(this.backing.updateCreatorDeckStatus(id, status, reviewNotes))
  }

  getLeaderboard() {
    return Promise.resolve(this.backing.getLeaderboard())
  }

  getOrCreateProfile(walletAddress: WalletAddress) {
    return Promise.resolve(this.backing.getOrCreateProfile(walletAddress))
  }

  async updateProfile(profile: UserProfile) {
    this.backing.updateProfile(profile)
  }

  resetProfile(walletAddress: WalletAddress) {
    return Promise.resolve(this.backing.resetProfile(walletAddress))
  }

  spendCredits(walletAddress: WalletAddress, amount: number) {
    return Promise.resolve(this.backing.spendCredits(walletAddress, amount))
  }

  adjustCredits(walletAddress: WalletAddress, amount: number) {
    return Promise.resolve(this.backing.adjustCredits(walletAddress, amount))
  }

  getMissions(walletAddress: WalletAddress) {
    return Promise.resolve(this.backing.getMissions(walletAddress))
  }

  recordMissionProgress(walletAddress: WalletAddress, payload: { matchesPlayed?: number; xpEarned?: number }) {
    return Promise.resolve(this.backing.recordMissionProgress(walletAddress, payload))
  }

  claimMission(walletAddress: WalletAddress, missionId: string) {
    return Promise.resolve(this.backing.claimMission(walletAddress, missionId))
  }

  async getAdminStats() {
    return this.backing.getAdminStats()
  }

  recordPurchase(payload: Omit<DeckPurchase, 'id' | 'purchasedAt'>) {
    return Promise.resolve(this.backing.recordPurchase(payload))
  }

  listPurchases() {
    return Promise.resolve(this.backing.listPurchases())
  }

  createBotProfile() {
    return this.backing.createBotProfile()
  }

  async enqueue(ticket: QueueTicket) {
    this.backing.enqueue(ticket)
  }

  dequeuePair(stake: number) {
    return Promise.resolve(this.backing.dequeuePair(stake))
  }

  clearTicket(walletAddress: WalletAddress) {
    return Promise.resolve(this.backing.clearTicket(walletAddress))
  }

  getQueueStatus() {
    return Promise.resolve(this.backing.getQueueStatus())
  }

  async reserveCreditHold(ticketId: string, walletAddress: WalletAddress, amount: number) {
    this.backing.reserveCreditHold(ticketId, walletAddress, amount)
  }

  refundCreditHold(ticketId: string) {
    return Promise.resolve(this.backing.refundCreditHold(ticketId))
  }

  getMatch(matchId: string) {
    return Promise.resolve(this.backing.getMatch(matchId))
  }

  findMatchForWallet(walletAddress: WalletAddress) {
    return Promise.resolve(this.backing.findMatchForWallet(walletAddress))
  }

  markPlayerReady(matchId: string, walletAddress: WalletAddress) {
    return Promise.resolve(this.backing.markPlayerReady(matchId, walletAddress))
  }

  mapTicketsToMatch(ticketIds: string[], matchId: string) {
    return Promise.resolve(this.backing.mapTicketsToMatch(ticketIds, matchId))
  }

  findMatchForTicket(ticketId: string) {
    return Promise.resolve(this.backing.findMatchForTicket(ticketId))
  }

  clearTicketMatch(ticketId: string) {
    return Promise.resolve(this.backing.clearTicketMatch(ticketId))
  }

  async saveMatch(match: Match) {
    this.backing.saveMatch(match)
  }

  createMatch(stake: number, playerA: UserProfile, playerB: UserProfile) {
    return Promise.resolve(this.backing.createMatch(stake, playerA, playerB))
  }

  async reset() {
    this.backing.reset()
  }
}

const shouldUseDynamo =
  process.env.NODE_ENV !== 'test' && process.env.USE_DYNAMO_STORE === 'true' && Boolean(process.env.DYNAMO_TABLE_NAME)

const store: DataStore = shouldUseDynamo ? new DynamoStore() : new MemoryStoreAdapter()

export { store }
