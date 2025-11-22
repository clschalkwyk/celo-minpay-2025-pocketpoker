import clsx from 'clsx'
import type { Card } from '../../types'

const deckSkins: Record<
  string,
  {
    background: string
    border: string
    glow: string
    texture?: string
  }
> = {
  'deck-midnight': {
    background: 'linear-gradient(135deg, #05040a 0%, #1c1b2a 100%)',
    border: '#8b7bd8',
    glow: 'rgba(139, 123, 216, 0.45)',
    texture: '/deck_1.jpg',
  },
  'deck-ndebele': {
    background: 'linear-gradient(135deg, #38120b 0%, #d98524 100%)',
    border: '#facc15',
    glow: 'rgba(250, 204, 21, 0.4)',
    texture: '/deck_3.jpg',
  },
  'deck-cyber': {
    background: 'linear-gradient(135deg, #01211f 0%, #00c6af 100%)',
    border: '#00f5c9',
    glow: 'rgba(0, 245, 201, 0.45)',
    texture: '/deck_4.jpg',
  },
  'deck-sunrise': {
    background: 'linear-gradient(135deg, #30110a 0%, #f97316 100%)',
    border: '#fdba74',
    glow: 'rgba(253, 186, 116, 0.45)',
    texture: '/deck_2.jpg',
  },
  'deck-creator': {
    background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    border: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.45)',
    texture: '/deck_5.jpg',
  },
  default: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    border: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.4)',
  },
}

export type CardProps = {
  card: Card
  revealed?: boolean
  ready?: boolean
  isWinner?: boolean
  deckId?: string
}

export const CardTile = ({ card, revealed = true, ready, isWinner, deckId }: CardProps) => {
  const theme = deckSkins[deckId ?? ''] ?? deckSkins.default
  return (
    <div
      className={clsx(
        'relative h-20 w-14 sm:h-24 sm:w-16 overflow-hidden rounded-xl border text-center text-white shadow-lg transition-all duration-300',
        ready ? 'animate-deal-card animate-card-pulse' : 'opacity-60',
        revealed ? 'animate-card-flip' : 'card-face-hidden',
        isWinner && 'scale-105',
      )}
      style={{
        backgroundImage: theme.texture ? undefined : theme.background,
        borderColor: isWinner ? theme.border : `${theme.border}66`,
        boxShadow: isWinner ? `0 0 20px ${theme.glow}` : undefined,
      }}
    >
      {theme.texture && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${theme.texture})` }}
        ></div>
      )}
      <div className={clsx('absolute inset-0 bg-black/30 transition', revealed ? 'opacity-40' : 'opacity-70')} />
      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        {revealed ? (
          <>
            <span className="text-2xl font-semibold drop-shadow">{card.rank}</span>
            <span className="text-xl">{card.suit}</span>
          </>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.3em] text-gray-200">Hidden</span>
        )}
      </div>
    </div>
  )
}
