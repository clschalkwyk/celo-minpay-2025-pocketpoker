import type { FastifyBaseLogger, FastifyInstance, FastifyReply } from 'fastify'
import { randomBytes } from 'node:crypto'
import type { MatchmakingService } from '../services/matchmaking.js'
import { store } from '../data/store.js'
import { createMatchWithCards, resolveMatch } from '../services/gameLogic.js'
import type { Match } from '../types.js'
declare module 'fastify' {
  interface FastifyInstance {
    matchmaking: MatchmakingService
  }
}

const MATCH_RESOLVE_DELAY_MS = Number(process.env.MATCH_RESOLVE_DELAY_MS ?? 2500)
const MATCH_STALE_MS = Number(process.env.MATCH_STALE_MS ?? 120_000)
const MATCH_READY_TIMEOUT_MS = Number(process.env.MATCH_READY_TIMEOUT_MS ?? 5000)
// Dynamo matchmaking now reuses the main store (Memory or Dynamo) via MatchmakingService; keep flag disabled to avoid old table schema issues.
const useDynamoQueue = false

export async function registerMatchRoutes(app: FastifyInstance) {
  const queuePlayer = async (walletAddress: string, stake: number, botOpponent?: boolean, escrowId?: string) =>
    app.matchmaking.queuePlayer(walletAddress, stake, { botOpponent, escrowId })

  const attachDeckPreviews = (match: Match) => {
    const decks = store.getDecks()
    const lookupPreview = (deckId: string) => {
      const deck = decks.find((item) => item.id === deckId)
      if (deck?.previewImageUrl) return deck.previewImageUrl
      if (deckId.includes('creator')) return '/deck_5.jpg'
      return undefined
    }
    match.playerA.deckPreviewUrl = match.playerA.deckPreviewUrl ?? lookupPreview(match.playerA.deckId)
    if (match.playerB) {
      match.playerB.deckPreviewUrl = match.playerB.deckPreviewUrl ?? lookupPreview(match.playerB.deckId)
    }
  }

  const applyReadyTimeout = async (match: Match) => {
    if (match.escrowId) return match
    const elapsed = Date.now() - match.createdAt
    if (elapsed < MATCH_READY_TIMEOUT_MS) return match
    let changed = false
    if (!match.playerA.ready) {
      match.playerA.ready = true
      changed = true
    }
    if (match.playerB && !match.playerB.ready) {
      match.playerB.ready = true
      changed = true
    }
    if (changed) {
      await store.saveMatch(match)
    }
    return match
  }

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
    const spendStake = async () => {
      await store.spendCredits(payload.walletAddress!, payload.stake!)
      const updatedProfile = await store.getOrCreateProfile(payload.walletAddress!)
      log.info(
        { walletAddress: payload.walletAddress, stake: payload.stake, credits: updatedProfile.credits },
        'demo stake deducted',
      )
    }
    try {
      await spendStake()
      const result = await queuePlayer(payload.walletAddress, payload.stake, payload.botOpponent)
      if (result.status === 'queued') {
        await store.reserveCreditHold(result.ticketId, payload.walletAddress, payload.stake)
      }
      if (result.status === 'matched') {
        attachDeckPreviews(result.match)
      }
      return result
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message })
    }
  }

  type EscrowQueuePayload = DemoQueuePayload & { txHash?: string; matchId?: string }

  const handleEscrowQueue = async (
    payload: EscrowQueuePayload,
    reply: FastifyReply,
    log: FastifyBaseLogger,
  ) => {
    const body = payload
    if (!body?.walletAddress || !body?.stake) {
      return reply.status(400).send({ error: 'walletAddress and stake are required' })
    }
    const escrowId = body.matchId && body.matchId.startsWith('0x') ? body.matchId : `0x${randomBytes(32).toString('hex')}`
    log.info({ walletAddress: body.walletAddress, stake: body.stake, txHash: body.txHash, matchId: escrowId }, 'escrow queue request')
    log.info({ walletAddress: body.walletAddress, stake: body.stake }, 'escrow queue confirmed (stake pending)')
    const queued = await queuePlayer(body.walletAddress, body.stake, body.botOpponent, escrowId)
    if (queued.status === 'matched' && queued.match) {
      attachDeckPreviews(queued.match)
    }
    return queued
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
    const body = request.body as { walletAddress?: string; ticketId?: string }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const removed = await app.matchmaking.cancelQueue(body.walletAddress)
    return { cancelled: removed }
  })

  app.get('/match/queue-status', async () => {
    const status = await store.getQueueStatus()
    return { status }
  })

  const isStaleMatch = (match: Match) =>
    match.state === 'finished' ||
    match.state === 'cancelled' ||
    Date.now() - match.createdAt > MATCH_STALE_MS

  app.get('/match/by-wallet/:walletAddress', async (request, reply) => {
    const params = request.params as { walletAddress?: string }
    if (!params.walletAddress) return reply.status(400).send({ error: 'walletAddress is required' })
    const match = await store.findMatchForWallet(params.walletAddress)
    if (!match) return reply.status(404).send({ error: 'Match not found' })
    const updated = await applyReadyTimeout(match)
    if (isStaleMatch(updated)) {
      return reply.status(404).send({ error: 'Match not found' })
    }
    if (updated.state !== 'finished' && Date.now() - updated.createdAt >= MATCH_RESOLVE_DELAY_MS) {
      const resolved = await resolveMatch(updated)
      attachDeckPreviews(resolved)
      return { match: resolved }
    }
    attachDeckPreviews(updated)
    return { match: updated }
  })

  app.get('/match/by-ticket/:ticketId', async (request, reply) => {
    const params = request.params as { ticketId?: string }
    if (!params.ticketId) return reply.status(400).send({ error: 'ticketId is required' })
    const match = await store.findMatchForTicket(params.ticketId)
    if (!match) return reply.status(404).send({ error: 'Match not found' })
    const updated = await applyReadyTimeout(match)
    if (isStaleMatch(updated)) {
      await store.clearTicketMatch(params.ticketId)
      return reply.status(404).send({ error: 'Match not found' })
    }
    attachDeckPreviews(updated)
    return { match: updated }
  })

  app.get('/match/:id', async (request, reply) => {
    const params = request.params as { id: string }
    let match = await store.getMatch(params.id)
    if (!match) return reply.status(404).send({ error: 'Match not found' })
    match = await applyReadyTimeout(match)
    if (match.state !== 'finished' && Date.now() - match.createdAt >= MATCH_RESOLVE_DELAY_MS) {
      match = await resolveMatch(match)
    }
    attachDeckPreviews(match)
    return { match }
  })

  app.post('/match/:id/ready', async (request, reply) => {
    const params = request.params as { id: string }
    const body = request.body as { walletAddress?: string }
    if (!body?.walletAddress) return reply.status(400).send({ error: 'walletAddress is required' })
    let match = await store.markPlayerReady(params.id, body.walletAddress)
    if (!match) return reply.status(404).send({ error: 'Match not found' })

    if (match.playerA.ready && match.playerB?.ready) {
      match = await resolveMatch(match)
    }

    match = await applyReadyTimeout(match)
    attachDeckPreviews(match)
    return { match }
  })

}
