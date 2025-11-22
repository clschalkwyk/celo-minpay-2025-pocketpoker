import type { Card, MatchState } from '../types'

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const
const rankValue = Object.fromEntries(ranks.map((rank, index) => [rank, index])) as Record<string, number>

const isFlush = (cards: Card[]) => cards.length === 3 && cards.every((card) => card.suit === cards[0]?.suit)
const isStraight = (cards: Card[]) => {
  if (cards.length !== 3) return false
  const values = cards
    .map((card) => rankValue[card.rank] ?? 0)
    .sort((a, b) => a - b)
  return values[2]! - values[0]! === 2 && new Set(values).size === 3
}
const isTriples = (cards: Card[]) => cards.length === 3 && new Set(cards.map((card) => card.rank)).size === 1
const isPair = (cards: Card[]) => cards.length === 3 && new Set(cards.map((card) => card.rank)).size === 2

const highCardScore = (cards: Card[]) =>
  cards
    .map((card) => rankValue[card.rank] ?? 0)
    .sort((a, b) => b - a)
    .reduce((total, value, index) => total + value / (index + 1), 0)

const pairScore = (cards: Card[]) => {
  const counts = new Map<string, number>()
  for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  let pairRank = ''
  let kickerRank = ''
  for (const [rank, count] of counts.entries()) {
    if (count === 2) pairRank = rank
    else kickerRank = rank
  }
  return (rankValue[pairRank] ?? 0) * 2 + (rankValue[kickerRank] ?? 0) / 10
}

const scoreHand = (cards: Card[]) => {
  if (cards.length !== 3) return { score: 0, label: 'Incomplete' }
  const flush = isFlush(cards)
  const straight = isStraight(cards)
  if (flush && straight) return { score: 60 + highCardScore(cards), label: 'Straight Flush' }
  if (isTriples(cards)) return { score: 50 + highCardScore(cards), label: 'Three of a Kind' }
  if (straight) return { score: 40 + highCardScore(cards), label: 'Straight' }
  if (flush) return { score: 30 + highCardScore(cards), label: 'Flush' }
  if (isPair(cards)) return { score: 20 + pairScore(cards), label: 'Pair' }
  return { score: 10 + highCardScore(cards), label: 'High Card' }
}

const summaryForWinner = (winner: 'you' | 'opponent') =>
  winner === 'you' ? 'You cleaned them out.' : 'Tough beat. Shuffle again.'

export const deriveLocalResult = (you: Card[], opponent: Card[]): MatchState['result'] | undefined => {
  if (you.length !== 3 || opponent.length !== 3) return undefined
  const yourScore = scoreHand(you)
  const opponentScore = scoreHand(opponent)
  const winner = opponentScore.score > yourScore.score ? 'opponent' : 'you'
  return {
    winner,
    summary: summaryForWinner(winner),
  }
}
