import clsx from 'clsx'
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

export const PrimaryButton = ({ className, children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & { className?: string }) => (
  <button
    className={clsx(
      'inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-pp-primary to-pp-secondary px-5 py-3 text-base font-semibold text-white shadow-[0_12px_35px_rgba(53,208,127,0.45)] transition duration-200 ease-out hover:scale-[1.05] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pp-primary/70',
      className,
    )}
    {...props}
  >
    {children}
  </button>
)
