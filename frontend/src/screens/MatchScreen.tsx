import { useEffect, useReducer, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameTable } from '../components/match/GameTable'
import { ResultOverlay } from '../components/match/ResultOverlay'
import { useMatch } from '../hooks/useMatch'
import { SecondaryButton } from '../components/ui/SecondaryButton'
import { useUIStore } from '../hooks/useUIStore'
const resultDelayMs = Number(import.meta.env.VITE_RESULT_OVERLAY_DELAY_MS ?? 6000)
const resultDelaySeconds = Math.round(resultDelayMs / 1000)

type ResultState = {
  revealCompletedMatchId?: string
  resultVisible: boolean
  resultCountdown: number | null
}

type ResultAction =
  | { type: 'mark_reveal'; matchId: string }
  | { type: 'reset_result' }
  | { type: 'start_countdown'; seconds: number }
  | { type: 'tick' }
  | { type: 'show_result' }

const reduceResultState = (state: ResultState, action: ResultAction): ResultState => {
  switch (action.type) {
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
    revealCompletedMatchId: undefined,
    resultVisible: false,
    resultCountdown: null,
  })
  const resultTimeoutRef = useRef<number | undefined>(undefined)
  const countdownRef = useRef<number | undefined>(undefined)
  const matchId = match?.id
  const revealComplete = Boolean(matchId && resultState.revealCompletedMatchId === matchId)
  const { resultVisible, resultCountdown } = resultState

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
    if (!match?.result || !revealComplete) {
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
  }, [match?.result, revealComplete])

  if (!match) return null

  return (
    <div className="relative min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-center text-2xl font-semibold">Match #{match.id.slice(-4).toUpperCase()}</h1>
        <GameTable
          match={match}
          onRevealComplete={() => dispatch({ type: 'mark_reveal', matchId: match.id })}
        />
        {match.result && !resultVisible && revealComplete && (
          <p className="text-center text-xs uppercase tracking-[0.3em] text-gray-400">
            Showing result in {resultCountdown ?? resultDelaySeconds}s
          </p>
        )}
        <SecondaryButton onClick={() => navigate('/lobby')}>Back to Lobby</SecondaryButton>
      </div>
      {match.phase === 'result' && resultVisible && (
        <ResultOverlay
          match={match}
          onPlayAgain={() => {
            if (!match) {
              navigate('/lobby')
              return
            }
            const stake = match.stake
            acknowledgeResult()
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
            acknowledgeResult()
            navigate('/lobby')
          }}
        />
      )}
    </div>
  )
}
