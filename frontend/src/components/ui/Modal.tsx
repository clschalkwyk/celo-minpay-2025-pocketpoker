import type { ReactNode } from 'react'
import clsx from 'clsx'

export type ModalProps = {
  isOpen: boolean
  onClose?: () => void
  children: ReactNode
  className?: string
}

export const Modal = ({ isOpen, onClose, children, className }: ModalProps) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8">
      <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full" onClick={onClose}></button>
      <div className={clsx('relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-pp-surface/90 p-6 text-white shadow-glow-purple', className)}>
        {children}
      </div>
    </div>
  )
}
