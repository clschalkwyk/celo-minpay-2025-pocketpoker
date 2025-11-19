import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

export const IconButton = ({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={clsx(
      'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-pp-primary hover:text-pp-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/40',
      className,
    )}
    {...props}
  >
    {children}
  </button>
)
