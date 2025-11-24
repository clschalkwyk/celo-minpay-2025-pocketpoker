export type WalletAddress = string

export type UserProfile = {
  id: string
  walletAddress: WalletAddress
  username: string
  avatarUrl: string
  elo: number
  level: number
  xp: number
  xpToNextLevel: number
  activeDeckId: string
  unlockedDeckIds: string[]
  credits: number
  stats: {
    matches: number
    wins: number
    losses: number
    streak: number
  }
}

export type DeckStatus = 'live' | 'pending' | 'live_soon'

export type SettlementState = 'pending' | 'paid'

export type DeckTheme = {
  id: string
  name: string
  rarity: 'common' | 'rare' | 'ranked' | 'legendary' | 'mythic'
  description: string
  previewImageUrl: string
  unlockCondition: string
  price?: number
  creatorName?: string
  creatorWallet?: WalletAddress
  status?: DeckStatus
}

export type CreatorDeckSubmission = {
  id: string
  deckName: string
  creatorName: string
  rarity: DeckTheme['rarity']
  description: string
  previewImageUrl: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: number
  reviewNotes?: string
  nsfwFlag?: boolean
  creatorWallet?: WalletAddress
  reviewedAt?: number
  reviewedBy?: string
  price?: number // Added price field
}

export type DeckPurchase = {
  id: string
  deckId: string
  deckName: string
  creatorName?: string
  creatorWallet?: WalletAddress
  buyer: WalletAddress
  price: number
  platformFee: number
  creatorShare: number
  settlementState?: SettlementState
  payoutTxHash?: string
  payoutSettledAt?: number
  txHash?: string
  purchasedAt: number
}

export type Mission = {
  id: string
  title: string
  description: string
  type: 'daily' | 'seasonal'
  target: number
  progress: number
  rewardXp: number
  rewardDescription?: string
  state: 'active' | 'completed' | 'claimed'
  objective?: 'matches_played' | 'xp_earned'
}

export type LeaderboardEntry = {
  id: string
  walletAddress: WalletAddress
  username: string
  avatarUrl?: string
  elo: number
  wins: number
  rank: number
}

export type Card = {
  rank: string
  suit: string
  code: string
}

export type PlayerSeat = {
  playerId: string
  walletAddress: WalletAddress
  username: string
  deckId: string
  deckPreviewUrl?: string
  cards: Card[]
  ready: boolean
}

export type MatchState = 'queued' | 'active' | 'finished' | 'cancelled'

export type Match = {
  id: string
  stake: number
  pot: number
  createdAt: number
  state: MatchState
  playerA: PlayerSeat
  playerB?: PlayerSeat
  winner?: WalletAddress
  resultSummary?: string
}

export type QueueTicket = {
  id: string
  walletAddress: WalletAddress
  stake: number
  enqueuedAt: number
}

export type QueueOptions = {
  botOpponent?: boolean
}
