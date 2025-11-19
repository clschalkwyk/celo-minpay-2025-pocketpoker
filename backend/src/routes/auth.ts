import type { FastifyInstance } from 'fastify'
import { store } from '../data/store.js'

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/init', async (request, reply) => {
    const body = request.body as { walletAddress?: string }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const profile = store.getOrCreateProfile(body.walletAddress)
    return { profile }
  })
}
