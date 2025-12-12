import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { store } from '../data/store.js'
import { escrowService } from '../services/escrow.js'
import type { CreatorDeckSubmission, DeckTheme, WalletAddress } from '../types.js'

const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? 'admin-demo-key'

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 2)
const uploadBucket = process.env.ASSET_UPLOAD_BUCKET
const uploadRegion = process.env.ASSET_UPLOAD_REGION || process.env.AWS_REGION || 'us-east-1'
const publicBaseUrl =
  process.env.ASSET_PUBLIC_BASE_URL ||
  (uploadBucket ? `https://${uploadBucket}.s3.${uploadRegion}.amazonaws.com` : undefined)
const s3Client = uploadBucket
  ? new S3Client({
      region: uploadRegion,
    })
  : undefined

const requireAdmin = (request: FastifyRequest, reply: FastifyReply) => {
  const token = (request.headers['x-admin-key'] ?? request.headers['X-Admin-Key']) as string | undefined
  if (!token || token !== ADMIN_API_KEY) {
    void reply.status(401).send({ error: 'Unauthorized' })
    return false
  }
  return true
}

const decodeDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return undefined
  const contentType = match[1]!
  const base64 = match[2]!
  return { contentType, buffer: Buffer.from(base64, 'base64') }
}

const inferExtension = (contentType?: string, fileName?: string) => {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  if (fileName) {
    const ext = extname(fileName)
    if (ext) return ext
  }
  if (contentType && map[contentType]) return map[contentType]
  return '.png'
}

