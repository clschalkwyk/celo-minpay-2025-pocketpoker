import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildServer } from '../../server'
import { store } from '../../data/store'

let app: Awaited<ReturnType<typeof buildServer>>

describe('matchmaking routes', () => {
  beforeAll(async () => {
    app = await buildServer()
  })

  beforeEach(async () => {
    await store.reset()
  })

  afterAll(async () => {
    await app.close()
  })

  it('queues player until opponent arrives (demo credits)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match/queue-demo',
      payload: { walletAddress: '0xAAA', stake: 1 },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.status).toBe('queued')
    expect(json.ticketId).toBeTruthy()
  })

  it('creates match when two demo players queue on same stake', async () => {
    await app.inject({ method: 'POST', url: '/match/queue-demo', payload: { walletAddress: '0xBBB', stake: 1 } })
    const res = await app.inject({
      method: 'POST',
      url: '/match/queue-demo',
      payload: { walletAddress: '0xCCC', stake: 1 },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.status).toBe('matched')
    expect(json.match).toMatchObject({ stake: 1, pot: 2 })
  })

  it('can spawn bot opponent for quick demo matches', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match/queue-demo',
      payload: { walletAddress: '0xDDD', stake: 2, botOpponent: true },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.status).toBe('matched')
    expect(json.match.playerB.username).toMatch(/CPU_/)
  })
  it('accepts escrow queue when txHash is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match/queue-escrow',
      payload: { walletAddress: '0xESCROW', stake: 1, txHash: '0xabc', botOpponent: true },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('matched')
  })

  it('resolves stale matches when fetched', async () => {
    const winnerWallet = '0xDEADBEEF'
    const loserWallet = '0xDEADFADE'
    const winner = await store.getOrCreateProfile(winnerWallet)
    const loser = await store.getOrCreateProfile(loserWallet)
    await store.spendCredits(winnerWallet, 1)
    await store.spendCredits(loserWallet, 1)

    const match = await store.createMatch(1, winner, loser)
    match.playerA.cards = [
      { rank: 'A', suit: '♠', code: 'A♠' },
      { rank: 'K', suit: '♦', code: 'K♦' },
      { rank: 'Q', suit: '♣', code: 'Q♣' },
    ]
    match.playerB!.cards = [
      { rank: '2', suit: '♠', code: '2♠' },
      { rank: '3', suit: '♦', code: '3♦' },
      { rank: '4', suit: '♣', code: '4♣' },
    ]
    match.createdAt = Date.now() - 10_000
    await store.saveMatch(match)

    const res = await app.inject({ method: 'GET', url: `/match/${match.id}` })
    expect(res.statusCode).toBe(200)
    const payload = res.json()
    expect(payload.match.state).toBe('finished')
    expect(payload.match.winner).toBe(winnerWallet)
    const refreshedWinner = await store.getOrCreateProfile(winnerWallet)
    expect(refreshedWinner.credits).toBe(51)
  })
})
