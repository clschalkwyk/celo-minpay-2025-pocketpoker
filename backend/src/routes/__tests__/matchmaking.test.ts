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

  it('queues player until opponent arrives', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/match/queue',
      payload: { walletAddress: '0xAAA', stake: 1 },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.status).toBe('queued')
    expect(json.ticketId).toBeTruthy()
  })

  it('creates match when two players queue on same stake', async () => {
    await app.inject({ method: 'POST', url: '/match/queue', payload: { walletAddress: '0xBBB', stake: 1 } })
    const res = await app.inject({
      method: 'POST',
      url: '/match/queue',
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
      url: '/match/queue',
      payload: { walletAddress: '0xDDD', stake: 2, botOpponent: true },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.status).toBe('matched')
    expect(json.match.playerB.username).toMatch(/CPU_/)
  })
})
