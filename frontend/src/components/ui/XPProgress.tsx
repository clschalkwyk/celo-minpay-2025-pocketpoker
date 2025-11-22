export type XPProgressProps = {
  level: number
  xp: number
  xpToNextLevel: number
}

export const XPProgress = ({ level, xp, xpToNextLevel }: XPProgressProps) => {
  const percent = Math.min(100, Math.round((xp / xpToNextLevel) * 100))
  return (
    <div className="glass-panel rounded-3xl border border-pp-secondary/40 bg-[#0B1020]/80 p-4 shadow-[0_15px_45px_rgba(53,208,127,0.25)]">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gray-400">
        <span>Level {level}</span>
        <span>
          {xp}/{xpToNextLevel} XP
        </span>
      </div>
      <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pp-primary to-pp-secondary transition-[width] duration-600 ease-out"
          style={{ width: `${percent}%` }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.45em] text-pp-primary/80">
          {percent}%
        </span>
      </div>
      <p className="mt-2 text-right text-[10px] uppercase tracking-[0.4em] text-gray-500">
        Keep going
      </p>
    </div>
  )
}
