import type { FastifyInstance } from 'fastify'
import type { MatchmakingService } from '../services/matchmaking.js'
import { store } from '../data/store.js'

declare module 'fastify' {
  interface FastifyInstance {
    matchmaking: MatchmakingService
  }
}

export async function registerMatchRoutes(app: FastifyInstance) {
  app.post('/match/queue', async (request, reply) => {
    const body = request.body as { walletAddress?: string; stake?: number; botOpponent?: boolean }
    if (!body?.walletAddress || !body?.stake) {
      return reply.status(400).send({ error: 'walletAddress and stake are required' })
    }
    try {
      store.spendCredits(body.walletAddress, body.stake)
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message })
    }
    const result = app.matchmaking.queuePlayer(body.walletAddress, body.stake, {
      botOpponent: body.botOpponent,
    })
    if (result.status === 'queued') {
      store.reserveCreditHold(result.ticketId, body.walletAddress, body.stake)
    }
    return result
  })

  app.post('/match/cancel', async (request, reply) => {
    const body = request.body as { walletAddress?: string }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const removed = app.matchmaking.cancelQueue(body.walletAddress)
    return { cancelled: removed }
  })

  app.get('/match/:id', async (request, reply) => {
    const params = request.params as { id: string }
    const match = store.getMatch(params.id)
    if (!match) return reply.status(404).send({ error: 'Match not found' })
    return { match }
  })
}
