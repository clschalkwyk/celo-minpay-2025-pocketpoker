import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameTable } from '../components/match/GameTable'
import { ResultOverlay } from '../components/match/ResultOverlay'
import { useMatch } from '../hooks/useMatch'
import { SecondaryButton } from '../components/ui/SecondaryButton'
import { useUIStore } from '../hooks/useUIStore'
import { deriveLocalResult } from '../lib/handEvaluator'
const resultDelayMs = Number(import.meta.env.VITE_RESULT_OVERLAY_DELAY_MS ?? 6000)
const resultDelaySeconds = Math.round(resultDelayMs / 1000)

type ResultState = {
  currentMatchId?: string
  revealCompletedMatchId?: string
  resultVisible: boolean
  resultCountdown: number | null
}

type ResultAction =
  | { type: 'mark_reveal'; matchId: string }
  | { type: 'set_match'; matchId?: string }
  | { type: 'reset_result' }
  | { type: 'start_countdown'; seconds: number }
  | { type: 'tick' }
  | { type: 'show_result' }

const reduceResultState = (state: ResultState, action: ResultAction): ResultState => {
  switch (action.type) {
    case 'set_match':
      if (state.currentMatchId === action.matchId) return state
      return {
        currentMatchId: action.matchId,
        revealCompletedMatchId: undefined,
        resultVisible: false,
        resultCountdown: null,
      }
    case 'mark_reveal':
      if (state.revealCompletedMatchId === action.matchId) return state
      return { ...state, revealCompletedMatchId: action.matchId }
    case 'reset_result':
      if (!state.resultVisible && state.resultCountdown === null) return state
      return { ...state, resultVisible: false, resultCountdown: null }
    case 'start_countdown':
      return { ...state, resultVisible: false, resultCountdown: action.seconds }
    case 'tick':
      if (state.resultCountdown === null) return state
      if (state.resultCountdown <= 0) return { ...state, resultCountdown: 0 }
      return { ...state, resultCountdown: state.resultCountdown - 1 }
    case 'show_result':
      if (state.resultVisible) return state
      return { ...state, resultVisible: true }
    default:
      return state
  }
}

