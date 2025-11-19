import { Flame, RefreshCw } from 'lucide-react'
import type { MatchState } from '../../types'
import { PrimaryButton } from '../ui/PrimaryButton'
import { SecondaryButton } from '../ui/SecondaryButton'

export type ResultOverlayProps = {
  match: MatchState
  onPlayAgain: () => void
  onBack: () => void
}

export const ResultOverlay = ({ match, onPlayAgain, onBack }: ResultOverlayProps) => {
  if (!match.result) return null
  const win = match.result.winner === 'you'
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-pp-surface/95 p-6 text-center shadow-2xl shadow-pp-primary/50">
        <div className="flex items-center justify-center gap-2 text-4xl font-extrabold text-white">
          {win ? 'WINNER' : 'YOU LOST'}
          <Flame className="h-8 w-8 text-pp-highlight" />
        </div>
        <p className="mt-2 text-sm text-gray-300">{match.result.summary}</p>
        <div className="mt-6 space-y-2">
          <PrimaryButton onClick={onPlayAgain}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack} className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" /> Return to Lobby
          </SecondaryButton>
        </div>
      </div>
    </div>
  )
}
