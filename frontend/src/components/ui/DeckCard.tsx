import clsx from 'clsx'
import { Palette, ShieldCheck } from 'lucide-react'
import type { DeckTheme } from '../../types'
import { PrimaryButton } from './PrimaryButton'

export type DeckCardProps = {
  deck: DeckTheme
  owned: boolean
  active: boolean
  onEquip?: (deckId: string) => void
  onPurchase?: (deck: DeckTheme) => void
  purchaseDisabled?: boolean
}

const rarityStyles: Record<DeckTheme['rarity'], string> = {
  common: 'text-gray-300',
  rare: 'text-sky-300',
  ranked: 'text-pp-primary',
  legendary: 'text-amber-300',
  mythic: 'text-fuchsia-300',
}

export const DeckCard = ({ deck, owned, active, onEquip, onPurchase, purchaseDisabled }: DeckCardProps) => {
  const preview = (deck as DeckTheme & { previewImageUrl?: string }).previewImageUrl ?? deck.previewImage
  const statusLabel =
    deck.status === 'pending' ? 'Pending review' : deck.status === 'live_soon' ? 'Live soon' : undefined
  const statusClasses = deck.status === 'pending' ? 'bg-amber-500/10 text-amber-200 border border-amber-400/30' : 'bg-sky-500/10 text-sky-100 border border-sky-400/30'
  return (
    <div
      className={clsx(
        'rounded-3xl border bg-white/5 p-4 transition hover:border-pp-primary/50',
        active ? 'border-pp-primary shadow-glow-green' : 'border-white/10',
      )}
    >
      <div className="relative">
        <img src={preview} alt={deck.name} className="h-32 w-full rounded-2xl object-cover" />
        {statusLabel && (
          <div className={clsx('absolute left-3 top-3 rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em]', statusClasses)}>
            {statusLabel}
          </div>
        )}
        {active && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-pp-primary/90 px-3 py-1 text-xs font-semibold text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            Equipped
          </div>
        )}
        {!owned && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 text-xs uppercase tracking-[0.3em] text-white">
            Locked
          </div>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{deck.name}</p>
          <span className={clsx('text-xs uppercase tracking-[0.3em]', rarityStyles[deck.rarity])}>{deck.rarity}</span>
        </div>
        {deck.creatorName && <p className="text-xs uppercase tracking-[0.3em] text-pp-highlight">By {deck.creatorName}</p>}
        <p className="text-sm text-gray-300">{deck.description}</p>
        {!owned ? (
          deck.price ? (
            <div className="space-y-2 text-sm text-pp-highlight">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-300">
                <Palette className="h-3 w-3" /> MiniPay drop · R{deck.price.toFixed(2)}
              </p>
              <PrimaryButton className="mt-1" onClick={() => onPurchase?.(deck)} disabled={purchaseDisabled}>
                {purchaseDisabled ? 'Processing...' : `Buy for R${deck.price.toFixed(2)}`}
              </PrimaryButton>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-pp-highlight">
              <Palette className="h-3 w-3" />
              {deck.unlockCondition}
            </p>
          )
        ) : (
          !active && (
            <PrimaryButton className="mt-1" onClick={() => onEquip?.(deck.id)}>
              Equip deck
            </PrimaryButton>
          )
        )}
      </div>
    </div>
  )
}
