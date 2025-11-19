import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { StakeSelector } from '../components/ui/StakeSelector'
import { XPProgress } from '../components/ui/XPProgress'
import { PrimaryButton } from '../components/ui/PrimaryButton'
import { NavButton } from '../components/ui/NavButton'
import { useProfile } from '../hooks/useProfile'
import { useMiniPay } from '../hooks/useMiniPay'
import { useUIStore } from '../hooks/useUIStore'
import { useMatch } from '../hooks/useMatch'
import { stakeTiers } from '../lib/mockData'
import { WalletCards, Flag, Trophy, BookOpenCheck, UserRound, AlertTriangle } from 'lucide-react'
import type { MatchQueueStatus } from '../providers/MatchProvider'
import { AlertBanner } from '../components/ui/AlertBanner'

export const LobbyScreen = () => {
  const navigate = useNavigate()
  const { profile, loading } = useProfile()
  const { balance, refreshBalance, status: miniPayStatus, error: miniPayError, connect } = useMiniPay()
  const { selectedStake, setSelectedStake } = useUIStore()
  const { queueForMatch, queueStatus } = useMatch()

  const miniPayReady = miniPayStatus === 'ready'
  const playDisabled = !miniPayReady || queueStatus !== 'idle'

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        Loading profile...
      </div>
    )
  }

  const handlePlay = async () => {
    if (!miniPayReady) {
      connect().catch((err) => console.error('Failed to reconnect MiniPay', err))
      return
    }
    const match = await queueForMatch(selectedStake)
    if (match) navigate(`/match/${match.id}`)
  }


  return (
    <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <TopBar
          avatarUrl={profile.avatarUrl}
          username={profile.username}
          rankTitle={profile.rankTitle}
          balanceLabel={`MiniPay R${balance.toFixed(2)}`}
          creditsLabel={`Credits R${profile.credits.toFixed(2)}`}
          onRefreshBalance={refreshBalance}
        />

        {miniPayStatus === 'error' && (
          <AlertBanner
            variant="error"
            icon={<AlertTriangle className="h-4 w-4" />}
            actionLabel="Retry"
            onAction={connect}
          >
            {miniPayError ?? 'MiniPay is required to stake. Open PocketPoker inside MiniPay and retry.'}
          </AlertBanner>
        )}

        <section className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Quick match</p>
              <p className="text-2xl font-semibold">Stake &amp; Showdown</p>
            </div>
            <p className="text-sm text-gray-400">Pot doubles</p>
          </div>
          <div className="mt-4">
            <StakeSelector stakes={stakeTiers} value={selectedStake} onChange={setSelectedStake} />
            <p className="mt-2 text-xs text-gray-400">Using demo credits. Balance: R{profile.credits.toFixed(2)}</p>
          </div>
          <PrimaryButton className="mt-5" onClick={handlePlay} disabled={playDisabled}>
            {miniPayReady ? 'Play now' : 'Open in MiniPay'}
          </PrimaryButton>
          {!miniPayReady && (
            <p className="mt-2 text-center text-xs text-gray-400">
              Connect MiniPay to enable staking. We’ll keep your credits ready.
            </p>
          )}
          {queueStatus !== 'idle' && (
            <QueueStatusBanner status={queueStatus} />
          )}
        </section>

        <XPProgress level={profile.level} xp={profile.xp} xpToNextLevel={profile.xpToNextLevel} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <NavButton label="Profile" to="/profile" icon={<UserRound className="h-4 w-4" />} />
          <NavButton label="Decks" to="/decks" icon={<WalletCards className="h-4 w-4" />} />
          <NavButton label="Missions" to="/missions" icon={<Flag className="h-4 w-4" />} />
          <NavButton label="Leaderboard" to="/leaderboard" icon={<Trophy className="h-4 w-4" />} />
          <NavButton label="Rules" to="/rules" icon={<BookOpenCheck className="h-4 w-4" />} />
        </div>
      </div>
    </div>
  )
}

const statusCopy: Record<MatchQueueStatus, string> = {
  idle: '',
  funding: 'Checking your demo credits…',
  searching: 'Synced with the arena. Awaiting confirmation…',
  waiting: 'In queue. We will refund if no opponent joins soon.',
  timeout: 'No opponent found. Credits were refunded.',
  error: 'Matchmaking failed. Please try again.',
}

const QueueStatusBanner = ({ status }: { status: MatchQueueStatus }) => {
  if (status === 'idle') return null
  return (
    <div className="glass-panel mt-2 rounded-2xl border-white/10 bg-white/5 p-3 text-xs text-gray-200">
      Queue status: {statusCopy[status]}
    </div>
  )
}
