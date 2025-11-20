import type {
  AdminStats,
  Card,
  CreatorDeckSubmission,
  DeckPurchase,
  DeckTheme,
  LeaderboardEntry,
  MatchState,
  Mission,
  PlayerSeat,
  UserProfile,
} from '../types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

const toJson = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

const request = async <T>(path: string, init?: RequestInit) => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })
  return toJson<T>(res)
}

const adminRequest = async <T>(path: string, adminKey: string, init?: RequestInit) => {
  return request<T>(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'x-admin-key': adminKey,
    },
  })
}

export type QueueResponse =
  | { status: 'queued'; ticketId: string }
  | { status: 'matched'; match: MatchPayload }

export type MatchPayload = {
  id: string
  stake: number
  pot: number
  state?: 'queued' | 'active' | 'finished' | 'cancelled'
  phase?: MatchState['phase']
  playerA: ApiPlayer
  playerB: ApiPlayer
  winner?: string
  resultSummary?: string
}

export type ApiPlayer = {
  playerId: string
  walletAddress: string
  username: string
  deckId: string
  ready: boolean
  cards: Card[]
}

export const Api = {
  initProfile: (walletAddress: string) =>
    request<{ profile: UserProfile }>('/auth/init', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),
  updateProfile: (payload: { walletAddress: string; username?: string; avatarUrl?: string }) =>
    request<{ profile: UserProfile }>('/profile/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  unlockDeck: (payload: { walletAddress: string; deckId: string }) =>
    request<{ profile: UserProfile }>('/decks/unlock', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  equipDeck: (payload: { walletAddress: string; deckId: string }) =>
    request<{ profile: UserProfile }>('/decks/equip', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  purchaseDeck: (payload: { walletAddress: string; deckId: string; txHash?: string }) =>
    request<{ profile: UserProfile; purchase: DeckPurchase }>('/decks/purchase', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  spendCredits: (payload: { walletAddress: string; amount: number }) =>
    request<{ profile: UserProfile }>('/credits/spend', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  refundCredits: (payload: { walletAddress: string; amount: number }) =>
    request<{ profile: UserProfile }>('/credits/refund', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  fetchDecks: () => request<{ decks: DeckTheme[] }>('/decks'),
  fetchCreatorDecks: () => request<{ submissions: CreatorDeckSubmission[] }>('/creator-decks'),
  submitCreatorDeck: (payload: {
    deckName: string
    creatorName: string
    rarity: DeckTheme['rarity']
    description: string
    previewImageUrl: string
  }) =>
    request<{ submission: CreatorDeckSubmission }>('/creator-decks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  fetchMissions: (walletAddress: string) =>
    request<{ missions: Mission[] }>(`/missions?walletAddress=${encodeURIComponent(walletAddress)}`),
  recordMissionProgress: (payload: { walletAddress: string; matchesPlayed?: number; xpEarned?: number }) =>
    request<{ missions: Mission[] }>('/missions/progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  claimMission: (payload: { walletAddress: string; missionId: string }) =>
    request<{ mission: Mission; missions: Mission[] }>(`/missions/${payload.missionId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress: payload.walletAddress }),
    }),
  fetchAdminSubmissions: (adminKey: string, status?: 'pending' | 'approved' | 'rejected') =>
    adminRequest<{ submissions: CreatorDeckSubmission[] }>(
      `/admin/submissions${status ? `?status=${status}` : ''}`,
      adminKey,
    ),
  updateSubmission: (
    adminKey: string,
    id: string,
    payload: { status?: 'pending' | 'approved' | 'rejected'; reviewNotes?: string; nsfwFlag?: boolean },
  ) =>
    adminRequest<{ submission: CreatorDeckSubmission }>(`/creator-decks/${id}`, adminKey, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  fetchAdminPurchases: (adminKey: string) => adminRequest<{ purchases: DeckPurchase[] }>('/admin/purchases', adminKey),
  fetchAdminStats: (adminKey: string) => adminRequest<AdminStats>('/admin/stats', adminKey),
  fetchLeaderboard: () => request<{ leaderboard: LeaderboardEntry[] }>('/leaderboard'),
  queueMatch: (payload: { walletAddress: string; stake: number; botOpponent?: boolean }) =>
    request<QueueResponse>('/match/queue', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelQueue: (walletAddress: string) =>
    request<{ cancelled: boolean }>('/match/cancel', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),
  getMatch: (id: string) => request<{ match: MatchPayload }>(`/match/${id}`),
}

export const mapMatchPayloadToState = (payload: MatchPayload): MatchState => ({
  id: payload.id,
  stake: payload.stake,
  pot: payload.pot,
  phase:
    payload.phase ??
    (payload.state === 'finished' || payload.resultSummary ? 'result' : 'active'),
  you: toSeat(payload.playerA, true),
  opponent: toSeat(payload.playerB, false),
  result: payload.resultSummary
    ? {
        winner: payload.winner === payload.playerA.walletAddress ? 'you' : 'opponent',
        summary: payload.resultSummary,
      }
    : undefined,
})

const toSeat = (player: ApiPlayer, isYou: boolean): PlayerSeat => ({
  id: player.playerId,
  username: player.username,
  avatarUrl: `https://avatar.vercel.sh/${player.walletAddress}`,
  deckId: player.deckId,
  cards: player.cards,
  ready: player.ready,
  isYou,
})
