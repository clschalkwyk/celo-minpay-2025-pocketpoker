import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

export type NavButtonProps = {
  label: string
  to: string
  icon?: ReactNode
  className?: string
}

export const NavButton = ({ label, to, icon, className }: NavButtonProps) => (
  <Link
    to={to}
    className={clsx(
      'flex min-h-[96px] w-full flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-pp-secondary/30 bg-gradient-to-br from-black/40 to-pp-surface/80 px-3 py-4 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:border-pp-primary/70 hover:text-white shadow-[0_10px_30px_rgba(53,208,127,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/60',
      className,
    )}
  >
    {icon}
    <span className="text-sm uppercase tracking-wide text-white">{label}</span>
  </Link>
)
