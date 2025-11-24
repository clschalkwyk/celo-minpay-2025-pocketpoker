import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MatchState } from '../types'
import { useUIStore } from '../state/UIStoreProvider'
import { useMiniPayContext } from './MiniPayProvider'
import { addDebugLog } from '../lib/debugLog'
import { useProfileContext } from './ProfileProvider'
import { useMissionContext } from './MissionProvider'
import { Api, mapMatchPayloadToState, type QueueResponse } from '../lib/api'
import { convertZarToCelo, formatCelo } from '../lib/currency'

export type MatchQueueStatus = 'idle' | 'funding' | 'searching' | 'waiting' | 'timeout' | 'error'
export type MatchConnectionStatus = 'idle' | 'polling'

type MatchContextValue = {
  match?: MatchState
  queueForMatch: (stake: number) => Promise<MatchState | undefined>
  retryLastQueueAsDemo: () => Promise<MatchState | undefined>
  resyncMatch: () => Promise<MatchState | undefined>
  loadMatchById: (id: string, wallet?: string) => Promise<MatchState | undefined>
  cancelMatch: () => void
  acknowledgeResult: (winnerOverride?: 'you' | 'opponent') => void
  queueStatus: MatchQueueStatus
  connectionStatus: MatchConnectionStatus
  lastQueuedStake?: number
  lastQueuedMode?: boolean
}

const MatchContext = createContext<MatchContextValue | undefined>(undefined)

