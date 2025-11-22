import { MissionCard } from '../components/ui/MissionCard'
import { ArrowLeft } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useUIStore } from '../hooks/useUIStore'
import { useNavigate } from 'react-router-dom'
import { useMissions } from '../hooks/useMissions'

export const MissionsScreen = () => {
  const navigate = useNavigate()
  const { pushToast } = useUIStore()
  const { grantXp } = useProfile()
  const { missions, loading, claimMission: claimMissionInternal } = useMissions()

  const handleClaimMission = (id: string) => {
    claimMissionInternal(id)
    pushToast('Mission reward claimed!', 'success')
    grantXp(120)
  }

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
            <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Everyhand mission</p>
            <h1 className="text-2xl font-semibold">Missions</h1>
          </div>
        </div>
        <section className="glass-panel rounded-3xl border border-pp-secondary/40 bg-gradient-to-br from-black/40 to-pp-surface/60 p-5 shadow-[0_25px_65px_rgba(5,8,22,0.7)]">
          <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Current assignments</p>
          <p className="mt-1 text-sm text-gray-200">
            Complete these challenges to stack XP, unlock decks, and flex on the leaderboard.
          </p>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-xs text-gray-500">Loading missions...</p>
            ) : missions.length ? (
              missions.map((mission) => (
                <MissionCard key={mission.id} mission={mission} onClaim={handleClaimMission} />
              ))
            ) : (
              <p className="text-xs text-gray-500">No missions unlocked yet. Play matches to unlock new goals.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
