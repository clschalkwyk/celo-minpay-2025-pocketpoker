import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildServer } from '../../server'
import { store } from '../../data/store'

let app: Awaited<ReturnType<typeof buildServer>>

describe('profile routes', () => {
  beforeAll(async () => {
    app = await buildServer()
  })

  beforeEach(async () => {
    await store.reset()
  })

  afterAll(async () => {
    await app.close()
  })

  it('prevents profile updates before five matches', async () => {
    const walletAddress = '0xPROFILE_LOCKED'
    await store.getOrCreateProfile(walletAddress)
    const res = await app.inject({
      method: 'POST',
      url: '/profile/update',
      payload: { walletAddress, username: 'NewName' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('updates username and avatar after unlock threshold', async () => {
    const walletAddress = '0xPROFILE_OPEN'
    const profile = await store.getOrCreateProfile(walletAddress)
    profile.stats.matches = 6
    await store.updateProfile(profile)
    const res = await app.inject({
      method: 'POST',
      url: '/profile/update',
      payload: { walletAddress, username: 'PocketHero', avatarUrl: 'https://avatar.vercel.sh/custom' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().profile.username).toBe('PocketHero')
    expect(res.json().profile.avatarUrl).toBe('https://avatar.vercel.sh/custom')
  })
})
