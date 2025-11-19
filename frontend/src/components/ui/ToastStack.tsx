import { X } from 'lucide-react'
import { useUIStore } from '../../hooks/useUIStore'

export const ToastStack = () => {
  const { toasts, dismissToast } = useUIStore()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex w-full max-w-sm items-center justify-between rounded-2xl border border-white/10 bg-pp-surface/90 px-4 py-3 text-sm text-white shadow-glow-green"
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => dismissToast(toast.id)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
