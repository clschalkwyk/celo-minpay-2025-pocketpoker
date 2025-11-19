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
          <h1 className="text-2xl font-semibold">Global Leaderboard</h1>
        </div>
        <LeaderboardTable entries={entries} selfId={profile?.id} />
      </div>
    </div>
  )
}
