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
          <h1 className="text-2xl font-semibold">Missions</h1>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading missions...</p>
        ) : (
          <div className="space-y-4">
            {missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} onClaim={handleClaimMission} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
