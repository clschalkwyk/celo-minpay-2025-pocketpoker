import { useEffect, useMemo, useReducer, useState } from 'react'
import { Shield, CheckCircle2 } from 'lucide-react'
import type { AdminStats, CreatorDeckSubmission, DeckPurchase } from '../types'
import { Api } from '../lib/api'
import { PrimaryButton } from '../components/ui/PrimaryButton'

const defaultKey = import.meta.env.VITE_ADMIN_KEY

type AdminDataState = {
  submissions: CreatorDeckSubmission[]
  purchases: DeckPurchase[]
  stats?: AdminStats
  loading: boolean
  error?: string
}

type AdminAction =
  | { type: 'start' }
  | { type: 'error'; error: string }
  | { type: 'success'; payload: { submissions: CreatorDeckSubmission[]; purchases: DeckPurchase[]; stats: AdminStats } }
  | { type: 'updateSubmission'; payload: CreatorDeckSubmission }

const initialState: AdminDataState = { submissions: [], purchases: [], loading: false }

const adminReducer = (state: AdminDataState, action: AdminAction): AdminDataState => {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true, error: undefined }
    case 'error':
      return { ...state, loading: false, error: action.error }
    case 'success':
      return {
        submissions: action.payload.submissions,
        purchases: action.payload.purchases,
        stats: action.payload.stats,
        loading: false,
      }
    case 'updateSubmission':
      return {
        ...state,
        submissions: state.submissions.map((submission) => (submission.id === action.payload.id ? action.payload : submission)),
      }
    default:
      return state
  }
}

export const AdminScreen = () => {
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('pp_admin_key') ?? defaultKey ?? '')
  const [pendingKey, setPendingKey] = useState(adminKey)
  const [view, setView] = useState<'submissions' | 'sales'>('submissions')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [state, dispatch] = useReducer(adminReducer, initialState)

  const isAuthed = Boolean(adminKey)
  const { submissions, purchases, stats, loading, error } = state

  useEffect(() => {
    if (!isAuthed) return
    dispatch({ type: 'start' })
    const statusParam: 'pending' | 'approved' | 'rejected' | undefined = statusFilter === 'all' ? undefined : statusFilter
    Promise.all([
      Api.fetchAdminSubmissions(adminKey, statusParam),
      Api.fetchAdminPurchases(adminKey),
      Api.fetchAdminStats(adminKey),
    ])
      .then(([subs, purchasesRes, statsRes]) => {
        dispatch({
          type: 'success',
          payload: {
            submissions: subs.submissions,
            purchases: purchasesRes.purchases,
            stats: statsRes as AdminStats,
          },
        })
      })
      .catch((err) => {
        console.error(err)
        dispatch({ type: 'error', error: (err as Error).message })
      })
  }, [adminKey, statusFilter, isAuthed])

  const handleSaveKey = () => {
    setAdminKey(pendingKey)
    if (pendingKey) {
      localStorage.setItem('pp_admin_key', pendingKey)
    }
  }

  const handleSubmissionAction = async (id: string, updates: { status?: 'pending' | 'approved' | 'rejected'; nsfwFlag?: boolean; reviewNotes?: string }) => {
    if (!adminKey) return
    try {
      const res = await Api.updateSubmission(adminKey, id, updates)
      dispatch({ type: 'updateSubmission', payload: res.submission })
    } catch (err) {
      console.error(err)
      dispatch({ type: 'error', error: (err as Error).message })
    }
  }

  const filteredPurchases = useMemo(() => purchases.slice(0, 25), [purchases])

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
        <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-pp-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Admin Access</h1>
              <p className="text-xs text-gray-400">Enter the admin key to view submissions and sales.</p>
            </div>
          </div>
          <input
            type="password"
            value={pendingKey}
            onChange={(event) => setPendingKey(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Admin key"
          />
          <PrimaryButton onClick={handleSaveKey}>Sign in</PrimaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Marketplace</p>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>Pending: {stats?.submissions.pending ?? '—'}</span>
            <span>Approved: {stats?.submissions.approved ?? '—'}</span>
            <span>Sales: R{formatCurrency(stats?.sales.totalSales)}</span>
          </div>
        </header>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${view === 'submissions' ? 'bg-pp-primary text-white' : 'bg-white/10 text-gray-300'}`}
            onClick={() => setView('submissions')}
          >
            Submissions
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${view === 'sales' ? 'bg-pp-primary text-white' : 'bg-white/10 text-gray-300'}`}
            onClick={() => setView('sales')}
          >
            Sales
          </button>
        </div>
        {view === 'submissions' ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
              {loading && <span className="text-xs text-gray-400">Refreshing…</span>}
            </div>
            {submissions.length === 0 ? (
              <p className="text-sm text-gray-400">No submissions found.</p>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div key={submission.id} className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 md:flex-row">
                    <img src={submission.previewImageUrl} alt={submission.deckName} className="h-40 w-full rounded-2xl object-cover md:w-48" />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{submission.deckName}</h3>
                        <span className="text-xs uppercase tracking-[0.3em] text-gray-400">{submission.rarity}</span>
                        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] ${badgeClass(submission.status)}`}>
                          {submission.status}
                        </span>
                        {submission.nsfwFlag && (
                          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200">Flagged</span>
                        )}
                      </div>
                      <p className="text-xs uppercase tracking-[0.3em] text-pp-highlight">By {submission.creatorName}</p>
                      <p className="text-sm text-gray-300">{submission.description}</p>
                      {submission.reviewNotes && <p className="text-xs text-gray-400">Note: {submission.reviewNotes}</p>}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-pp-primary px-4 py-2 text-xs text-pp-primary"
                          onClick={() => handleSubmissionAction(submission.id, { status: 'approved' })}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-amber-400/60 px-4 py-2 text-xs text-amber-200"
                          onClick={() => handleSubmissionAction(submission.id, { status: 'pending' })}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-red-400/60 px-4 py-2 text-xs text-red-200"
                          onClick={() => handleSubmissionAction(submission.id, { status: 'rejected' })}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80"
                          onClick={() => handleSubmissionAction(submission.id, { nsfwFlag: !submission.nsfwFlag })}
                        >
                          {submission.nsfwFlag ? 'Unflag' : 'Flag NSFW'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-pp-primary" />
              <span>Platform fees collected: R{formatCurrency(stats?.sales.totalPlatformFees)}</span>
              <span>Creator share owed: R{formatCurrency(stats?.sales.totalCreatorShare)}</span>
            </div>
            {filteredPurchases.length === 0 ? (
              <p className="text-sm text-gray-400">No sales logged yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.3em] text-gray-400">
                      <th className="px-4 py-3">Deck</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Platform fee</th>
                      <th className="px-4 py-3">Creator share</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="border-t border-white/5">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{purchase.deckName}</p>
                          <p className="text-xs text-gray-400">{purchase.creatorName ?? 'PocketPoker'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{purchase.buyer}</td>
                        <td className="px-4 py-3 text-gray-100">R{purchase.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-300">R{purchase.platformFee.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-300">R{purchase.creatorShare.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(purchase.purchasedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

const formatCurrency = (value?: number) => (typeof value === 'number' ? value.toFixed(2) : '0.00')

const badgeClass = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-pp-primary/20 text-pp-primary'
    case 'rejected':
      return 'bg-red-500/20 text-red-200'
    default:
      return 'bg-amber-500/20 text-amber-200'
  }
}
