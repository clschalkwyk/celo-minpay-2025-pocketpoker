import { useEffect, useMemo, useReducer, useRef } from 'react'
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
  const { match, acknowledgeResult, queueForMatch } = useMatch()
  const { setSelectedStake } = useUIStore()
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

  useEffect(() => {
    if (!match) {
      navigate('/lobby', { replace: true })
      return
    }
    if (id && match.id !== id) {
      navigate(`/match/${match.id}`, { replace: true })
    }
  }, [id, match, navigate])

  useEffect(() => {
    dispatch({ type: 'set_match', matchId })
  }, [matchId])

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

  if (!match) return null
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
        </div>
        <GameTable
          match={match}
          onRevealComplete={() => dispatch({ type: 'mark_reveal', matchId: match.id })}
        />
        {effectiveResult && !resultVisible && revealComplete && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs uppercase tracking-[0.4em] text-gray-200">
            Showing result in{' '}
            <span className="font-semibold text-white">{resultCountdown ?? resultDelaySeconds}s</span>
          </div>
        )}
        <SecondaryButton onClick={() => navigate('/lobby')} className="px-5">
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
            acknowledgeResult(overlayMatch.result?.winner)
            navigate('/lobby')
          }}
        />
      )}
    </div>
  )
}
