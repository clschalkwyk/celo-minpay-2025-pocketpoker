import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { store } from '../data/store.js'
import type { CreatorDeckSubmission, DeckTheme } from '../types.js'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? 'admin-demo-key'

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 2)

const requireAdmin = (request: FastifyRequest, reply: FastifyReply) => {
  const token = (request.headers['x-admin-key'] ?? request.headers['X-Admin-Key']) as string | undefined
  if (!token || token !== ADMIN_API_KEY) {
    void reply.status(401).send({ error: 'Unauthorized' })
    return false
  }
  return true
}

export async function registerMetaRoutes(app: FastifyInstance) {
  app.get('/decks', async () => ({ decks: store.getDecks() }))
  app.get('/missions', async (request, reply) => {
    const query = request.query as { walletAddress?: string }
    if (!query?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const missions = await store.getMissions(query.walletAddress)
    return { missions }
  })
  app.post('/missions/progress', async (request, reply) => {
    const body = request.body as {
      walletAddress?: string
      matchesPlayed?: number
      xpEarned?: number
    }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const missions = await store.recordMissionProgress(body.walletAddress, {
      matchesPlayed: body.matchesPlayed ?? 0,
      xpEarned: body.xpEarned ?? 0,
    })
    return { missions }
  })
  app.post('/missions/:id/claim', async (request, reply) => {
    const params = request.params as { id: string }
    const body = request.body as { walletAddress?: string }
    if (!body?.walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' })
    }
    const mission = await store.claimMission(body.walletAddress, params.id)
    if (!mission) {
      return reply.status(404).send({ error: 'Mission not found' })
    }
    if (mission.state !== 'claimed') {
      return reply.status(400).send({ error: 'Mission not ready to claim' })
    }
    const missions = await store.getMissions(body.walletAddress)
    return { mission, missions }
  })
  app.get('/leaderboard', async () => ({ leaderboard: store.getLeaderboard() }))
  app.post('/credits/spend', async (request, reply) => {
    const body = request.body as { walletAddress?: string; amount?: number }
    if (!body?.walletAddress || typeof body.amount !== 'number') {
      return reply.status(400).send({ error: 'walletAddress and amount are required' })
    }
    if (body.amount <= 0) {
      return reply.status(400).send({ error: 'amount must be positive' })
    }
    try {
      const profile = await store.spendCredits(body.walletAddress, body.amount)
      return { profile }
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message })
    }
  })

  app.post('/credits/refund', async (request, reply) => {
    const body = request.body as { walletAddress?: string; amount?: number }
    if (!body?.walletAddress || typeof body.amount !== 'number') {
      return reply.status(400).send({ error: 'walletAddress and amount are required' })
    }
    const profile = await store.adjustCredits(body.walletAddress, body.amount)
    return { profile }
  })
  app.get('/creator-decks', async () => ({ submissions: await store.listCreatorDecks() }))
  app.get('/admin/submissions', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const query = request.query as { status?: 'pending' | 'approved' | 'rejected' }
    let submissions = await store.listCreatorDecks()
    if (query?.status) {
      submissions = submissions.filter((submission: CreatorDeckSubmission) => submission.status === query.status)
    }
    return { submissions }
  })
  app.get('/admin/purchases', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    return { purchases: await store.listPurchases() }
  })
  app.get('/admin/stats', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const stats = await store.getAdminStats()
    return stats
  })
  app.post('/creator-decks', async (request, reply) => {
    const body = request.body as {
      deckName?: string
      creatorName?: string
      rarity?: 'common' | 'rare' | 'ranked' | 'legendary' | 'mythic'
      description?: string
      previewImageUrl?: string
    }
    if (!body?.deckName || !body?.creatorName || !body?.rarity || !body?.description || !body?.previewImageUrl) {
      return reply.status(400).send({ error: 'deckName, creatorName, rarity, description, and previewImageUrl are required' })
    }
    const submission = await store.submitCreatorDeck({
      deckName: body.deckName,
      creatorName: body.creatorName,
      rarity: body.rarity,
      description: body.description,
      previewImageUrl: body.previewImageUrl,
    })
    return { submission }
  })
  app.patch('/creator-decks/:id', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const params = request.params as { id: string }
    const raw = request.body as Record<string, unknown> | undefined
    const body = raw && typeof raw === 'object' ? raw : {}
    const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status')
    const hasNsfw = Object.prototype.hasOwnProperty.call(body, 'nsfwFlag')
    const hasNotes = Object.prototype.hasOwnProperty.call(body, 'reviewNotes')
    if (!hasStatus && !hasNsfw && !hasNotes) {
      return reply.status(400).send({ error: 'Provide status, nsfwFlag, or reviewNotes' })
    }
    const submission = await store.updateCreatorDeck(params.id, {
      status: hasStatus ? (body.status as CreatorDeckSubmission['status']) : undefined,
      reviewNotes: hasNotes ? (body.reviewNotes as string) : undefined,
      nsfwFlag: hasNsfw ? Boolean(body.nsfwFlag) : undefined,
      submittedAt: Date.now(),
    })
    if (!submission) {
      return reply.status(404).send({ error: 'Submission not found' })
    }
    return { submission }
  })

  app.post('/decks/equip', async (request, reply) => {
    const body = request.body as { walletAddress?: string; deckId?: string }
    if (!body?.walletAddress || !body?.deckId) {
      return reply.status(400).send({ error: 'walletAddress and deckId are required' })
    }
    const profile = await store.getOrCreateProfile(body.walletAddress)
    if (!profile.unlockedDeckIds.includes(body.deckId)) {
      return reply.status(400).send({ error: 'Deck not unlocked' })
    }
    profile.activeDeckId = body.deckId
    await store.updateProfile(profile)
    return { profile }
  })

  app.post('/decks/unlock', async (request, reply) => {
    const body = request.body as { walletAddress?: string; deckId?: string }
    if (!body?.walletAddress || !body?.deckId) {
      return reply.status(400).send({ error: 'walletAddress and deckId are required' })
    }
    const profile = await store.getOrCreateProfile(body.walletAddress)
    if (!profile.unlockedDeckIds.includes(body.deckId)) {
      profile.unlockedDeckIds.push(body.deckId)
      await store.updateProfile(profile)
    }
    return { profile }
  })

  app.post('/decks/purchase', async (request, reply) => {
    const body = request.body as { walletAddress?: string; deckId?: string; txHash?: string }
    if (!body?.walletAddress || !body?.deckId) {
      return reply.status(400).send({ error: 'walletAddress and deckId are required' })
    }
    const deck = store.getDecks().find((item: DeckTheme) => item.id === body.deckId)
    if (!deck) {
      return reply.status(404).send({ error: 'Deck not found' })
    }
    const price = deck.price ?? 0
    const platformFee = Number(((price * PLATFORM_FEE_PERCENT) / 100).toFixed(2))
    const creatorShare = Number((price - platformFee).toFixed(2))
    const profile = await store.getOrCreateProfile(body.walletAddress)
    if (!profile.unlockedDeckIds.includes(body.deckId)) {
      profile.unlockedDeckIds.push(body.deckId)
      await store.updateProfile(profile)
    }
    const purchase = await store.recordPurchase({
      deckId: deck.id,
      deckName: deck.name,
      creatorName: deck.creatorName,
      buyer: body.walletAddress,
      price,
      platformFee,
      creatorShare,
      txHash: body.txHash,
    })
    return { profile, purchase }
  })
}
