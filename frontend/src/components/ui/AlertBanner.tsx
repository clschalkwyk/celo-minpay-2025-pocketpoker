import clsx from 'clsx'
import type { ReactNode } from 'react'

const variantStyles: Record<'info' | 'warning' | 'error', string> = {
  info: 'from-pp-secondary/40 via-black/70 to-black/40 border border-pp-secondary/40 text-white shadow-[0_10px_30px_rgba(139,92,246,0.25)]',
  warning: 'from-pp-highlight/30 via-black/60 to-black/30 border border-pp-highlight/50 text-white shadow-[0_10px_30px_rgba(249,115,22,0.35)]',
  error: 'from-red-500/30 via-black/60 to-black/30 border border-red-500/40 text-white shadow-[0_10px_30px_rgba(239,68,68,0.35)]',
}

type AlertBannerProps = {
  variant?: 'info' | 'warning' | 'error'
  icon?: ReactNode
  children: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export const AlertBanner = ({ variant = 'info', icon, children, actionLabel, onAction }: AlertBannerProps) => (
  <div
    className={clsx(
      'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-[0_15px_45px_rgba(0,0,0,0.45)] bg-gradient-to-r',
      variantStyles[variant],
    )}
  >
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-white/80">
      {icon && <span className="text-white">{icon}</span>}
      <span className="text-sm font-semibold text-white">{children}</span>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.4em] text-white transition hover:border-pp-primary hover:text-pp-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/60"
      >
        {actionLabel}
      </button>
    )}
  </div>
)
