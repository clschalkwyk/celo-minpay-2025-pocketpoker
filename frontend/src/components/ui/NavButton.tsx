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
      'glass-panel flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:text-pp-primary',
      className,
    )}
  >
    {icon}
    {label}
  </Link>
)