export const MatchProvider = ({ children }: { children: ReactNode }) => {
  const [match, setMatch] = useState<MatchState>()
  const [queueing, setQueueing] = useState(false)
  const [queueStatus, setQueueStatus] = useState<MatchQueueStatus>('idle')
  const [connectionStatus, setConnectionStatus] = useState<MatchConnectionStatus>('idle')
  const { openMatchmaking, closeMatchmaking, pushToast, realMoneyMode } = useUIStore()
  const { address, sendStake, isMiniPay, celoBalance, refreshBalance } = useMiniPayContext()
  const { applyMatchResult, refreshProfile, profile } = useProfileContext()
  const { recordMatchProgress } = useMissionContext()
  const queueTicketRef = useRef<string | undefined>(undefined)
  const queueTimeoutRef = useRef<number | undefined>(undefined)
  const enableBotMatches = (import.meta.env.VITE_ENABLE_BOT_MATCHES ?? 'true') === 'true'
  const matchTimeoutMs = Number(import.meta.env.VITE_MATCH_TIMEOUT_MS ?? 15000)
  const matchPollIntervalMs = Number(import.meta.env.VITE_MATCH_POLL_INTERVAL_MS ?? 1500)
  const pollFailureLimit = 3
  const pollIntervalRef = useRef<number | undefined>(undefined)
  const pollFailureRef = useRef(0)
  const queuePollIntervalRef = useRef<number | undefined>(undefined)
  const lastQueuedStakeRef = useRef<number | undefined>(undefined)
  const lastQueuedWalletRef = useRef<string | undefined>(undefined)
  const lastQueuedModeRef = useRef<boolean>(false)
  const [lastQueuedStake, setLastQueuedStake] = useState<number | undefined>(undefined)
  const deckPreviewMapRef = useRef<Record<string, string>>({})
  const readyPingRef = useRef<string | undefined>(undefined)

  const { allowBotMatches } = useUIStore()

  const loadDeckPreviews = useCallback(async () => {
    if (Object.keys(deckPreviewMapRef.current).length > 0) return deckPreviewMapRef.current
    try {
      const res = await Api.fetchDecks()
      const map: Record<string, string> = {}
      for (const deck of res.decks ?? []) {
        const preview = deck.previewImageUrl ?? deck.previewImage
        if (deck.id && preview) {
          map[deck.id] = preview
        }
      }
      deckPreviewMapRef.current = map
      addDebugLog(`deck.preview.map.loaded count=${Object.keys(map).length} ids=${Object.keys(map).join(',')}`)
    } catch (err) {
      console.error('Failed to load deck previews', err)
      addDebugLog(`deck.preview.map.error ${(err as Error)?.message ?? 'unknown'}`)
    }
    return deckPreviewMapRef.current
  }, [])

  const hydrateMissingPreviews = useCallback(
    async (deckIds: string[]) => {
      const missing = deckIds.filter((id) => !deckPreviewMapRef.current[id])
      if (missing.length === 0) return
      try {
        const res = await Api.fetchCreatorDecks()
        let patched = 0
        for (const submission of res.submissions ?? []) {
          const preview = submission.previewImageUrl
          if (submission.id && preview && missing.includes(submission.id)) {
            deckPreviewMapRef.current[submission.id] = preview
            patched += 1
          }
        }
        if (patched > 0) {
          addDebugLog(`deck.preview.map.creator.patched ${patched} ids=${missing.join(',')}`)
        } else {
          addDebugLog(`deck.preview.map.creator.none ids=${missing.join(',')}`)
        }
      } catch (err) {
        console.error('Failed to fetch creator decks for previews', err)
        addDebugLog(`deck.preview.map.creator.error ${(err as Error)?.message ?? 'unknown'}`)
      }
    },
    [],
  )

  const withDeckPreviews = useCallback(
    async (incoming: MatchState | undefined) => {
      if (!incoming) return incoming
      const needsPreview =
        !incoming.you.deckPreviewUrl || !incoming.opponent.deckPreviewUrl || Object.keys(deckPreviewMapRef.current).length === 0
      if (needsPreview) {
        await loadDeckPreviews()
      }
      const map = deckPreviewMapRef.current
      await hydrateMissingPreviews([incoming.you.deckId, incoming.opponent.deckId])
      const resolvePreview = (seat: MatchState['you']) => {
        if (!seat) return seat
        const mapPreview = map[seat.deckId]
        const preview =
          mapPreview ??
          seat.deckPreviewUrl ??
          (seat.deckId.includes('creator') ? '/deck_5.jpg' : undefined)
        if (!preview) {
          addDebugLog(`deck.preview.missing deckId=${seat.deckId}`)
          return seat
        }
        return seat.deckPreviewUrl === preview ? seat : { ...seat, deckPreviewUrl: preview }
      }
      addDebugLog(
        `deck.preview.apply you=${incoming.you.deckId}:${incoming.you.deckPreviewUrl ?? 'none'} -> ${
          resolvePreview(incoming.you).deckPreviewUrl ?? 'none'
        } opp=${incoming.opponent.deckId}:${incoming.opponent.deckPreviewUrl ?? 'none'} -> ${
          resolvePreview(incoming.opponent).deckPreviewUrl ?? 'none'
        }`,
      )
      return {
        ...incoming,
        you: resolvePreview(incoming.you),
        opponent: resolvePreview(incoming.opponent),
      }
    },
    [loadDeckPreviews],
  )

  const clearQueueTimeout = useCallback(() => {
    if (queueTimeoutRef.current) {
      window.clearTimeout(queueTimeoutRef.current)
      queueTimeoutRef.current = undefined
    }
  }, [])

  const stopQueuePolling = useCallback(() => {
    if (queuePollIntervalRef.current) {
      window.clearInterval(queuePollIntervalRef.current)
      queuePollIntervalRef.current = undefined
    }
  }, [])

  const startQueueTimeout = useCallback(() => {
    clearQueueTimeout()
    queueTimeoutRef.current = window.setTimeout(() => {
      const expiredTicket = queueTicketRef.current
      queueTicketRef.current = undefined
      setQueueStatus('timeout')
      setQueueing(false)
      stopQueuePolling()
      const refunded = lastQueuedStakeRef.current
      pushToast(
        refunded ? `No opponent found. R${refunded.toFixed(2)} refunded.` : 'No opponent found. Your credits were refunded.',
        'info',
      )
      closeMatchmaking()
      const walletAddress = address ?? profile?.walletAddress
      if (walletAddress) {
        void Api.cancelQueue(walletAddress, expiredTicket)
          .then(() => refreshProfile())
          .catch((err) => console.error('Failed to cancel queue', err))
      }
      setQueueStatus('idle')
    }, matchTimeoutMs)
  }, [address, clearQueueTimeout, matchTimeoutMs, pushToast, refreshProfile, closeMatchmaking, profile?.walletAddress, stopQueuePolling])

  const resetQueueState = useCallback(() => {
    queueTicketRef.current = undefined
    clearQueueTimeout()
    setQueueStatus('idle')
    setQueueing(false)
    stopQueuePolling()
  }, [clearQueueTimeout, stopQueuePolling])

  const stopMatchPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = undefined
    }
    pollFailureRef.current = 0
    setConnectionStatus('idle')
  }, [])

  const startMatchPolling = useCallback(
    (matchId: string) => {
      stopMatchPolling()
      stopQueuePolling()
      const fetchState = async () => {
        try {
          const response = await Api.getMatch(matchId)
          pollFailureRef.current = 0
          const mapped = await withDeckPreviews(mapMatchPayloadToState(response.match, address ?? profile?.walletAddress))
          setMatch(mapped)
          if (response.match.state === 'finished' || response.match.resultSummary) {
            stopMatchPolling()
          }
        } catch (err) {
          pollFailureRef.current += 1
          console.error('Failed to poll match state', err)
          if (pollFailureRef.current >= pollFailureLimit) {
            stopMatchPolling()
            pushToast('Connection lost. Return to the lobby to re-queue.', 'error')
          } else {
            pushToast('Re-syncing match…', 'info')
          }
        }
      }
      void fetchState()
      pollIntervalRef.current = window.setInterval(fetchState, matchPollIntervalMs)
      setConnectionStatus('polling')
    },
    [matchPollIntervalMs, pollFailureLimit, pushToast, stopMatchPolling, stopQueuePolling, withDeckPreviews],
  )

  const queueForMatch = useCallback(
    async (stake: number) => {
      const walletAddress = realMoneyMode ? address : address ?? profile?.walletAddress
      // For local/browser testing without MiniPay, allow realMoneyMode to fall back to demo if no MiniPay address.
      if (realMoneyMode && !address) {
        pushToast('MiniPay not connected, queuing with demo credits instead.', 'info')
      }
      if (!walletAddress) {
        pushToast('Sign in to queue for a match.', 'error')
        return undefined
      }
      if (queueing) return match
      if (!realMoneyMode && profile) {
        const availableCredits = profile.credits
        if (availableCredits < stake) {
          pushToast('Sorry, no funds to pay with.', 'error')
          return match
        }
      }
      setQueueing(true)
      setQueueStatus('funding')
      openMatchmaking(stake)
      lastQueuedStakeRef.current = stake
      lastQueuedWalletRef.current = walletAddress
      lastQueuedModeRef.current = realMoneyMode
      setLastQueuedStake(stake)
      try {
        let response: QueueResponse | undefined
        const useEscrow = realMoneyMode && isMiniPay
        if (useEscrow) {
          const requiredCelo = convertZarToCelo(stake)
          if (celoBalance < requiredCelo) {
            pushToast(
              `Sorry, no funds to pay with. Need ~${formatCelo(requiredCelo)} CELO`,
              'error',
            )
            resetQueueState()
            closeMatchmaking()
            setQueueStatus('idle')
            setQueueing(false)
            return undefined
          }
          pushToast('Locking stake on-chain…', 'info')
          const result = await sendStake(stake)
          pushToast('Stake locked in escrow', 'success')
          addDebugLog(`Queue escrow stake=${stake} tx=${result.txHash ?? 'no-tx'}`)
          response = await Api.queueEscrowMatch({
            walletAddress: walletAddress,
            stake,
            botOpponent: enableBotMatches,
            txHash: result.txHash,
          })
        } else {
          response = await Api.queueDemoMatch({
            walletAddress: walletAddress,
            stake,
            botOpponent: allowBotMatches,
          })
        }
        if (!response) {
          return undefined
        }
        void refreshProfile()
        if (response.status === 'matched') {
          const mapped = await withDeckPreviews(mapMatchPayloadToState(response.match, address ?? profile?.walletAddress))
          setMatch(mapped)
          resetQueueState()
          closeMatchmaking()
          startMatchPolling(mapped!.id)
          pushToast('Match found! Shuffling cards...', 'success')
          return mapped
        }
        queueTicketRef.current = response.ticketId
        setQueueStatus('waiting')
        startQueueTimeout()
        pushToast('Waiting for opponent...', 'info')
        const startQueuePoll = async () => {
          const wallet = lastQueuedWalletRef.current ?? address ?? profile?.walletAddress
          const ticketId = queueTicketRef.current
          if (!wallet && !ticketId) return
          const fetchQueuedMatch = async () => {
            try {
              const res = ticketId
                ? await Api.findMatchForTicket(ticketId)
                : await Api.findMatchForWallet(wallet ?? '')
              const mapped = await withDeckPreviews(
                mapMatchPayloadToState(res.match, wallet ?? res.match.playerA.walletAddress),
              )
              setMatch(mapped)
              readyPingRef.current = mapped?.id
              resetQueueState()
              closeMatchmaking()
              startMatchPolling(mapped!.id)
              pushToast('Match found! Shuffling cards...', 'success')
            } catch (err) {
              // 404 means still waiting; ignore
            }
          }
          void fetchQueuedMatch()
          queuePollIntervalRef.current = window.setInterval(fetchQueuedMatch, matchPollIntervalMs)
        }
        void startQueuePoll()
        return undefined
      } catch (err) {
        console.error(err)
        pushToast((err as Error).message || 'Failed to queue match', 'error')
        resetQueueState()
        closeMatchmaking()
        setQueueStatus('error')
        setConnectionStatus('idle')
        return undefined
      } finally {
        if (!queueTicketRef.current) {
          setQueueing(false)
        }
      }
    },
    [
      queueing,
      match,
      openMatchmaking,
      pushToast,
      closeMatchmaking,
      address,
      allowBotMatches,
      resetQueueState,
      startMatchPolling,
      startQueueTimeout,
      refreshProfile,
      realMoneyMode,
      isMiniPay,
      sendStake,
      profile,
      celoBalance,
      withDeckPreviews,
    ],
  )

  const retryLastQueueAsDemo = useCallback(async () => {
    const stake = lastQueuedStakeRef.current
    const walletAddress = lastQueuedWalletRef.current ?? address ?? profile?.walletAddress
    if (!stake || !walletAddress) {
      pushToast('Nothing to retry yet.', 'error')
      return undefined
    }
    if (queueing) return match
    setQueueing(true)
    setQueueStatus('funding')
    openMatchmaking(stake)
    lastQueuedModeRef.current = false
    try {
      const response = await Api.queueDemoMatch({
        walletAddress,
        stake,
        botOpponent: allowBotMatches,
      })
      void refreshProfile()
        if (response.status === 'matched') {
          const mapped = await withDeckPreviews(mapMatchPayloadToState(response.match, address ?? profile?.walletAddress))
          setMatch(mapped)
          readyPingRef.current = mapped?.id
          resetQueueState()
          closeMatchmaking()
          startMatchPolling(mapped!.id)
          pushToast('Match found! Shuffling cards...', 'success')
          return mapped
        }
        queueTicketRef.current = response.ticketId
        setQueueStatus('waiting')
        startQueueTimeout()
        pushToast('Waiting for opponent...', 'info')
        const startQueuePoll = async () => {
        const wallet = lastQueuedWalletRef.current ?? address ?? profile?.walletAddress
        if (!wallet) return
        const fetchQueuedMatch = async () => {
          try {
            const res = await Api.findMatchForWallet(wallet)
            const mapped = await withDeckPreviews(mapMatchPayloadToState(res.match, wallet))
            setMatch(mapped)
            resetQueueState()
            closeMatchmaking()
            startMatchPolling(mapped!.id)
            pushToast('Match found! Shuffling cards...', 'success')
          } catch (err) {
            // ignore until match exists
          }
        }
        void fetchQueuedMatch()
        queuePollIntervalRef.current = window.setInterval(fetchQueuedMatch, matchPollIntervalMs)
      }
      void startQueuePoll()
      return undefined
    } catch (err) {
      console.error(err)
      pushToast((err as Error).message || 'Failed to queue match', 'error')
      resetQueueState()
      closeMatchmaking()
      setQueueStatus('error')
      setConnectionStatus('idle')
      return undefined
    } finally {
      if (!queueTicketRef.current) {
        setQueueing(false)
      }
    }
  }, [
    address,
    closeMatchmaking,
    allowBotMatches,
    match,
    openMatchmaking,
    profile?.walletAddress,
    pushToast,
    queueing,
    refreshProfile,
    resetQueueState,
    startMatchPolling,
    startQueueTimeout,
    withDeckPreviews,
  ])

  const cancelMatch = useCallback(() => {
    const walletAddress = address ?? profile?.walletAddress
    if (!match && walletAddress) {
      void Api.cancelQueue(walletAddress, queueTicketRef.current)
        .then(() => refreshProfile())
        .catch((err) => console.error('Failed to cancel queue', err))
    }
    resetQueueState()
    stopMatchPolling()
    stopQueuePolling()
    setMatch(undefined)
    closeMatchmaking()
  }, [address, closeMatchmaking, match, resetQueueState, refreshProfile, stopMatchPolling, stopQueuePolling, profile?.walletAddress])

  const acknowledgeResult = useCallback(
    (winnerOverride?: 'you' | 'opponent') => {
      const winner = winnerOverride ?? match?.result?.winner
      if (winner) {
        const xpEarned = applyMatchResult(winner, match?.stake)
        recordMatchProgress({ xpEarned, matchesPlayed: 1 })
        void refreshProfile()
      }
      stopMatchPolling()
      stopQueuePolling()
      resetQueueState()
      setConnectionStatus('idle')
      setMatch(undefined)
      if (realMoneyMode) {
        void refreshBalance()
      }
    },
    [match, applyMatchResult, refreshProfile, resetQueueState, recordMatchProgress, stopMatchPolling, stopQueuePolling, realMoneyMode, refreshBalance],
  )

  const resyncMatch = useCallback(async () => {
    if (!match?.id) {
      pushToast('No active match to re-sync.', 'error')
      return undefined
    }
    try {
      const response = await Api.getMatch(match.id)
      const mapped = await withDeckPreviews(mapMatchPayloadToState(response.match, address ?? profile?.walletAddress))
      setMatch(mapped)
      startMatchPolling(mapped!.id)
      setConnectionStatus('polling')
      pushToast('Re-synced match state.', 'success')
      return mapped
    } catch (err) {
      console.error(err)
      pushToast('Failed to re-sync match.', 'error')
      return undefined
    }
  }, [match?.id, pushToast, startMatchPolling, withDeckPreviews])

  const loadMatchById = useCallback(
    async (id: string, wallet?: string) => {
      try {
        const response = await Api.getMatch(id)
        const mapped = await withDeckPreviews(mapMatchPayloadToState(response.match, wallet ?? address ?? profile?.walletAddress))
        setMatch(mapped)
        startMatchPolling(mapped!.id)
        setConnectionStatus('polling')
        return mapped
      } catch (err) {
        console.error('Failed to load match by id', err)
        pushToast('Match not found or expired. Please queue again.', 'error')
        return undefined
      }
    },
    [address, profile?.walletAddress, pushToast, startMatchPolling, withDeckPreviews],
  )

  useEffect(
    () => () => {
      stopMatchPolling()
      clearQueueTimeout()
    },
    [clearQueueTimeout, stopMatchPolling],
  )

  useEffect(() => {
    const wallet = address ?? profile?.walletAddress
    if (!wallet || !match?.id) return
    if (match.you.ready) return
    if (readyPingRef.current === match.id) return
    readyPingRef.current = match.id
    void Api.readyPing(match.id, wallet)
      .then((res) => {
        setMatch((prev) => {
          if (!prev || prev.id !== match.id) return prev
          return mapMatchPayloadToState(res.match, wallet)
        })
      })
      .catch((err) => console.error('ready ping failed', err))
  }, [address, match?.id, match?.you.ready, profile?.walletAddress])

  const value = useMemo(
    () => ({
      match,
      queueForMatch,
      retryLastQueueAsDemo,
      resyncMatch,
      loadMatchById,
      cancelMatch,
      acknowledgeResult,
      queueStatus,
      connectionStatus,
      lastQueuedStake,
      lastQueuedMode: lastQueuedModeRef.current,
    }),
    [
      match,
      queueForMatch,
      retryLastQueueAsDemo,
      resyncMatch,
      cancelMatch,
      acknowledgeResult,
      queueStatus,
      connectionStatus,
      lastQueuedStake,
      loadMatchById,
    ],
  )

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMatchContext = () => {
  const ctx = useContext(MatchContext)
  if (!ctx) throw new Error('useMatchContext must be used within MatchProvider')
  return ctx
}
