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

const resolveBackendUrl = () => {
  const fromEnv = import.meta.env.VITE_BACKEND_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:4000'
}

const BACKEND_URL = resolveBackendUrl()

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
  deckPreviewUrl?: string
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
  resetProfile: (walletAddress: string) =>
    request<{ profile: UserProfile }>('/profile/reset', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
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
    creatorWallet: string
    rarity: DeckTheme['rarity']
    description: string
    previewImageUrl?: string
    imageData?: string
    fileName?: string
    contentType?: string
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
    adminRequest<{ submission: CreatorDeckSubmission }>(`/creator-decks/${id}/status`, adminKey, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  fetchAdminPurchases: (adminKey: string) => adminRequest<{ purchases: DeckPurchase[] }>('/admin/purchases', adminKey),
  fetchAdminStats: (adminKey: string) => adminRequest<AdminStats>('/admin/stats', adminKey),
  fetchLeaderboard: () => request<{ leaderboard: LeaderboardEntry[] }>('/leaderboard'),
  queueDemoMatch: (payload: { walletAddress: string; stake: number; botOpponent?: boolean }) =>
    request<QueueResponse>('/match/queue-demo', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  queueEscrowMatch: (payload: { walletAddress: string; stake: number; botOpponent?: boolean; txHash: string }) =>
    request<QueueResponse>('/match/queue-escrow', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelQueue: (walletAddress: string, ticketId?: string) =>
    request<{ cancelled: boolean }>('/match/cancel', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, ticketId }),
    }),
  queueStatus: () => request<{ status: { stake: number; count: number }[] }>('/match/queue-status'),
  getMatch: (id: string) => request<{ match: MatchPayload }>(`/match/${id}`),
  findMatchForWallet: (walletAddress: string) =>
    request<{ match: MatchPayload }>(`/match/by-wallet/${encodeURIComponent(walletAddress)}`),
  findMatchForTicket: (ticketId: string) =>
    request<{ match: MatchPayload }>(`/match/by-ticket/${encodeURIComponent(ticketId)}`),
  readyPing: (matchId: string, walletAddress: string) =>
    request<{ match: MatchPayload }>(`/match/${matchId}/ready`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),
}

export const mapMatchPayloadToState = (
  payload: MatchPayload,
  viewer?: { wallet?: string; username?: string },
): MatchState => {
  const viewerLower = viewer?.wallet?.trim().toLowerCase()
  const viewerNameLower = viewer?.username?.trim().toLowerCase()
  const seats: ApiPlayer[] = [payload.playerA, payload.playerB].filter(Boolean) as ApiPlayer[]
  const youPayload =
    seats.find((player) => player.walletAddress.toLowerCase() === viewerLower) ??
    seats.find((player) => player.username.toLowerCase() === viewerNameLower) ??
    payload.playerA
  const opponentPayload =
    seats.find((player) => player.playerId !== youPayload.playerId) ?? payload.playerB ?? payload.playerA
  const bothReady = Boolean(youPayload.ready && opponentPayload.ready)
  const duplicateWallets =
    youPayload.walletAddress.toLowerCase() === opponentPayload.walletAddress.toLowerCase()
  const forceLocalResult = duplicateWallets || !viewerLower

  const you = toSeat(youPayload, true)
  const opponent = toSeat(opponentPayload, false)
  const hasWinner = Boolean(payload.winner)
  const phase: MatchState['phase'] =
    hasWinner || payload.state === 'finished'
      ? 'result'
      : payload.phase
        ? payload.phase
        : bothReady
          ? 'active'
          : 'ready'

  const winnerLower = payload.winner?.toLowerCase()
  const winnerPerspective: 'you' | 'opponent' | undefined =
    hasWinner && winnerLower
      ? duplicateWallets
        ? undefined // if wallets are identical, ignore backend winner tag and let UI derive locally
        : winnerLower === youPayload.walletAddress.toLowerCase() || winnerLower === youPayload.username.toLowerCase()
          ? 'you'
          : winnerLower === opponentPayload.walletAddress.toLowerCase() || winnerLower === opponentPayload.username.toLowerCase()
            ? 'opponent'
            : undefined
      : undefined
  const summaryFallback =
    winnerPerspective === 'you' ? 'You cleaned them out.' : 'Tough beat. Shuffle again.'
  const summary =
    winnerPerspective && hasWinner
      ? summaryFallback
      : payload.resultSummary ?? summaryFallback

  return {
    id: payload.id,
    stake: payload.stake,
    pot: payload.pot,
    phase,
    you,
    opponent,
    result:
      winnerPerspective && hasWinner && !forceLocalResult
        ? {
            winner: winnerPerspective,
            summary,
          }
        : undefined,
  }
}

const toSeat = (player: ApiPlayer, isYou: boolean): PlayerSeat => ({
  id: player.playerId,
  username: player.username,
  avatarUrl: `https://avatar.vercel.sh/${player.walletAddress}`,
  walletAddress: player.walletAddress,
  deckId: player.deckId,
  deckPreviewUrl: player.deckPreviewUrl,
  cards: player.cards,
  ready: player.ready,
  isYou,
})
