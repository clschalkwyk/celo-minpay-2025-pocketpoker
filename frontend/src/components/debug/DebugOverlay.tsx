import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useMiniPay } from '../../hooks/useMiniPay'
import { useProfile } from '../../hooks/useProfile'

const SHOW_DEBUG = import.meta.env.VITE_DEBUG_OVERLAY === 'true'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export const DebugOverlay = () => {
  const { pathname } = useLocation()
  const miniPay = useMiniPay()
  const { profile, loading: profileLoading } = useProfile()

  const rows = useMemo(
    () => [
      ['route', pathname],
      ['backend', BACKEND_URL],
      ['miniPay.status', miniPay.status],
      ['miniPay.address', miniPay.address ?? '—'],
      ['miniPay.balanceR', miniPay.balance.toFixed(2)],
      ['miniPay.balanceCelo', miniPay.celoBalance.toFixed(6)],
      ['miniPay.isMiniPay', String(miniPay.isMiniPay)],
      ['miniPay.error', miniPay.error ?? 'none'],
      ['miniPay.exchangeRate', `1 CELO ≈ R${miniPay.exchangeRate.toLocaleString()}`],
      ['profile.loading', String(profileLoading)],
      ['profile.username', profile?.username ?? '—'],
    ],
    [
      pathname,
      miniPay.status,
      miniPay.address,
      miniPay.balance,
      miniPay.celoBalance,
      miniPay.isMiniPay,
      miniPay.error,
      miniPay.exchangeRate,
      profileLoading,
      profile?.username,
    ],
  )

  if (!SHOW_DEBUG) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/80 px-4 py-3 text-xs font-mono text-white">
      <p className="mb-2 font-semibold tracking-wide text-brand-primary">Debug Overlay</p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <span className="text-brand-secondary">{label}</span>
            <span className="truncate text-gray-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
