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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/90 px-4">
      <div className="w-full max-w-md rounded-3xl border border-pp-secondary/50 bg-gradient-to-b from-[#0d1325] via-[#070b17] to-black/90 p-6 text-center shadow-[0_25px_60px_rgba(5,8,22,0.85)]">
        <div className="flex items-center justify-center gap-3 text-4xl font-extrabold text-white">
          <span className="tracking-[0.3em]">{win ? 'WINNER' : 'YOU LOST'}</span>
          <Flame className="h-10 w-10 text-pp-highlight" />
        </div>
        <p className="mt-3 text-sm text-gray-300">{match.result.summary}</p>
        <div className="mx-auto mt-5 h-1 w-32 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-pp-primary to-pp-secondary animate-deal-card" />
        </div>
        <div className="mt-6 space-y-3">
          <PrimaryButton onClick={onPlayAgain}>Play again</PrimaryButton>
          <SecondaryButton onClick={onBack} className="flex items-center justify-center gap-2 text-xs font-semibold">
            <RefreshCw className="h-4 w-4" /> Return to Lobby
          </SecondaryButton>
        </div>
      </div>
    </div>
  )
}
