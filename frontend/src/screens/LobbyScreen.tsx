import { useEffect, useRef, useState } from 'react'
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
import { Api } from '../lib/api'
import { convertZarToCelo, CELO_TO_ZAR_RATE, formatCelo } from '../lib/currency'
import { WalletCards, Flag, Trophy, BookOpenCheck, UserRound, AlertTriangle, WifiOff } from 'lucide-react'
import type { MatchQueueStatus } from '../providers/MatchProvider'
import { AlertBanner } from '../components/ui/AlertBanner'
import { SecondaryButton } from '../components/ui/SecondaryButton'

export const LobbyScreen = () => {
  const navigate = useNavigate()
  const { profile, loading } = useProfile()
  const { balance, refreshBalance, status: miniPayStatus, error: miniPayError, connect } = useMiniPay()
  const { selectedStake, setSelectedStake, realMoneyMode, setRealMoneyMode, pushToast, allowBotMatches, setAllowBotMatches } =
    useUIStore()
  const { queueForMatch, queueStatus, retryLastQueueAsDemo, lastQueuedStake, lastQueuedMode, match } = useMatch()
  const [queueBadges, setQueueBadges] = useState<Record<number, string>>({})
  const [queueMeta, setQueueMeta] = useState<{ updatedAt?: number; error?: string }>({})
  const escrowAddress = import.meta.env.VITE_ESCROW_ADDRESS as string | undefined
  const minipayChainId = import.meta.env.VITE_MINIPAY_CHAIN_ID as string | undefined
  const pollRef = useRef<number | undefined>(undefined)

  const miniPayReady = miniPayStatus === 'ready'
  const playDisabled = (realMoneyMode && !miniPayReady) || (queueStatus !== 'idle' && !match?.id)

  const handlePlay = async () => {
    if (realMoneyMode && !miniPayReady) {
      connect().catch((err) => console.error('Failed to reconnect MiniPay', err))
      return
    }
    const match = await queueForMatch(selectedStake)
    if (match) navigate(`/match/${match.id}`)
  }

  const handleUseDemo = () => {
    setRealMoneyMode(false)
    pushToast('Switched to demo credits lobby', 'info')
  }

  useEffect(() => {
    if (!realMoneyMode) return
    let bestStake: number | undefined
    let bestCount = -1
    for (const [stakeStr, label] of Object.entries(queueBadges)) {
      const count = Number(label.split(' ')[0])
      const stake = Number(stakeStr)
      if (Number.isFinite(count) && count > bestCount) {
        bestCount = count
        bestStake = stake
      }
    }
    if (bestStake && selectedStake !== bestStake) {
      setSelectedStake(bestStake)
    }
  }, [queueBadges, realMoneyMode, selectedStake, setSelectedStake])

  useEffect(() => {
    if (!realMoneyMode) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = undefined
      }
      return
    }
    const fetchStatus = async () => {
      try {
        const response = await Api.queueStatus()
        const next: Record<number, string> = {}
        for (const entry of response.status) {
          next[entry.stake] = `${entry.count} waiting`
        }
        setQueueBadges(next)
        setQueueMeta({ updatedAt: Date.now(), error: undefined })
      } catch (err) {
        console.error('Failed to load queue status', err)
        setQueueMeta({ updatedAt: Date.now(), error: (err as Error).message })
      }
    }
    void fetchStatus()
    pollRef.current = window.setInterval(fetchStatus, 8000)
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = undefined
      }
    }
  }, [realMoneyMode])

  useEffect(() => {
    if (match?.id) {
      navigate(`/match/${match.id}`, { replace: true })
    }
  }, [match?.id, navigate])

  const visibleBadges = realMoneyMode ? queueBadges : {}
  const queueStatusLabel = !realMoneyMode
    ? allowBotMatches
      ? 'Demo mode — bot quickplay enabled'
      : 'Demo mode — PvP only (no bots)'
    : queueMeta.error
      ? `Queue visibility degraded: ${queueMeta.error}`
      : queueMeta.updatedAt
        ? `Queue visibility active — updated ${new Date(queueMeta.updatedAt).toLocaleTimeString()}`
        : 'Queue visibility syncing...'

  return (
    <div className="min-h-screen bg-pp-bg px-4 py-6 text-white">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        {loading || !profile ? (
          <div className="flex min-h-[40vh] items-center justify-center text-white">Loading profile...</div>
        ) : (
          <>
        <TopBar
          avatarUrl={profile.avatarUrl}
          username={profile.username}
          rankTitle={profile.rankTitle}
          balanceLabel={`MiniPay R${balance.toFixed(2)}`}
          creditsLabel={
            realMoneyMode ? 'Demo credits paused' : `Credits R${profile.credits.toFixed(2)}`
          }
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
            <StakeSelector stakes={stakeTiers} value={selectedStake} onChange={setSelectedStake} badges={visibleBadges} />
            <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gray-500">
              {queueMeta.error ? (
                <WifiOff className="h-3 w-3" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-pp-primary" />
              )}
              <span className="text-gray-400">{queueStatusLabel}</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {realMoneyMode ? (
                <>
                  Using real cUSD via MiniPay. Demo credits stay unchanged.
                  <br />
                  On-chain stake: {formatCelo(convertZarToCelo(selectedStake))} CELO (1 CELO ≈ R
                  {CELO_TO_ZAR_RATE.toLocaleString()})
                </>
              ) : (
                <>Using demo credits. Balance: R{profile.credits.toFixed(2)}</>
              )}
            </p>
            {realMoneyMode && escrowAddress && (
              <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-gray-500">
                Escrow {escrowAddress.slice(0, 6)}…{escrowAddress.slice(-4)}
                {minipayChainId ? ` · Chain ${minipayChainId}` : ''}
              </p>
            )}
            {realMoneyMode ? (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
                <span>Real-money lobby (MiniPay required)</span>
                <SecondaryButton className="px-3 py-1 text-[11px]" onClick={handleUseDemo}>
                  Use demo credits
                </SecondaryButton>
              </div>
            ) : (
              <div className="mt-3 space-y-2 rounded-2xl border border-pp-primary/20 bg-pp-primary/10 px-3 py-2 text-xs text-pp-primary">
                <div className="flex items-center justify-between">
                  <span>Demo lobby target</span>
                  <div className="flex gap-2">
                    <SecondaryButton
                      className={`px-3 py-1 text-[11px] ${allowBotMatches ? 'bg-white/15 text-white' : ''}`}
                      onClick={() => setAllowBotMatches(true)}
                    >
                      Bot quickplay
                    </SecondaryButton>
                    <SecondaryButton
                      className={`px-3 py-1 text-[11px] ${!allowBotMatches ? 'bg-white/15 text-white' : ''}`}
                      onClick={() => setAllowBotMatches(false)}
                    >
                      PvP only
                    </SecondaryButton>
                  </div>
                </div>
                <p className="text-[11px] text-pp-highlight">
                  {allowBotMatches ? 'Fast fill with bots allowed.' : 'No bots — waits for a human opponent.'}
                </p>
              </div>
            )}
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
            <QueueStatusBanner
              status={queueStatus}
              realMoneyMode={realMoneyMode}
              lastStake={lastQueuedStake}
              lastMode={lastQueuedMode}
              escrowAddress={escrowAddress}
              allowBotMatches={allowBotMatches}
              onRetry={() => void queueForMatch(selectedStake)}
              onRetryDemo={() => void retryLastQueueAsDemo()}
            />
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
          </>
        )}
      </div>
    </div>
  )
}