const uploadImageFromDataUrl = async (payload: {
  dataUrl: string
  fileName?: string
  contentType?: string
}): Promise<{ url: string } | { error: string; detail?: string }> => {
  if (!s3Client || !uploadBucket || !publicBaseUrl) {
    return { error: 'Upload disabled. Configure ASSET_UPLOAD_BUCKET/REGION/PUBLIC_BASE_URL.' }
  }
  const decoded = decodeDataUrl(payload.dataUrl)
  if (!decoded) {
    return { error: 'Invalid image data' }
  }
  const contentType = payload.contentType || decoded.contentType
  const extension = inferExtension(contentType, payload.fileName)
  const key = `creator-decks/${randomUUID().replace(/-/g, '')}${extension}`
  if (decoded.buffer.length > 5 * 1024 * 1024) {
    return { error: 'Image too large (max 5MB)' }
  }
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: uploadBucket,
        Key: key,
        Body: decoded.buffer,
        ContentType: contentType || 'image/png',
      }),
    )
    return { url: `${publicBaseUrl}/${key}` }
  } catch (err) {
    return { error: 'Unable to upload image', detail: (err as Error)?.message }
  }
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
  app.get('/leaderboard', async () => ({ leaderboard: await store.getLeaderboard() }))
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
  app.post('/admin/payout-pending', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const pending = await store.listFinishedEscrowMatchesPendingPayout()
    const results: Array<{ matchId: string; escrowId?: string; txHash?: string; error?: string }> = []

    for (const match of pending) {
      if (!match.escrowId || !match.winner) {
        results.push({ matchId: match.id, escrowId: match.escrowId, error: 'missing escrowId or winner' })
        continue
      }
      try {
        const txHash = await escrowService.payoutMatch(match.escrowId, match.winner)
        if (!txHash) {
          results.push({
            matchId: match.id,
            escrowId: match.escrowId,
            error: 'payout did not return txHash (check private key/RPC)',
          })
          continue
        }
        await store.markPayoutComplete(match.id, txHash)
        results.push({ matchId: match.id, escrowId: match.escrowId, txHash })
      } catch (err) {
        results.push({
          matchId: match.id,
          escrowId: match.escrowId,
          error: (err as Error)?.message ?? 'payout failed',
        })
      }
    }

    return { processed: results.length, results }
  })

  app.post('/admin/reset-payout', async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const body = request.body as { matchId?: string }
    if (!body?.matchId) {
      return reply.status(400).send({ error: 'matchId is required' })
    }
    const match = await store.getMatch(body.matchId)
    if (!match) {
      return reply.status(404).send({ error: 'Match not found' })
    }
    match.payoutState = undefined
    match.payoutTxHash = undefined
    match.payoutSettledAt = undefined
    await store.saveMatch(match)
    return { reset: true, matchId: match.id }
  })
  app.post('/creator-decks', async (request, reply) => {
    const body = request.body as {
      deckName?: string
      creatorName?: string
      creatorWallet?: WalletAddress
      rarity?: 'common' | 'rare' | 'ranked' | 'legendary' | 'mythic'
      description?: string
      previewImageUrl?: string
      imageData?: string
      fileName?: string
      contentType?: string
    }
    if (!body?.deckName || !body?.creatorName || !body?.creatorWallet || !body?.rarity || !body?.description) {
      return reply.status(400).send({
        error: 'deckName, creatorName, creatorWallet, rarity, and description are required',
      })
    }
    if (!body.previewImageUrl && !body.imageData) {
      return reply.status(400).send({ error: 'Provide previewImageUrl or imageData' })
    }

    let previewImageUrl = body.previewImageUrl
    if (!previewImageUrl && body.imageData) {
      const uploadResult = await uploadImageFromDataUrl({
        dataUrl: body.imageData,
        fileName: body.fileName,
        contentType: body.contentType,
      })
      if ('error' in uploadResult) {
        return reply.status(400).send(uploadResult)
      }
      previewImageUrl = uploadResult.url
    }

    if (!previewImageUrl) {
      return reply.status(500).send({ error: 'Unable to process preview image' })
    }

    const submission = await store.submitCreatorDeck({
      deckName: body.deckName,
      creatorName: body.creatorName,
      rarity: body.rarity,
      description: body.description,
      previewImageUrl,
      creatorWallet: body.creatorWallet,
    })
    return { submission }
  })
  const handleCreatorDeckUpdate = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return
    const params = request.params as { id: string }
    const rawBody = request.body as unknown
    let body: Record<string, unknown> = {}
    try {
      if (typeof rawBody === 'string') {
        body = JSON.parse(rawBody) as Record<string, unknown>
      } else if (rawBody && typeof rawBody === 'object') {
        body = rawBody as Record<string, unknown>
      }
    } catch (err) {
      request.log.error({ err, rawBody }, 'creator-deck.patch.parse_error')
      return reply.status(400).send({ error: 'Invalid JSON body' })
    }
    const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status')
    const hasNsfw = Object.prototype.hasOwnProperty.call(body, 'nsfwFlag')
    const hasNotes = Object.prototype.hasOwnProperty.call(body, 'reviewNotes')
    const hasPrice = Object.prototype.hasOwnProperty.call(body, 'price')
    const query = request.query as { status?: string; nsfwFlag?: string; reviewNotes?: string }
    const adminKeyUsed = (request.headers['x-admin-key'] ?? request.headers['X-Admin-Key']) as string | undefined
    const desiredStatus = (hasStatus ? (body.status as CreatorDeckSubmission['status']) : query?.status?.trim()) as
      | CreatorDeckSubmission['status']
      | undefined
    const nsfwFlag =
      hasNsfw ? Boolean(body.nsfwFlag) : query?.nsfwFlag === 'true' ? true : query?.nsfwFlag === 'false' ? false : undefined
    const reviewNotes = hasNotes ? (body.reviewNotes as string) : query?.reviewNotes
    const desiredPrice = hasPrice ? Number(body.price) : undefined

    if (!desiredStatus && !hasPrice) {
      return reply.status(400).send({ error: 'status or price is required' })
    }

    request.log.info(
      {
        id: params.id,
        payload: body,
        desiredStatus: hasStatus ? (body.status as CreatorDeckSubmission['status']) : undefined,
        nsfwFlag: hasNsfw ? Boolean(body.nsfwFlag) : undefined,
        reviewNotes: hasNotes ? (body.reviewNotes as string) : undefined,
        desiredPrice,
        adminKeyUsed,
      },
      'creator-deck.patch.request',
    )

    let submission = await store.updateCreatorDeck(params.id, {
      status: hasStatus ? (body.status as CreatorDeckSubmission['status']) : undefined,
      reviewNotes: hasNotes ? (body.reviewNotes as string) : undefined,
      nsfwFlag: hasNsfw ? Boolean(body.nsfwFlag) : undefined,
      reviewedAt: hasStatus ? Date.now() : undefined,
      reviewedBy: hasStatus ? adminKeyUsed : undefined,
      price: desiredPrice, // Pass price to update
    })
    if (!submission) {
      request.log.error({ id: params.id }, 'creator-deck.patch.not_found')
      return reply.status(404).send({ error: 'Submission not found' })
    }
    // If store returned without the requested status, force it once more.
    if (desiredStatus && submission.status !== desiredStatus) {
      const forced = await store.updateCreatorDeck(params.id, {
        status: desiredStatus,
        reviewNotes,
        nsfwFlag,
        reviewedAt: submission.reviewedAt ?? Date.now(),
        reviewedBy: submission.reviewedBy ?? adminKeyUsed,
      })
      if (forced) {
        submission = forced
        request.log.warn({ id: params.id, forcedStatus: desiredStatus }, 'creator-deck.patch.force_status')
      } else {
        request.log.error({ id: params.id, desiredStatus }, 'creator-deck.patch.force_status_failed')
      }
      submission.status = desiredStatus
    }
    // Ensure response echoes the desired status if provided
    const responseSubmission = {
      ...submission,
      status: desiredStatus ?? submission.status ?? 'pending',
      nsfwFlag: typeof submission.nsfwFlag === 'boolean' ? submission.nsfwFlag : hasNsfw ? Boolean(body.nsfwFlag) : false,
      reviewNotes: submission.reviewNotes ?? (hasNotes ? (body.reviewNotes as string) : undefined),
      price: submission.price ?? desiredPrice, // Reflect the updated price
    }

    request.log.info(
      {
        id: submission.id,
        finalStatus: responseSubmission.status,
        nsfwFlag: responseSubmission.nsfwFlag,
        reviewNotes: responseSubmission.reviewNotes,
        price: responseSubmission.price,
      },
      'creator-deck.patch.response',
    )
    return {
      submission: responseSubmission,
    }
  }

  app.patch('/creator-decks/:id', handleCreatorDeckUpdate)
  app.post('/creator-decks/:id/status', handleCreatorDeckUpdate)

  app.post('/decks/equip', async (request, reply) => {
    const body = request.body as { walletAddress?: string; deckId?: string }
    if (!body?.walletAddress || !body?.deckId) {
      return reply.status(400).send({ error: 'walletAddress and deckId are required' })
    }
    const profile = await store.getOrCreateProfile(body.walletAddress)
    const deck = store.getDecks().find((item) => item.id === body.deckId)
    const isCreator = deck?.creatorWallet?.toLowerCase() === body.walletAddress.toLowerCase()
    if (!profile.unlockedDeckIds.includes(body.deckId)) {
      if (isCreator) {
        profile.unlockedDeckIds.push(body.deckId)
      } else {
        return reply.status(400).send({ error: 'Deck not unlocked' })
      }
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
