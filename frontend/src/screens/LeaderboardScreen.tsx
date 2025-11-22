import { useEffect, useState } from 'react'
import { LeaderboardTable } from '../components/ui/LeaderboardTable'
import { ArrowLeft } from 'lucide-react'
import type { LeaderboardEntry } from '../types'
import { useProfile } from '../hooks/useProfile'
import { Api } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export const LeaderboardScreen = () => {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const { profile } = useProfile()

  useEffect(() => {
    Api.fetchLeaderboard()
      .then((res) => setEntries(res.leaderboard))
      .catch((err) => console.error(err))
  }, [])

  return (
    <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-pp-primary hover:text-pp-primary"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Global ranking</p>
            <h1 className="text-2xl font-semibold">Leaderboard</h1>
          </div>
        </div>
        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/60 p-5 shadow-[0_25px_60px_rgba(5,8,22,0.75)]">
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-gray-400">
            <span>Top contenders</span>
            <span>Challenge mode</span>
          </div>
          <LeaderboardTable entries={entries} selfId={profile?.id} />
        </section>
      </div>
    </div>
  )
}
