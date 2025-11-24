import type { Card } from '../../types'
import { CardTile } from './Card'

export const CardRow = ({
  cards,
  revealed,
  ready,
  isWinner,
  deckId,
  deckPreviewUrl,
}: {
  cards: Card[]
  revealed: boolean
  ready: boolean
  isWinner?: boolean
  deckId?: string
  deckPreviewUrl?: string
}) => (
  <div className="flex items-center justify-center gap-3">
    {cards.map((card) => (
      <CardTile
        key={card.code}
        card={card}
        revealed={revealed}
        ready={ready}
        isWinner={isWinner}
        deckId={deckId}
        deckPreviewUrl={deckPreviewUrl}
      />
    ))}
  </div>
)
