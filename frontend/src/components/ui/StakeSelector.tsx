import clsx from 'clsx'
import type { StakeTier } from '../../types'

export type StakeSelectorProps = {
  stakes: StakeTier[]
  value: number
  onChange: (amount: number) => void
  badges?: Record<number, string>
}

export const StakeSelector = ({ stakes, value, onChange, badges }: StakeSelectorProps) => (
  <div className="flex flex-wrap gap-3">
    {stakes.map((stake) => {
      const isSelected = value === stake.amount
      const badge = badges?.[stake.amount]
      return (
        <button
          key={stake.id}
          type="button"
          onClick={() => onChange(stake.amount)}
          className={clsx(
            'flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/60 sm:w-[calc(50%-0.75rem)]',
            isSelected
              ? 'border-transparent bg-gradient-to-r from-pp-primary/90 to-pp-secondary/80 text-white shadow-[0_12px_30px_rgba(53,208,127,0.45)] hover:scale-[1.01]'
              : 'border-white/10 bg-white/5 text-gray-300 hover:border-pp-primary/60 hover:bg-white/10',
          )}
        >
          <div>
            <p className="text-base">{stake.label}</p>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">stake</p>
          </div>
          <span className="text-sm text-white/80">R{stake.amount.toFixed(2)}</span>
          {badge && (
            <span className="rounded-full bg-pp-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-pp-primary">
              {badge}
            </span>
          )}
        </button>
      )
    })}
  </div>
)
