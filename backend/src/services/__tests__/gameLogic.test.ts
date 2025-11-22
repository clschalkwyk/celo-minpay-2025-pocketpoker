import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Card, Match } from '../../types'
import { evaluateHand, resolveMatch } from '../gameLogic'
import { store } from '../../data/store'

const makeCards = (codes: string[]): Card[] =>
  codes.map((code) => ({
    rank: code.slice(0, -1),
    suit: code.slice(-1),
    code,
  }))

describe('evaluateHand', () => {
  it('scores straight flush highest', () => {
    const straightFlush = makeCards(['10♠', 'J♠', 'Q♠'])
    const pair = makeCards(['A♠', 'A♥', '3♣'])

    expect(evaluateHand(straightFlush).score).toBeGreaterThan(evaluateHand(pair).score)
  })

  it('detects pairs vs high card', () => {
    const pair = makeCards(['9♠', '9♥', '4♦'])
    const high = makeCards(['K♠', 'J♦', '7♥'])
    expect(evaluateHand(pair).score).toBeGreaterThan(evaluateHand(high).score)
  })
})

const withSuit = (codes: string[]): Card[] =>
  codes.map((code) => ({ rank: code.slice(0, -1), suit: code.slice(-1), code }))

describe('resolveMatch', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    await store.reset()
  })

  it('awards stake winnings back to credits', async () => {
    const winnerAddress = '0xWinner'
    const loserAddress = '0xLoser'
    const winnerProfile = await store.getOrCreateProfile(winnerAddress)
    const loserProfile = await store.getOrCreateProfile(loserAddress)
    winnerProfile.credits = 100
    loserProfile.credits = 100
    await store.updateProfile(winnerProfile)
    await store.updateProfile(loserProfile)
    await store.spendCredits(winnerAddress, 5)
    await store.spendCredits(loserAddress, 5)

    const match = (await store.createMatch(5, winnerProfile, loserProfile)) as Match
    match.playerA.cards = withSuit(['A♠', 'K♦', 'Q♣'])
    match.playerB!.cards = withSuit(['2♠', '3♦', '4♣'])

    await resolveMatch(match)

    const refreshedWinner = await store.getOrCreateProfile(winnerAddress)
    expect(refreshedWinner.credits).toBe(105)
  })

  it('persists credit payouts when adjustCredits returns a cloned profile', async () => {
    const winnerAddress = '0xCloneWinner'
    const loserAddress = '0xCloneLoser'
    const winnerProfile = await store.getOrCreateProfile(winnerAddress)
    const loserProfile = await store.getOrCreateProfile(loserAddress)
    winnerProfile.credits = 100
    loserProfile.credits = 100
    await store.updateProfile(winnerProfile)
    await store.updateProfile(loserProfile)
    await store.spendCredits(winnerAddress, 5)
    await store.spendCredits(loserAddress, 5)

    const originalAdjust = store.adjustCredits.bind(store)
    vi.spyOn(store, 'adjustCredits').mockImplementation(async (walletAddress, amount) => {
      const updated = await originalAdjust(walletAddress, amount)
      return {
        ...updated,
        stats: { ...updated.stats },
      }
    })

    const match = (await store.createMatch(5, winnerProfile, loserProfile)) as Match
    match.playerA.cards = withSuit(['A♠', 'K♦', 'Q♣'])
    match.playerB!.cards = withSuit(['2♠', '3♦', '4♣'])

    await resolveMatch(match)

    const refreshedWinner = await store.getOrCreateProfile(winnerAddress)
    expect(refreshedWinner.credits).toBe(105)
  })
})
