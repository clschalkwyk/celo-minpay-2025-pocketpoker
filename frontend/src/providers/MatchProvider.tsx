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
import { useProfileContext } from './ProfileProvider'
import { useMissionContext } from './MissionProvider'
import { Api, mapMatchPayloadToState } from '../lib/api'

export type MatchQueueStatus = 'idle' | 'funding' | 'searching' | 'waiting' | 'timeout' | 'error'
export type MatchConnectionStatus = 'idle' | 'polling'

type MatchContextValue = {
  match?: MatchState
  queueForMatch: (stake: number) => Promise<MatchState | undefined>
  cancelMatch: () => void
  acknowledgeResult: () => void
  queueStatus: MatchQueueStatus
  connectionStatus: MatchConnectionStatus
}

const MatchContext = createContext<MatchContextValue | undefined>(undefined)

export const MatchProvider = ({ children }: { children: ReactNode }) => {
  const [match, setMatch] = useState<MatchState>()
  const [queueing, setQueueing] = useState(false)
  const [queueStatus, setQueueStatus] = useState<MatchQueueStatus>('idle')
  const [connectionStatus, setConnectionStatus] = useState<MatchConnectionStatus>('idle')
  const { openMatchmaking, closeMatchmaking, pushToast } = useUIStore()
  const { address } = useMiniPayContext()
  const { applyMatchResult, refreshProfile } = useProfileContext()
  const { recordMatchProgress } = useMissionContext()
  const queueTicketRef = useRef<string | undefined>(undefined)
  const queueTimeoutRef = useRef<number | undefined>(undefined)
  const enableBotMatches = (import.meta.env.VITE_ENABLE_BOT_MATCHES ?? 'true') === 'true'
  const matchTimeoutMs = Number(import.meta.env.VITE_MATCH_TIMEOUT_MS ?? 15000)
  const matchPollIntervalMs = Number(import.meta.env.VITE_MATCH_POLL_INTERVAL_MS ?? 4000)
  const pollFailureLimit = 3
  const pollIntervalRef = useRef<number | undefined>(undefined)
  const pollFailureRef = useRef(0)

  const clearQueueTimeout = useCallback(() => {
    if (queueTimeoutRef.current) {
      window.clearTimeout(queueTimeoutRef.current)
      queueTimeoutRef.current = undefined
    }
  }, [])

  const startQueueTimeout = useCallback(() => {
    clearQueueTimeout()
    queueTimeoutRef.current = window.setTimeout(() => {
      queueTicketRef.current = undefined
      setQueueStatus('timeout')
      setQueueing(false)
      pushToast('No opponent found. Your credits were refunded.', 'info')
      if (address) {
        void Api.cancelQueue(address)
          .then(() => refreshProfile())
          .catch((err) => console.error('Failed to cancel queue', err))
      }
    }, matchTimeoutMs)
  }, [address, clearQueueTimeout, matchTimeoutMs, pushToast, refreshProfile])

  const resetQueueState = useCallback(() => {
    queueTicketRef.current = undefined
    clearQueueTimeout()
    setQueueStatus('idle')
    setQueueing(false)
  }, [clearQueueTimeout])

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
      const fetchState = async () => {
        try {
          const response = await Api.getMatch(matchId)
          pollFailureRef.current = 0
          setMatch(mapMatchPayloadToState(response.match))
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
    [matchPollIntervalMs, pollFailureLimit, pushToast, stopMatchPolling],
  )

  const queueForMatch = useCallback(
    async (stake: number) => {
      if (!address) {
        pushToast('Connect MiniPay before queuing', 'error')
        return undefined
      }
      if (queueing) return match
      setQueueing(true)
      setQueueStatus('funding')
      openMatchmaking(stake)
      try {
        const response = await Api.queueMatch({ walletAddress: address, stake, botOpponent: enableBotMatches })
        void refreshProfile()
        if (response.status === 'matched') {
          const mapped = mapMatchPayloadToState(response.match)
          setMatch(mapped)
          resetQueueState()
          closeMatchmaking()
          startMatchPolling(mapped.id)
          pushToast('Match found! Shuffling cards...', 'success')
          return mapped
        }
        queueTicketRef.current = response.ticketId
        setQueueStatus('waiting')
        startQueueTimeout()
        pushToast('Waiting for opponent...', 'info')
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
      enableBotMatches,
      resetQueueState,
      startMatchPolling,
      startQueueTimeout,
      refreshProfile,
    ],
  )

  const cancelMatch = useCallback(() => {
    if (!match && address) {
      void Api.cancelQueue(address)
        .then(() => refreshProfile())
        .catch((err) => console.error('Failed to cancel queue', err))
    }
    resetQueueState()
    stopMatchPolling()
    setMatch(undefined)
    closeMatchmaking()
  }, [address, closeMatchmaking, match, resetQueueState, refreshProfile, stopMatchPolling])

  const acknowledgeResult = useCallback(() => {
    if (match?.result) {
      const xpEarned = applyMatchResult(match.result.winner)
      recordMatchProgress({ xpEarned, matchesPlayed: 1 })
      void refreshProfile()
    }
    stopMatchPolling()
    resetQueueState()
    setConnectionStatus('idle')
    setMatch(undefined)
  }, [match, applyMatchResult, refreshProfile, resetQueueState, recordMatchProgress, stopMatchPolling])

  useEffect(
    () => () => {
      stopMatchPolling()
      clearQueueTimeout()
    },
    [clearQueueTimeout, stopMatchPolling],
  )

  const value = useMemo(
    () => ({ match, queueForMatch, cancelMatch, acknowledgeResult, queueStatus, connectionStatus }),
    [match, queueForMatch, cancelMatch, acknowledgeResult, queueStatus, connectionStatus],
  )

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMatchContext = () => {
  const ctx = useContext(MatchContext)
  if (!ctx) throw new Error('useMatchContext must be used within MatchProvider')
  return ctx
}
