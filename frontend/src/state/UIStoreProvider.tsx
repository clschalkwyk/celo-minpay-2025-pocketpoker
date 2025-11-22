import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

export type Toast = {
  id: string
  message: string
  variant: 'info' | 'success' | 'error'
}

type UIStoreValue = {
  selectedStake: number
  setSelectedStake: (value: number) => void
  isMatchmakingOpen: boolean
  matchmakingStake: number
  openMatchmaking: (stake: number) => void
  closeMatchmaking: () => void
  toasts: Toast[]
  pushToast: (message: string, variant?: Toast['variant']) => void
  dismissToast: (id: string) => void
  realMoneyMode: boolean
  setRealMoneyMode: (value: boolean) => void
}

const UIStoreContext = createContext<UIStoreValue | undefined>(undefined)

const TOAST_DURATION_MS = 3500
const REAL_MONEY_KEY = 'pocketpoker_real_money_mode'

export const UIStoreProvider = ({ children }: { children: ReactNode }) => {
  const [selectedStake, setSelectedStake] = useState(1)
  const [isMatchmakingOpen, setMatchmakingOpen] = useState(false)
  const [matchmakingStake, setMatchmakingStake] = useState(1)
  const [toasts, setToasts] = useState<Toast[]>([])
  const getStoredRealMoneyMode = () => {
    if (typeof window === 'undefined' || !window.localStorage?.getItem) return false
    return window.localStorage.getItem(REAL_MONEY_KEY) === 'true'
  }
  const [realMoneyMode, setRealMoneyModeState] = useState(() => getStoredRealMoneyMode())

  const openMatchmaking = useCallback((stake: number) => {
    setMatchmakingStake(stake)
    setMatchmakingOpen(true)
  }, [])

  const closeMatchmaking = useCallback(() => {
    setMatchmakingOpen(false)
  }, [])

  const pushToast = useCallback((message: string, variant: Toast['variant'] = 'info') => {
    const id = crypto.randomUUID?.() ?? Math.random().toString(36)
    setToasts((prev) => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const setRealMoneyMode = useCallback((value: boolean) => {
    setRealMoneyModeState(value)
    if (typeof window !== 'undefined' && window.localStorage?.setItem) {
      window.localStorage.setItem(REAL_MONEY_KEY, String(value))
    }
  }, [])

  const value = useMemo(
    () => ({
      selectedStake,
      setSelectedStake,
      isMatchmakingOpen,
      matchmakingStake,
      openMatchmaking,
      closeMatchmaking,
      toasts,
      pushToast,
      dismissToast,
      realMoneyMode,
      setRealMoneyMode,
    }),
    [
      selectedStake,
      isMatchmakingOpen,
      matchmakingStake,
      openMatchmaking,
      closeMatchmaking,
      toasts,
      pushToast,
      dismissToast,
      realMoneyMode,
      setRealMoneyMode,
    ],
  )

  return <UIStoreContext.Provider value={value}>{children}</UIStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUIStore = () => {
  const ctx = useContext(UIStoreContext)
  if (!ctx) throw new Error('useUIStore must be used within UIStoreProvider')
  return ctx
}
