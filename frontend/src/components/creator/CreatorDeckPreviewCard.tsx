import clsx from 'clsx'
import type { CreatorDeckSubmission } from '../../types'

type CreatorDeckPreviewCardProps = {
  submission: CreatorDeckSubmission
}

const statusCopy: Record<CreatorDeckSubmission['status'], { label: string; className: string }> = {
  pending: {
    label: 'Pending review',
    className: 'bg-amber-500/10 text-amber-200 border border-amber-400/40',
  },
  approved: {
    label: 'Live soon',
    className: 'bg-sky-500/10 text-sky-100 border border-sky-400/40',
  },
  rejected: {
    label: 'Needs revision',
    className: 'bg-red-500/10 text-red-200 border border-red-400/40',
  },
}

export const CreatorDeckPreviewCard = ({ submission }: CreatorDeckPreviewCardProps) => {
  const status = statusCopy[submission.status]
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="relative">
        <img
          src={submission.previewImageUrl}
          alt={submission.deckName}
          className="h-32 w-full rounded-2xl object-cover"
        />
        <div className={clsx('absolute left-3 top-3 rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em]', status.className)}>
          {status.label}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{submission.deckName}</p>
          <span className="text-xs uppercase tracking-[0.3em] text-gray-300">{submission.rarity}</span>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-pp-highlight">By {submission.creatorName}</p>
        <p className="text-sm text-gray-300">{submission.description}</p>
      </div>
    </div>
  )
}
