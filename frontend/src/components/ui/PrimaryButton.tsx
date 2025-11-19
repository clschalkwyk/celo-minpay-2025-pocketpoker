import clsx from 'clsx'
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

export const PrimaryButton = ({ className, children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & { className?: string }) => (
  <button
    className={clsx(
      'inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-pp-primary to-pp-secondary px-4 py-3 font-semibold text-white shadow-glow-green transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/70',
      className,
    )}
    {...props}
  >
    {children}
  </button>
)
