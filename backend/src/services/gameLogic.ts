import type { Card, Match, UserProfile } from '../types.js'
import { store } from '../data/store.js'
import { customAlphabet } from 'nanoid'

const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const suits = ['♠', '♥', '♦', '♣']
const rankValue = Object.fromEntries(ranks.map((rank, index) => [rank, index])) as Record<string, number>
const nanoid = customAlphabet('1234567890abcdef', 8)

const drawUniqueCard = (used: Set<string>): Card => {
  let card: Card | undefined
  while (!card) {
    const rank = ranks[Math.floor(Math.random() * ranks.length)]!
    const suit = suits[Math.floor(Math.random() * suits.length)]!
    const code = `${rank}${suit}`
    if (!used.has(code)) {
      used.add(code)
      card = { rank, suit, code }
    }
  }
  return card
}

export const dealHand = (): Card[] => {
  const used = new Set<string>()
  return Array.from({ length: 3 }, () => drawUniqueCard(used))
}

type HandRank = {
  score: number
  label: string
}

const isFlush = (cards: Card[]) => cards.every((card) => card.suit === cards[0]!.suit)
const isStraight = (cards: Card[]) => {
  const sorted = cards
    .map((card) => rankValue[card.rank])
    .sort((a, b) => a - b)
  return sorted[2]! - sorted[0]! === 2 && new Set(sorted).size === 3
}
const isTriples = (cards: Card[]) => new Set(cards.map((card) => card.rank)).size === 1
const isPair = (cards: Card[]) => new Set(cards.map((card) => card.rank)).size === 2

export const evaluateHand = (cards: Card[]): HandRank => {
  const flush = isFlush(cards)
  const straight = isStraight(cards)
  if (flush && straight) return { score: 60 + highCardScore(cards), label: 'Straight Flush' }
  if (isTriples(cards)) return { score: 50 + highCardScore(cards), label: 'Three of a Kind' }
  if (straight) return { score: 40 + highCardScore(cards), label: 'Straight' }
  if (flush) return { score: 30 + highCardScore(cards), label: 'Flush' }
  if (isPair(cards)) return { score: 20 + pairScore(cards), label: 'Pair' }
  return { score: 10 + highCardScore(cards), label: 'High Card' }
}

const highCardScore = (cards: Card[]) =>
  cards
    .map((card) => rankValue[card.rank])
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

export const resolveMatch = async (match: Match) => {
  const playerCards = match.playerA.cards.length ? match.playerA.cards : dealHand()
  const opponentCards = match.playerB?.cards?.length ? match.playerB.cards : dealHand()
  match.playerA.cards = playerCards
  if (match.playerB) match.playerB.cards = opponentCards

  const playerRank = evaluateHand(playerCards)
  const opponentRank = evaluateHand(opponentCards)

  const playerScore = playerRank.score
  const opponentScore = opponentRank.score
  let winner: 'playerA' | 'playerB' = 'playerA'
  if (match.playerB && opponentScore > playerScore) {
    winner = 'playerB'
  }

  const summary = winner === 'playerA' ? 'You cleaned them out.' : 'Tough beat. Shuffle again.'
  const winnerWallet = winner === 'playerA' ? match.playerA.walletAddress : match.playerB?.walletAddress

  match.state = 'finished'
  match.winner = winnerWallet
  match.resultSummary = summary
  await store.saveMatch(match)
  await updateProfilesAfterMatch(match)
  return match
}

const updateProfilesAfterMatch = async (match: Match) => {
  const winnerWallet = match.winner
  const playerA = await store.getOrCreateProfile(match.playerA.walletAddress)
  const playerB = match.playerB ? await store.getOrCreateProfile(match.playerB.walletAddress) : undefined
  const participants = [playerA, playerB].filter(Boolean) as UserProfile[]
  for (const profile of participants) {
    const isWinner = winnerWallet === profile.walletAddress
    const xpGain = isWinner ? 200 : 100
    const eloDelta = isWinner ? 12 : -8
    let workingProfile = profile
    const creditsBefore = profile.credits
    if (isWinner && match.stake > 0) {
      const adjusted = await store.adjustCredits(profile.walletAddress, match.stake * 2)
      workingProfile = adjusted
      console.info('demo payout', {
        walletAddress: profile.walletAddress,
        stake: match.stake,
        creditsBefore,
        creditsAfter: adjusted.credits,
      })
    }

    const newXp = workingProfile.xp + xpGain
    let xp = newXp
    let level = workingProfile.level
    let xpToNext = workingProfile.xpToNextLevel
    while (xp >= xpToNext) {
      xp -= xpToNext
      level += 1
      xpToNext += 200
    }
    workingProfile.xp = xp
    workingProfile.level = level
    workingProfile.xpToNextLevel = xpToNext
    workingProfile.elo = Math.max(800, workingProfile.elo + eloDelta)
    workingProfile.stats.matches += 1
    if (isWinner) {
      workingProfile.stats.wins += 1
      workingProfile.stats.streak += 1
    } else {
      workingProfile.stats.losses += 1
      workingProfile.stats.streak = 0
    }
    await store.updateProfile(workingProfile)
  }
}

export const createMatchWithCards = async (stake: number, playerA: UserProfile, playerB: UserProfile) => {
  const match = await store.createMatch(stake, playerA, playerB)
  match.playerA.cards = dealHand()
  if (match.playerB) match.playerB.cards = dealHand()
  await store.saveMatch(match)
  return match
}

export const fakeTxHash = () => `0x${nanoid()}${nanoid()}`
