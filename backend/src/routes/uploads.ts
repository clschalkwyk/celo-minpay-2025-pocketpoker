import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

export async function registerUploadRoutes(app: FastifyInstance) {
  if (!uploadBucket || !s3Client) {
    app.log.warn('Upload routes disabled: ASSET_UPLOAD_BUCKET not configured')
    return
  }

  app.post('/uploads/decks', async (request, reply) => {
    const body = request.body as { contentType?: string; fileName?: string }
    const contentType = body?.contentType || 'image/png'
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(contentType)) {
      return reply.status(400).send({ error: 'Only image uploads are allowed' })
    }

    const safeName = sanitizeFileName(body?.fileName)
    const extension = inferExtension(contentType, safeName)
    const key = `creator-decks/${randomUUID().replace(/-/g, '')}${extension}`

    const command = new PutObjectCommand({
      Bucket: uploadBucket,
      Key: key,
      ContentType: contentType,
    })

    try {
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 })
      const fileUrl = `${publicBaseUrl}/${key}`
      return { uploadUrl, fileUrl, key }
    } catch (err) {
      request.log.error({ err }, 'failed to create signed upload url')
      return reply.status(500).send({ error: 'Unable to create upload URL' })
    }
  })
}

const sanitizeFileName = (value?: string) => {
  if (!value) return ''
  return value.toLowerCase().replace(/[^a-z0-9.-]/g, '')
}

const inferExtension = (contentType: string, fileName: string) => {
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
  return map[contentType] ?? '.png'
}
