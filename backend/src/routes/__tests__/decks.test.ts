import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildServer } from '../../server'
import { store } from '../../data/store'

let app: Awaited<ReturnType<typeof buildServer>>

describe('deck routes', () => {
  beforeAll(async () => {
    app = await buildServer()
  })

  beforeEach(async () => {
    await store.reset()
  })

  afterAll(async () => {
    await app.close()
  })

  it('unlocks a deck for a profile', async () => {
    const walletAddress = '0xDECK'
    await app.inject({ method: 'POST', url: '/auth/init', payload: { walletAddress } })
    await store.reset()
    const res = await app.inject({
      method: 'POST',
      url: '/decks/unlock',
      payload: { walletAddress, deckId: 'deck-creator' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().profile.unlockedDeckIds).toContain('deck-creator')
  })

  it('equips an unlocked deck', async () => {
    const walletAddress = '0xDECK2'
    await store.getOrCreateProfile(walletAddress)
    const res = await app.inject({
      method: 'POST',
      url: '/decks/equip',
      payload: { walletAddress, deckId: 'deck-creator' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().profile.activeDeckId).toBe('deck-creator')
  })
})
