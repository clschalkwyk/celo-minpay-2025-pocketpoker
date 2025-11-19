import { AlertTriangle, LoaderCircle, Shield } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useUIStore } from '../../hooks/useUIStore'
import { useMatch } from '../../hooks/useMatch'
import { SecondaryButton } from '../ui/SecondaryButton'
import type { MatchQueueStatus } from '../../providers/MatchProvider'

export const MatchmakingModal = () => {
  const { isMatchmakingOpen, matchmakingStake } = useUIStore()
  const { cancelMatch, queueStatus } = useMatch()

  const statusCopy: Record<MatchQueueStatus, { headline: string; body: string }> = {
    idle: { headline: 'Preparing matchmaking...', body: 'Setting up your stake.' },
    funding: { headline: 'Locking stake...', body: 'MiniPay escrow is securing your funds.' },
    searching: { headline: 'Contacting queue...', body: 'Syncing with the PocketPoker arena.' },
    waiting: { headline: 'Still searching...', body: 'No opponent yet. We will refund if none join soon.' },
    timeout: { headline: 'No opponent found', body: 'Stake returned. Tap below to go back to the lobby.' },
    error: { headline: 'Matchmaking failed', body: 'Something went wrong. Please try again.' },
  }

  const copy = statusCopy[queueStatus]
  const isErrorState = queueStatus === 'timeout' || queueStatus === 'error'
  const actionLabel = isErrorState ? 'Dismiss' : 'Cancel & Refund'

  return (
    <Modal isOpen={isMatchmakingOpen} onClose={cancelMatch}>
      <div className="flex flex-col items-center gap-4 text-center">
        {isErrorState ? <AlertTriangle className="h-12 w-12 text-red-400" /> : <LoaderCircle className="h-12 w-12 animate-spin text-pp-primary" />}
        <div className="space-y-1">
          <p className="text-lg font-semibold">{copy.headline}</p>
          <p className="text-sm text-gray-400">{copy.body}</p>
          <p className="text-xs text-gray-500">Stake: R{matchmakingStake.toFixed(2)}</p>
        </div>
        <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
          <div>
            <p className="text-sm text-gray-300">{isErrorState ? 'Status' : 'Escrow ready'}</p>
            <p className="text-xs text-gray-500">{isErrorState ? 'Manual action required' : 'MiniPay • Secure stake'}</p>
          </div>
          <Shield className="h-6 w-6 text-pp-primary" />
        </div>
        <SecondaryButton onClick={cancelMatch} disabled={queueStatus === 'funding'}>
          {actionLabel}
        </SecondaryButton>
      </div>
    </Modal>
  )
}
