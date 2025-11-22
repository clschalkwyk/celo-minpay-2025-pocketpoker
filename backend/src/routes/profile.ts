import type { FastifyInstance } from 'fastify'
import { store } from '../data/store.js'

const MATCHES_REQUIRED_FOR_CUSTOMIZATION = 5
const MIN_NAME_LENGTH = 3
const MAX_NAME_LENGTH = 20
const namePattern = /^[a-zA-Z0-9_ ]+$/

const sanitizeName = (value: string) => value.trim().replace(/\s+/g, ' ')

const isValidAvatarUrl = (value: string) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export async function registerProfileRoutes(app: FastifyInstance) {
  app.post('/profile/update', async (request, reply) => {
    const body = request.body as { walletAddress?: string; username?: string; avatarUrl?: string }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const profile = await store.getOrCreateProfile(body.walletAddress)
    if (profile.stats.matches < MATCHES_REQUIRED_FOR_CUSTOMIZATION) {
      return reply.status(403).send({ error: `Play ${MATCHES_REQUIRED_FOR_CUSTOMIZATION} matches to unlock profile edits.` })
    }

    if (typeof body.username !== 'string' && typeof body.avatarUrl !== 'string') {
      return reply.status(400).send({ error: 'Provide username or avatarUrl to update.' })
    }

    const updated = { ...profile }
    if (typeof body.username === 'string') {
      const username = sanitizeName(body.username)
      if (!username || username.length < MIN_NAME_LENGTH || username.length > MAX_NAME_LENGTH || !namePattern.test(username)) {
        return reply
          .status(400)
          .send({ error: `Username must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters and use letters, numbers, spaces, or underscores.` })
      }
      updated.username = username
    }

    if (typeof body.avatarUrl === 'string') {
      const trimmed = body.avatarUrl.trim()
      if (!trimmed || trimmed.length > 300 || !isValidAvatarUrl(trimmed)) {
        return reply.status(400).send({ error: 'Provide a valid avatar URL (http/https).' })
      }
      updated.avatarUrl = trimmed
    }

    await store.updateProfile(updated)
    return { profile: updated }
  })

  app.post('/profile/reset', async (request, reply) => {
    const body = request.body as { walletAddress?: string }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const profile = await store.resetProfile(body.walletAddress)
    return { profile }
  })
}
