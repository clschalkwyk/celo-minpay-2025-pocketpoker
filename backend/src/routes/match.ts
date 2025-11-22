import type { FastifyBaseLogger, FastifyInstance, FastifyReply } from 'fastify'
import type { MatchmakingService } from '../services/matchmaking.js'
import { store } from '../data/store.js'
import { resolveMatch } from '../services/gameLogic.js'

declare module 'fastify' {
  interface FastifyInstance {
    matchmaking: MatchmakingService
  }
}

const MATCH_RESOLVE_DELAY_MS = Number(process.env.MATCH_RESOLVE_DELAY_MS ?? 2500)

export async function registerMatchRoutes(app: FastifyInstance) {
  const queuePlayer = async (walletAddress: string, stake: number, botOpponent?: boolean) =>
    app.matchmaking.queuePlayer(walletAddress, stake, { botOpponent })

  type DemoQueuePayload = {
    walletAddress?: string
    stake?: number
    botOpponent?: boolean
  }

  const handleDemoQueue = async (
    payload: DemoQueuePayload,
    reply: FastifyReply,
    log: FastifyBaseLogger,
  ) => {
    if (!payload?.walletAddress || !payload?.stake) {
      return reply.status(400).send({ error: 'walletAddress and stake are required' })
    }
    try {
      await store.spendCredits(payload.walletAddress, payload.stake)
      const updatedProfile = await store.getOrCreateProfile(payload.walletAddress)
      log.info(
        { walletAddress: payload.walletAddress, stake: payload.stake, credits: updatedProfile.credits },
        'demo stake deducted',
      )
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message })
    }
    const result = await queuePlayer(payload.walletAddress, payload.stake, payload.botOpponent)
    if (result.status === 'queued') {
      await store.reserveCreditHold(result.ticketId, payload.walletAddress, payload.stake)
    }
    return result
  }

  type EscrowQueuePayload = DemoQueuePayload & { txHash?: string }

  const handleEscrowQueue = async (
    payload: EscrowQueuePayload,
    reply: FastifyReply,
    log: FastifyBaseLogger,
  ) => {
    const body = payload
    if (!body?.walletAddress || !body?.stake || !body?.txHash) {
      return reply.status(400).send({ error: 'walletAddress, stake, and txHash are required' })
    }
    log.info({ walletAddress: body.walletAddress, stake: body.stake, txHash: body.txHash }, 'escrow stake confirmed')
    return queuePlayer(body.walletAddress, body.stake, body.botOpponent)
  }

  // legacy endpoint (demo credits)
  app.post('/match/queue', async (request, reply) =>
    handleDemoQueue(request.body as DemoQueuePayload, reply, request.log),
  )

  app.post('/match/queue-demo', async (request, reply) =>
    handleDemoQueue(request.body as DemoQueuePayload, reply, request.log),
  )

  app.post('/match/queue-escrow', async (request, reply) =>
    handleEscrowQueue(request.body as EscrowQueuePayload, reply, request.log),
  )

  app.post('/match/cancel', async (request, reply) => {
    const body = request.body as { walletAddress?: string }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const removed = await app.matchmaking.cancelQueue(body.walletAddress)
    return { cancelled: removed }
  })

  app.get('/match/:id', async (request, reply) => {
    const params = request.params as { id: string }
    let match = await store.getMatch(params.id)
    if (!match) return reply.status(404).send({ error: 'Match not found' })
    if (match.state !== 'finished' && Date.now() - match.createdAt >= MATCH_RESOLVE_DELAY_MS) {
      match = await resolveMatch(match)
    }
    return { match }
  })
}
