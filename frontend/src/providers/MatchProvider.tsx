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
export type MatchConnectionStatus = 'idle' | 'connected' | 'reconnecting' | 'lost'

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
  const socketRef = useRef<WebSocket>()
  const closingSocketRef = useRef(false)
  const matchRef = useRef<MatchState | undefined>(undefined)
  const queueTicketRef = useRef<string | undefined>(undefined)
  const queueTimeoutRef = useRef<number>()
  const enableBotMatches = (import.meta.env.VITE_ENABLE_BOT_MATCHES ?? 'true') === 'true'
  const matchTimeoutMs = Number(import.meta.env.VITE_MATCH_TIMEOUT_MS ?? 15000)
  const maxSocketRetries = 3
  const reconnectDelayMs = Number(import.meta.env.VITE_WS_RECONNECT_DELAY_MS ?? 1200)
  const socketRetryRef = useRef(0)
  const reconnectTimeoutRef = useRef<number>()
  const connectSocketRef = useRef<(matchId: string) => void>()

  useEffect(() => {
    matchRef.current = match
  }, [match])

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
  }, [])

  const cleanupSocket = useCallback(
    (options?: { resetRetries?: boolean }) => {
      clearReconnectTimeout()
      if (socketRef.current) {
        closingSocketRef.current = true
        socketRef.current.close()
        socketRef.current = undefined
        closingSocketRef.current = false
      }
      if (options?.resetRetries ?? true) {
        socketRetryRef.current = 0
      }
    },
    [clearReconnectTimeout],
  )

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

  const handleSocketDrop = useCallback(
    (matchId?: string) => {
      const activeMatch = matchRef.current
      if (!activeMatch || activeMatch.phase === 'result') return
      const targetMatchId = matchId ?? activeMatch.id
      if (socketRetryRef.current >= maxSocketRetries) {
        pushToast('Unable to reconnect to the match. Please return to the lobby.', 'error')
        cleanupSocket()
        setConnectionStatus('lost')
        return
      }
      const attempt = socketRetryRef.current + 1
      socketRetryRef.current = attempt
      pushToast(`Connection lost. Reconnecting... (${attempt}/${maxSocketRetries})`, 'info')
      setConnectionStatus('reconnecting')
      clearReconnectTimeout()
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = undefined
        connectSocketRef.current?.(targetMatchId)
      }, reconnectDelayMs)
    },
    [cleanupSocket, clearReconnectTimeout, pushToast, reconnectDelayMs, maxSocketRetries],
  )

  const attachSocket = useCallback(
    (matchId: string) => {
      cleanupSocket({ resetRetries: false })
      const socket = Api.openMatchSocket(matchId, (payload) => {
        if (!payload?.payload) return
        setMatch(mapMatchPayloadToState(payload.payload))
      })
      socket.onopen = () => {
        socketRetryRef.current = 0
        setConnectionStatus('connected')
      }
      socket.onerror = (event) => {
        if (!closingSocketRef.current) {
          console.error('Match socket error', event)
        }
      }
      socket.onclose = (event) => {
        if (closingSocketRef.current || event.wasClean) return
        handleSocketDrop(matchId)
      }
      socketRef.current = socket
    },
    [cleanupSocket, handleSocketDrop],
  )

  useEffect(() => {
    connectSocketRef.current = attachSocket
  }, [attachSocket])

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
          attachSocket(mapped.id)
          pushToast('Match found! Shuffling cards...', 'success')
          setConnectionStatus('connected')
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
      attachSocket,
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
    cleanupSocket()
    setConnectionStatus('idle')
    setMatch(undefined)
    closeMatchmaking()
  }, [address, cleanupSocket, closeMatchmaking, match, resetQueueState, refreshProfile])

  const acknowledgeResult = useCallback(() => {
    if (match?.result) {
      const xpEarned = applyMatchResult(match.result.winner)
      recordMatchProgress({ xpEarned, matchesPlayed: 1 })
      void refreshProfile()
    }
    cleanupSocket()
    resetQueueState()
    setConnectionStatus('idle')
    setMatch(undefined)
  }, [match, applyMatchResult, refreshProfile, cleanupSocket, resetQueueState, recordMatchProgress])

  useEffect(
    () => () => {
      cleanupSocket()
      clearQueueTimeout()
    },
    [cleanupSocket, clearQueueTimeout],
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
