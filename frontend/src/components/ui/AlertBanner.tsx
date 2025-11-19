import clsx from 'clsx'
import type { ReactNode } from 'react'

const variantStyles: Record<string, string> = {
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
  warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  error: 'border-red-500/30 bg-red-500/10 text-red-100',
}

type AlertBannerProps = {
  variant?: 'info' | 'warning' | 'error'
  icon?: ReactNode
  children: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export const AlertBanner = ({ variant = 'info', icon, children, actionLabel, onAction }: AlertBannerProps) => (
  <div className={clsx('flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm', variantStyles[variant])}>
    <div className="flex items-center gap-2">
      {icon}
      <span>{children}</span>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:text-pp-primary"
      >
        {actionLabel}
      </button>
    )}
  </div>
)
