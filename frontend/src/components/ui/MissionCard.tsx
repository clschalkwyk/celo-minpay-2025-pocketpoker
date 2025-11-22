import { SecondaryButton } from './SecondaryButton'
import type { Mission } from '../../types'

export type MissionCardProps = {
  mission: Mission
  onClaim?: (id: string) => void
}

export const MissionCard = ({ mission, onClaim }: MissionCardProps) => {
  const percent = Math.min(100, Math.round((mission.progress / mission.target) * 100))
  const isClaimable = mission.state === 'completed'
  return (
    <div className="relative overflow-hidden rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/50 via-[#050912] to-[#10122c] p-5 shadow-[0_20px_60px_rgba(5,8,22,0.8)]">
      <div className="absolute inset-0 bg-gradient-to-br from-pp-primary/10 via-transparent to-pp-secondary/10 opacity-60 blur-xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.7em] text-gray-500">{mission.type}</p>
          <p className="text-xl font-semibold text-white">{mission.title}</p>
        </div>
        <span className="text-xs font-semibold uppercase leading-none tracking-[0.3em] text-pp-primary">
          +{mission.rewardXp} XP
        </span>
      </div>
      <p className="relative mt-3 text-sm text-gray-300">{mission.description}</p>
      <div className="relative mt-4 h-2 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pp-primary to-pp-secondary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="relative mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.4em] text-gray-400">
        <span>
          {mission.progress}/{mission.target} progress
        </span>
        {mission.state === 'claimed' && <span className="text-pp-highlight">Claimed</span>}
      </div>
      {isClaimable && (
        <div className="mt-4">
          <SecondaryButton className="px-4 py-2 text-[12px] tracking-[0.5em]" onClick={() => onClaim?.(mission.id)}>
            Claim reward
          </SecondaryButton>
        </div>
      )}
    </div>
  )
}
