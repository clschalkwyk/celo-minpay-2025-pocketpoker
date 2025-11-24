import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMiniPay } from '../../hooks/useMiniPay'
import { useProfile } from '../../hooks/useProfile'
import { useMatchContext } from '../../providers/MatchProvider'
import { addDebugLog, subscribeDebugLog } from '../../lib/debugLog'

const SHOW_DEBUG = import.meta.env.VITE_DEBUG_OVERLAY === 'true'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export const DebugOverlay = () => {
  const { pathname } = useLocation()
  const miniPay = useMiniPay()
  const { profile, loading: profileLoading } = useProfile()
  const { match } = useMatchContext()
  const [open, setOpen] = useState(true)
  const [logEntries, setLogEntries] = useState<{ ts: number; message: string }[]>([])

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
      ['profile.deckId', profile?.activeDeckId ?? '—'],
      ['match.id', match?.id ?? '—'],
      ['match.you.deck', `${match?.you.deckId ?? '—'} | ${match?.you.deckPreviewUrl ?? 'no-preview'}`],
      ['match.opp.deck', `${match?.opponent.deckId ?? '—'} | ${match?.opponent.deckPreviewUrl ?? 'no-preview'}`],
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
      profile?.activeDeckId,
      match?.id,
      match?.you.deckId,
      match?.you.deckPreviewUrl,
      match?.opponent.deckId,
      match?.opponent.deckPreviewUrl,
    ],
  )

  useEffect(() => {
    const unsubscribe = subscribeDebugLog(setLogEntries)
    return () => {
      unsubscribe()
    }
  }, [])

  if (!SHOW_DEBUG) return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-[9999] rounded-full bg-black/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white"
      >
        Show Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/80 px-4 py-3 text-xs font-mono text-white">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold tracking-wide text-brand-primary">Debug Overlay</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white"
        >
          Hide
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <span className="text-brand-secondary">{label}</span>
            <span className="truncate text-gray-200">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400">Recent logs</p>
        <button
          type="button"
          onClick={async () => {
            const text = logEntries
              .map((e) => `${new Date(e.ts).toISOString()} ${e.message}`)
              .join('\n')
            try {
              await navigator.clipboard.writeText(text)
              addDebugLog('Copied debug log to clipboard')
            } catch (err) {
              console.error('Failed to copy debug log', err)
            }
          }}
          className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white"
        >
          Copy log
        </button>
      </div>
      <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
        {logEntries.length === 0 ? (
          <p className="text-gray-400">No logs yet.</p>
        ) : (
          logEntries.map((entry) => (
            <div key={entry.ts} className="text-[11px] text-gray-200">
              <span className="text-brand-secondary">
                {new Date(entry.ts).toLocaleTimeString([], { hour12: false })}
              </span>{' '}
              {entry.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
