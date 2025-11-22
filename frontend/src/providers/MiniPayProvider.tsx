import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { MiniPayStatus } from '../types'
import {
  detectMiniPay,
  ensureChain,
  fakeTxHash,
  fetchBalance as fetchMiniPayBalance,
  requestAccounts,
  sendStakeTx,
} from '../lib/minipay'
import { CELO_TO_ZAR_RATE, convertZarToCelo } from '../lib/currency'

type MiniPayContextValue = {
  status: MiniPayStatus
  address?: string
  balance: number
  celoBalance: number
  error?: string
  isMiniPay: boolean
  connect: () => Promise<void>
  refreshBalance: () => Promise<void>
  sendStake: (stake: number) => Promise<{ txHash: string }>
  exchangeRate: number
}

const MiniPayContext = createContext<MiniPayContextValue | undefined>(undefined)

export const MiniPayProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<MiniPayStatus>('checking')
  const [address, setAddress] = useState<string>()
  const [balance, setBalance] = useState<number>(0)
  const [celoBalance, setCeloBalance] = useState(0)
  const [error, setError] = useState<string>()
  const [isMiniPay, setIsMiniPay] = useState(false)
  const escrowAddress = import.meta.env.VITE_ESCROW_ADDRESS
  const requiredChain = import.meta.env.VITE_MINIPAY_CHAIN_ID

  const refreshBalance = useCallback(async () => {
    try {
      if (isMiniPay && address) {
        const provider = detectMiniPay()
        if (provider) {
          const value = await fetchMiniPayBalance(provider, address)
          setCeloBalance(value)
          setBalance(Number((value * CELO_TO_ZAR_RATE).toFixed(2)))
          return
        }
      }
      // fallback demo balance
      const demo = Number((20 + Math.random() * 10).toFixed(2))
      setBalance(demo)
      setCeloBalance(convertZarToCelo(demo))
    } catch (err) {
      console.error(err)
      setError('Unable to fetch balance')
    }
  }, [isMiniPay, address])

  const initialize = useCallback(async () => {
    setStatus('checking')
    setError(undefined)
    const provider = detectMiniPay()
    if (!provider) {
      if (import.meta.env.DEV) {
        setIsMiniPay(false)
        setAddress('0xDemoUser')
        setStatus('ready')
        await refreshBalance()
        return
      }
      setStatus('error')
      setError('Please open this experience inside MiniPay.')
      return
    }
    try {
      await ensureChain(provider, requiredChain)
      const wallet = await requestAccounts(provider)
      setIsMiniPay(true)
      setAddress(wallet)
      setStatus('ready')
      await refreshBalance()
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
      setStatus('error')
    }
  }, [refreshBalance, requiredChain])

  const connect = useCallback(async () => {
    await initialize()
  }, [initialize])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void initialize()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialize])

  const sendStake = useCallback(
    async (stake: number) => {
      if (isMiniPay && address && escrowAddress) {
        try {
          const provider = detectMiniPay()
          if (!provider) throw new Error('MiniPay provider not found')
          await ensureChain(provider, requiredChain)
          const celoAmount = convertZarToCelo(stake)
          if (celoAmount <= 0) throw new Error('Invalid stake amount')
          const txHash = await sendStakeTx({ provider, from: address, stake: celoAmount, contractAddress: escrowAddress })
          await refreshBalance()
          return { txHash }
        } catch (err) {
          console.error(err)
          throw new Error('MiniPay transaction failed')
        }
      }
      // fallback demo tx
      const txHash = fakeTxHash()
      setBalance((prev) => Number(Math.max(prev - stake, 0).toFixed(2)))
      setCeloBalance((prev) => Math.max(prev - convertZarToCelo(stake), 0))
      return { txHash }
    },
    [isMiniPay, address, escrowAddress, refreshBalance, requiredChain],
  )

  const value = useMemo(
    () => ({
      status,
      address,
      balance,
      celoBalance,
      error,
      isMiniPay,
      connect,
      refreshBalance,
      sendStake,
      exchangeRate: CELO_TO_ZAR_RATE,
    }),
    [status, address, balance, celoBalance, error, isMiniPay, connect, refreshBalance, sendStake],
  )

  return <MiniPayContext.Provider value={value}>{children}</MiniPayContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMiniPayContext = () => {
  const ctx = useContext(MiniPayContext)
  if (!ctx) throw new Error('useMiniPayContext must be used within MiniPayProvider')
  return ctx
}
