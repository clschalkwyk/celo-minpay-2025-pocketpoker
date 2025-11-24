import clsx from 'clsx'
import type { CreatorDeckSubmission } from '../../types'
import { PrimaryButton } from '../ui/PrimaryButton'

type CreatorDeckPreviewCardProps = {
  submission: CreatorDeckSubmission
  owned?: boolean
  isCreator?: boolean
  onEquip?: () => void
  onPurchase?: () => void
  purchaseDisabled?: boolean
  active?: boolean
  equipping?: boolean
}

const statusCopy: Record<CreatorDeckSubmission['status'], { label: string; className: string }> = {
  pending: {
    label: 'Pending review',
    className: 'bg-amber-500/10 text-amber-200 border border-amber-400/40',
  },
  approved: {
    label: 'Live',
    className: 'bg-pp-primary/15 text-pp-primary border border-pp-primary/40',
  },
  rejected: {
    label: 'Needs revision',
    className: 'bg-red-500/10 text-red-200 border border-red-400/40',
  },
}

export const CreatorDeckPreviewCard = ({
  submission,
  owned,
  isCreator,
  onEquip,
  onPurchase,
  purchaseDisabled,
  active,
  equipping,
}: CreatorDeckPreviewCardProps) => {
  const status = statusCopy[submission.status] ?? statusCopy.pending
  const preview = submission.previewImageUrl || '/deck_1.jpg'
  const rarity = submission.rarity ?? 'common'
  const price = submission.price ?? 1

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#050b17] via-[#0b1227] to-[#05081a] p-4 shadow-[0_20px_55px_rgba(5,8,22,0.8)]">
      <div className="absolute inset-0 bg-gradient-to-br from-pp-primary/10 via-transparent to-pp-secondary/10 blur-3xl opacity-60" />
      <div className="relative">
        <img
          src={preview}
          alt={submission.deckName}
          className="h-32 w-full rounded-2xl object-cover"
        />
        <div className={clsx('absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.4em]', status.className)}>
          {status.label}
        </div>
      </div>
      <div className="relative mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{submission.deckName}</p>
          {submission.price !== undefined && submission.price > 0 && (
            <span className="text-sm font-semibold text-pp-primary">R{submission.price}</span>
          )}
          <span className="text-xs uppercase tracking-[0.3em] text-gray-300">{rarity}</span>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-pp-highlight">By {submission.creatorName}</p>
        <p className="text-sm text-gray-300">{submission.description}</p>
        {active && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-pp-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-pp-primary">
            Equipped
          </div>
        )}
        {isCreator ? (
          owned ? (
            <PrimaryButton className="mt-2 text-sm" onClick={onEquip} disabled={equipping}>
              {equipping ? 'Equipping...' : 'Equip deck'}
            </PrimaryButton>
          ) : (
            <p className="mt-2 text-xs text-pp-highlight">Auto-unlocked on approval. Refresh profile.</p>
          )
        ) : owned ? (
          <PrimaryButton className="mt-2 text-sm" onClick={onEquip} disabled={equipping}>
            {equipping ? 'Equipping...' : 'Equip deck'}
          </PrimaryButton>
        ) : submission.status === 'approved' ? (
          <PrimaryButton className="mt-2 text-sm" onClick={onPurchase} disabled={purchaseDisabled}>
            {purchaseDisabled ? 'Processing...' : `Buy for R${price.toFixed(2)}`}
          </PrimaryButton>
        ) : null}
      </div>
    </div>
  )
}
