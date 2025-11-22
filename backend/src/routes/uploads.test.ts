import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildServer } from '../server.js'

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com/upload'),
}))

const originalBuckets = {
  bucket: process.env.ASSET_UPLOAD_BUCKET,
  region: process.env.ASSET_UPLOAD_REGION,
  publicBase: process.env.ASSET_PUBLIC_BASE_URL,
}

describe('uploads routes', () => {
  const mockBucket = 'pocketpoker-test-bucket'
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeAll(async () => {
    process.env.ASSET_UPLOAD_BUCKET = mockBucket
    process.env.ASSET_UPLOAD_REGION = 'us-east-1'
    process.env.ASSET_PUBLIC_BASE_URL = `https://${mockBucket}.s3.amazonaws.com`
    app = await buildServer()
  })

  afterAll(async () => {
    process.env.ASSET_UPLOAD_BUCKET = originalBuckets.bucket
    process.env.ASSET_UPLOAD_REGION = originalBuckets.region
    process.env.ASSET_PUBLIC_BASE_URL = originalBuckets.publicBase
    await app?.close()
    vi.restoreAllMocks()
  })

  it('returns a signed upload URL and public file URL', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/uploads/decks',
      payload: { contentType: 'image/png', fileName: 'preview.png' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json() as { uploadUrl: string; fileUrl: string; key: string }
    expect(body.uploadUrl).toContain('https://signed-url.example.com/upload')
    expect(body.fileUrl).toContain(`https://${mockBucket}.s3.amazonaws.com/creator-decks/`)
  })

  it('rejects unsupported content types', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/uploads/decks',
      payload: { contentType: 'application/pdf' },
    })
    expect(response.statusCode).toBe(400)
  })
})
