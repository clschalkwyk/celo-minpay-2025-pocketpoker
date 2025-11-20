import { useEffect, useReducer, useRef } from 'react'
import type { MatchState } from '../../types'
import { CardRow } from './CardRow'
import { PotDisplay } from './PotDisplay'
import { useAmbience } from '../../hooks/useSound'

const revealDelayMs = Number(import.meta.env.VITE_CARD_REVEAL_MS ?? 10000)

type RevealState = {
  opponentRevealed: boolean
  revealCountdown: number | null
}

type RevealAction =
  | { type: 'reset'; revealed: boolean }
  | { type: 'set_revealed'; value: boolean }
  | { type: 'set_countdown'; value: number | null }
  | { type: 'tick' }

const reduceRevealState = (state: RevealState, action: RevealAction): RevealState => {
  switch (action.type) {
    case 'reset':
      return { opponentRevealed: action.revealed, revealCountdown: null }
    case 'set_revealed':
      if (state.opponentRevealed === action.value) return state
      return { ...state, opponentRevealed: action.value }
    case 'set_countdown':
      if (state.revealCountdown === action.value) return state
      return { ...state, revealCountdown: action.value }
    case 'tick':
      if (state.revealCountdown === null) return state
      if (state.revealCountdown <= 0) return { ...state, revealCountdown: 0 }
      return { ...state, revealCountdown: state.revealCountdown - 1 }
    default:
      return state
  }
}

type GameTableProps = {
  match: MatchState
  onRevealComplete?: () => void
}

export const GameTable = ({ match, onRevealComplete }: GameTableProps) => {
  const [{ opponentRevealed, revealCountdown }, dispatch] = useReducer(
    reduceRevealState,
    match,
    (initialMatch): RevealState => ({ opponentRevealed: Boolean(initialMatch.result), revealCountdown: null }),
  )
  const totalSeconds = Math.round(revealDelayMs / 1000)
  const countdownIntervalRef = useRef<number | undefined>(undefined)
  const revealTimeoutRef = useRef<number | undefined>(undefined)
  const revealNotifiedRef = useRef(false)
  const latestResultRef = useRef(match.result)
  const youWin = match.result?.winner === 'you'
  const oppWin = match.result?.winner === 'opponent'
  const { playCardSwipe, playAmbiance, stopAmbiance } = useAmbience()

  useEffect(() => {
    latestResultRef.current = match.result
  }, [match.result])

  useEffect(() => {
    dispatch({ type: 'reset', revealed: Boolean(latestResultRef.current) })
    window.clearInterval(countdownIntervalRef.current)
    window.clearTimeout(revealTimeoutRef.current)
    revealNotifiedRef.current = false
    playCardSwipe()
    playAmbiance()
    return () => {
      stopAmbiance()
    }
  }, [match.id, playCardSwipe, playAmbiance, stopAmbiance])

  useEffect(() => {
    if (match.result && !match.opponent.ready) {
      dispatch({ type: 'set_revealed', value: true })
    }
  }, [match.result, match.opponent.ready])

  useEffect(() => {
    if (opponentRevealed && !revealNotifiedRef.current) {
      revealNotifiedRef.current = true
      onRevealComplete?.()
    }
    if (!opponentRevealed) {
      revealNotifiedRef.current = false
    }
  }, [opponentRevealed, onRevealComplete])

  useEffect(() => {
    const cleanup = () => {
      window.clearTimeout(revealTimeoutRef.current)
      window.clearInterval(countdownIntervalRef.current)
    }
    if (!match.opponent.ready) {
      dispatch({ type: 'set_revealed', value: false })
      dispatch({ type: 'set_countdown', value: null })
      cleanup()
      return cleanup
    }
    if (opponentRevealed) {
      dispatch({ type: 'set_countdown', value: null })
      cleanup()
      return cleanup
    }
    dispatch({ type: 'set_countdown', value: totalSeconds })
    revealTimeoutRef.current = window.setTimeout(() => dispatch({ type: 'set_revealed', value: true }), revealDelayMs)
    countdownIntervalRef.current = window.setInterval(() => {
      dispatch({ type: 'tick' })
    }, 1000)
    return cleanup
  }, [match.opponent.ready, opponentRevealed, match.id, totalSeconds])

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1f1a] to-[#041a1f] p-6 shadow-glow-green">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between text-gray-300">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">You</p>
            <p className="text-lg font-semibold text-white">{match.you.username}</p>
            <p className="text-xs text-gray-400">{match.you.ready ? 'Ready' : 'Awaiting stake'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Opponent</p>
            <p className="text-lg font-semibold text-white">{match.opponent.username}</p>
            <p className="text-xs text-gray-400">{match.opponent.ready ? 'Ready' : 'Matching...'}</p>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-gray-500">Your deck</p>
          <CardRow
            cards={match.you.cards}
            revealed
            ready={match.you.ready}
            isWinner={youWin}
            deckId={match.you.deckId}
          />
        </div>
        <PotDisplay stake={match.stake} />
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-gray-500">Opponent deck</p>
          <CardRow
            cards={match.opponent.cards}
            revealed={opponentRevealed}
            ready={match.opponent.ready}
            isWinner={oppWin}
            deckId={match.opponent.deckId}
          />
        </div>
        {match.opponent.ready && !opponentRevealed && (
          <div>
            <p className="text-center text-xs uppercase tracking-[0.3em] text-gray-400">
              Reveal in {revealCountdown ?? totalSeconds}s
            </p>
            <div className="mt-1 h-1 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-pp-primary transition-all duration-500"
                style={{ width: `${((revealCountdown ?? totalSeconds) / totalSeconds) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
