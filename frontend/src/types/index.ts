export type StakeTier = {
  id: string
  label: string
  amount: number
}

export type UserProfile = {
  id: string
  walletAddress: string
  username: string
  avatarUrl: string
  rankTitle: string
  level: number
  xp: number
  xpToNextLevel: number
  elo: number
  credits: number
  stats: {
    matches: number
    wins: number
    losses: number
    streak: number
  }
  activeDeckId: string
  unlockedDeckIds: string[]
}

export type DeckTheme = {
  id: string
  name: string
  rarity: 'common' | 'rare' | 'ranked' | 'legendary' | 'mythic'
  description: string
  previewImage?: string
  previewImageUrl?: string
  unlockCondition: string
  price?: number
  creatorName?: string
  creatorWallet?: string
  status?: 'live' | 'pending' | 'live_soon'
}

export type CreatorDeckSubmission = {
  id: string
  deckName: string
  creatorName: string
  creatorWallet?: string
  rarity: DeckTheme['rarity']
  description: string
  previewImageUrl: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: number
  reviewNotes?: string
  nsfwFlag?: boolean
  reviewedAt?: number
  reviewedBy?: string
  price?: number // Added price field
}

export type DeckPurchase = {
  id: string
  deckId: string
  deckName: string
  creatorName?: string
  creatorWallet?: string
  buyer: string
  price: number
  platformFee: number
  creatorShare: number
  settlementState?: 'pending' | 'paid'
  payoutTxHash?: string
  payoutSettledAt?: number
  txHash?: string
  purchasedAt: number
}

export type AdminStats = {
  submissions: {
    pending: number
    approved: number
    rejected: number
  }
  sales: {
    totalSales: number
    totalPlatformFees: number
    totalCreatorShare: number
    count: number
  }
}

export type Mission = {
  id: string
  title: string
  description: string
  type: 'daily' | 'seasonal'
  progress: number
  target: number
  rewardXp: number
  rewardDescription?: string
  state: 'active' | 'completed' | 'claimed'
  objective?: 'matches_played' | 'xp_earned'
}

export type LeaderboardEntry = {
  id: string
  rank: number
  username: string
  avatarUrl?: string
  walletAddress?: string
  elo: number
  wins: number
}

export type Card = {
  rank: string
  suit: string
  code: string
}

export type PlayerSeat = {
  id: string
  username: string
  avatarUrl: string
  deckId: string
  deckPreviewUrl?: string
  cards: Card[]
  ready: boolean
  isYou: boolean
}

export type MatchPhase = 'idle' | 'queueing' | 'ready' | 'active' | 'result'

export type MatchState = {
  id: string
  stake: number
  pot: number
  phase: MatchPhase
  you: PlayerSeat
  opponent: PlayerSeat
  result?: {
    winner: 'you' | 'opponent'
    summary: string
  }
}

export type MiniPayStatus = 'idle' | 'checking' | 'ready' | 'error'
