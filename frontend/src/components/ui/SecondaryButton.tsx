import clsx from 'clsx'
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

export const SecondaryButton = ({
  className,
  children,
  disabled,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & { className?: string }) => (
  <button
    className={clsx(
      'inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-3 font-semibold text-white transition hover:border-pp-primary hover:text-pp-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-pp-primary/40',
      disabled && 'cursor-not-allowed opacity-50 hover:border-white/20 hover:text-white',
      className,
    )}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
)
