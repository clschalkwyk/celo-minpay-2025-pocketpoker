export type XPProgressProps = {
  level: number
  xp: number
  xpToNextLevel: number
}

export const XPProgress = ({ level, xp, xpToNextLevel }: XPProgressProps) => {
  const percent = Math.min(100, Math.round((xp / xpToNextLevel) * 100))
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
        <span>Level {level}</span>
        <span>
          {xp}/{xpToNextLevel} XP
        </span>
      </div>
      <div className="mt-2 h-3 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pp-primary to-pp-secondary transition-all"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  )
}