export const MatchScreen = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { match, acknowledgeResult, queueForMatch, connectionStatus, resyncMatch, loadMatchById } = useMatch()
  const { setSelectedStake } = useUIStore()
  const [suppressAutoLoad, setSuppressAutoLoad] = useState(false)
  const [resultState, dispatch] = useReducer(reduceResultState, {
    currentMatchId: match?.id,
    revealCompletedMatchId: undefined,
    resultVisible: false,
    resultCountdown: null,
  })
  const resultTimeoutRef = useRef<number | undefined>(undefined)
  const countdownRef = useRef<number | undefined>(undefined)
  const matchId = match?.id
  const revealComplete = Boolean(matchId && resultState.revealCompletedMatchId === matchId)
  const { resultVisible, resultCountdown } = resultState
  const derivedResult = useMemo(() => {
    if (!match) return undefined
    return deriveLocalResult(match.you.cards, match.opponent.cards)
  }, [match])
  const allReady = Boolean(match?.you.ready && match?.opponent.ready)
  const fallbackSummary = (winner: 'you' | 'opponent') =>
    winner === 'you' ? 'You cleaned them out.' : 'Tough beat. Shuffle again.'
  const derivedWinner = revealComplete ? derivedResult?.winner : undefined
  const winnerForCountdown = match?.result?.winner ?? derivedWinner
  const summaryForWinner =
    match?.result?.summary ??
    (winnerForCountdown && derivedResult?.winner === winnerForCountdown ? derivedResult.summary : undefined)
  const effectiveResult = winnerForCountdown
    ? {
        winner: winnerForCountdown,
        summary: summaryForWinner ?? fallbackSummary(winnerForCountdown),
      }
    : undefined
  const exitToLobby = useCallback(
    (winnerOverride?: 'you' | 'opponent') => {
      setSuppressAutoLoad(true)
      acknowledgeResult(winnerOverride)
      navigate('/lobby', { replace: true })
    },
    [acknowledgeResult, navigate],
  )

  useEffect(() => {
    if (suppressAutoLoad) return
    if (!match && id) {
      void loadMatchById(id)
      return
    }
    if (!match && !id) {
      navigate('/lobby', { replace: true })
      return
    }
    if (id && match && match.id !== id) {
      navigate(`/match/${match.id}`, { replace: true })
    }
  }, [id, match, navigate, loadMatchById, suppressAutoLoad])

  useEffect(() => {
    dispatch({ type: 'set_match', matchId })
  }, [matchId])

  const autoResyncRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (autoResyncRef.current) {
      window.clearInterval(autoResyncRef.current)
      autoResyncRef.current = undefined
    }
    if (!match) return
    const readyOrActive = allReady || match.phase === 'active' || match.result
    if (readyOrActive) return
    autoResyncRef.current = window.setInterval(() => {
      void resyncMatch()
    }, 3000)
    return () => {
      if (autoResyncRef.current) {
        window.clearInterval(autoResyncRef.current)
        autoResyncRef.current = undefined
      }
    }
  }, [match, allReady, resyncMatch])

  useEffect(() => {
    if (!winnerForCountdown || !revealComplete) {
      dispatch({ type: 'reset_result' })
      window.clearTimeout(resultTimeoutRef.current)
      window.clearInterval(countdownRef.current)
      return
    }
    dispatch({ type: 'start_countdown', seconds: resultDelaySeconds })
    window.clearTimeout(resultTimeoutRef.current)
    window.clearInterval(countdownRef.current)
    resultTimeoutRef.current = window.setTimeout(() => dispatch({ type: 'show_result' }), resultDelayMs)
    countdownRef.current = window.setInterval(() => {
      dispatch({ type: 'tick' })
    }, 1000)
    return () => {
      window.clearTimeout(resultTimeoutRef.current)
      window.clearInterval(countdownRef.current)
    }
  }, [winnerForCountdown, revealComplete])

  if (!match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pp-bg px-4 text-white">
        <div className="animate-pulse rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center shadow-lg">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Loading match</p>
          <p className="mt-2 text-lg font-semibold text-white">Syncing your table…</p>
          <p className="mt-1 text-sm text-gray-400">If this takes more than a few seconds, return to the lobby and re-queue.</p>
          <div className="mt-3 space-x-2">
            <SecondaryButton onClick={() => navigate('/lobby')}>Back to Lobby</SecondaryButton>
            {id && (
              <SecondaryButton onClick={() => void loadMatchById(id)} className="bg-white/10">
                Retry sync
              </SecondaryButton>
            )}
          </div>
        </div>
      </div>
    )
  }
  const overlayMatch = match.result
    ? match
    : effectiveResult
      ? { ...match, result: effectiveResult }
      : undefined

  return (
    <div className="relative min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/70 p-5 text-center shadow-[0_20px_45px_rgba(5,8,22,0.7)]">
          <p className="text-xs uppercase tracking-[0.6em] text-gray-400">Match</p>
          <h1 className="mt-1 bg-gradient-to-r from-pp-primary to-pp-secondary bg-clip-text text-2xl font-black text-transparent">
            #{match.id.slice(-4).toUpperCase()}
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.4em] text-gray-400">{`Stake R${match.stake.toFixed(2)} · Pot R${(match.stake * 2).toFixed(2)}`}</p>
          {connectionStatus === 'idle' && (
            <SecondaryButton onClick={() => void resyncMatch()} className="mt-3 px-4 py-2 text-xs">
              Re-sync match state
            </SecondaryButton>
          )}
        </div>
        {!allReady && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b132a] to-[#0a1b2f] p-5 text-center shadow-[0_20px_45px_rgba(5,8,22,0.6)]">
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Ready Check</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Syncing players…</h2>
            <p className="mt-2 text-sm text-gray-300">
              We&rsquo;ll start as soon as both tables are ready. Hang tight.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-left text-sm">
              {[
                { label: 'You', ready: match.you.ready, name: match.you.username },
                { label: 'Opponent', ready: match.opponent.ready, name: match.opponent.username },
              ].map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner"
                >
                  <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500">{entry.label}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-white">{entry.name}</span>
                    <span
                      className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                        entry.ready ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {entry.ready ? 'Ready' : 'Syncing'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-gray-500">
              Auto-starting together once locked.
            </p>
          </div>
        )}
        {allReady && (
          <GameTable
            match={match}
            onRevealComplete={() => dispatch({ type: 'mark_reveal', matchId: match.id })}
          />
        )}
        {effectiveResult && !resultVisible && revealComplete && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs uppercase tracking-[0.4em] text-gray-200">
            Showing result in{' '}
            <span className="font-semibold text-white">{resultCountdown ?? resultDelaySeconds}s</span>
          </div>
        )}
        <SecondaryButton
          onClick={() => {
            exitToLobby(match?.result?.winner)
          }}
          className="px-5"
        >
          Back to Lobby
        </SecondaryButton>
      </div>
      {overlayMatch && resultVisible && (
        <ResultOverlay
          match={overlayMatch}
          onPlayAgain={() => {
            if (!match) {
              navigate('/lobby')
              return
            }
            const stake = match.stake
            acknowledgeResult(overlayMatch.result?.winner)
            setSelectedStake(stake)
            void queueForMatch(stake).then((nextMatch) => {
              if (nextMatch) {
                navigate(`/match/${nextMatch.id}`)
              } else {
                navigate('/lobby')
              }
            })
          }}
          onBack={() => {
            exitToLobby(overlayMatch.result?.winner)
          }}
        />
      )}
    </div>
  )
}
