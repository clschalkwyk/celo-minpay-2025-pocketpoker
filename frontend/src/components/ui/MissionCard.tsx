import type { Mission } from '../../types'

export type MissionCardProps = {
  mission: Mission
  onClaim?: (id: string) => void
}

export const MissionCard = ({ mission, onClaim }: MissionCardProps) => {
  const percent = Math.min(100, Math.round((mission.progress / mission.target) * 100))
  const isClaimable = mission.state === 'completed'
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">{mission.type}</p>
          <p className="text-lg font-semibold text-white">{mission.title}</p>
        </div>
        <span className="text-xs text-pp-primary">+{mission.rewardXp} XP</span>
      </div>
      <p className="mt-2 text-sm text-gray-400">{mission.description}</p>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-pp-primary" style={{ width: `${percent}%` }}></div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>
          {mission.progress}/{mission.target}
        </span>
        {mission.state === 'claimed' && <span className="text-pp-primary">Claimed</span>}
        {isClaimable && (
          <button
            type="button"
            className="rounded-full border border-pp-primary px-3 py-1 text-pp-primary"
            onClick={() => onClaim?.(mission.id)}
          >
            Claim
          </button>
        )}
      </div>
    </div>
  )
}
