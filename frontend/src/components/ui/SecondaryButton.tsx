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
      'inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white outline-none transition focus-visible:ring-2 focus-visible:ring-pp-primary/70 shadow-[0_10px_30px_rgba(0,0,0,0.5)]',
      !disabled && 'hover:border-pp-primary/80 hover:text-pp-primary active:scale-[0.98]',
      disabled && 'cursor-not-allowed opacity-60',
      className,
    )}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
)
