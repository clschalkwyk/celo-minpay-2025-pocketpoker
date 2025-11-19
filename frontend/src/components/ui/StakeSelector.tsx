import clsx from 'clsx'
import type { StakeTier } from '../../types'

export type StakeSelectorProps = {
  stakes: StakeTier[]
  value: number
  onChange: (amount: number) => void
}

export const StakeSelector = ({ stakes, value, onChange }: StakeSelectorProps) => (
  <div className="grid grid-cols-2 gap-3">
    {stakes.map((stake) => (
      <button
        key={stake.id}
        type="button"
        onClick={() => onChange(stake.amount)}
        className={clsx(
          'rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/40',
          value === stake.amount
            ? 'border-pp-primary bg-pp-primary/10 text-white shadow-glow-green'
            : 'border-white/10 bg-white/5 text-gray-300 hover:border-pp-primary/50',
        )}
      >
        <p className="text-lg font-semibold">{stake.label}</p>
        <p className="text-xs uppercase tracking-wide text-gray-400">Stake</p>
      </button>
    ))}
  </div>
)