const statusCopy: Record<MatchQueueStatus, string> = {
  idle: '',
  funding: 'Checking your stake…',
  searching: 'Synced with the arena. Awaiting confirmation…',
  waiting: 'In queue. We will refund if no opponent joins soon.',
  timeout: 'No opponent found. Credits were refunded.',
  error: 'Matchmaking failed. Please try again.',
}

const QueueStatusBanner = ({
  status,
  realMoneyMode,
  lastStake,
  lastMode,
  escrowAddress,
  allowBotMatches,
  onRetry,
  onRetryDemo,
}: {
  status: MatchQueueStatus
  realMoneyMode: boolean
  lastStake?: number
  lastMode?: boolean
  escrowAddress?: string
  allowBotMatches: boolean
  onRetry: () => void
  onRetryDemo: () => void
}) => {
  if (status === 'idle') return null
  const copy =
    status === 'timeout' && lastStake
      ? `No opponent found. R${lastStake.toFixed(2)} refunded.`
      : statusCopy[status]
  return (
    <div className="mt-3 rounded-2xl border border-pp-secondary/40 bg-gradient-to-br from-white/10 to-black/40 px-4 py-3 text-sm font-semibold text-gray-100 shadow-[0_12px_30px_rgba(139,92,246,0.25)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.45em] text-pp-secondary/70">Queue status</p>
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.45em] text-white">
          <span className="h-2 w-2 rounded-full bg-pp-primary/90 shadow-[0_0_12px_rgba(53,208,127,0.45)] pulse-ring"></span>
          {status}
        </span>
      </div>
      <p className="mt-2 text-xs text-gray-300">{copy}</p>
      {realMoneyMode && escrowAddress && (
        <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-gray-500">
          Escrow {escrowAddress.slice(0, 6)}…{escrowAddress.slice(-4)}
        </p>
      )}
      {!realMoneyMode && (
        <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-gray-500">
          {allowBotMatches ? 'Bot quickplay enabled' : 'PvP only (no bots)'}
        </p>
      )}
      {(status === 'error' || status === 'timeout') && (
        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton className="px-3 py-2 text-xs" onClick={onRetry}>
            Retry queue
          </PrimaryButton>
          {status === 'error' && lastMode && (
            <PrimaryButton className="px-3 py-2 text-xs" onClick={onRetryDemo}>
              Retry as demo
            </PrimaryButton>
          )}
          {realMoneyMode && !lastMode && (
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
              Escrow off. Using demo credits.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
