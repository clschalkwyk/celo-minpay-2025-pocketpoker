# PocketPoker Backend

Fastify + TypeScript service that powers matchmaking, missions, and MiniPay stake orchestration. The current implementation uses an in-memory data store and mocked transactions so the frontend can iterate quickly.

## Scripts

```bash
npm run dev    # start Fastify with tsx watch mode
npm run lint   # ESLint over src/**.ts
npm run test   # Vitest unit + integration tests
npm run build  # emit dist/server.js for deployment
npm start      # run compiled server
```

## REST API

- `POST /auth/init` – bootstrap a profile for the provided `walletAddress`.
- `POST /match/queue-demo` – queue a wallet at a stake using demo credits.
- `POST /match/queue-escrow` – queue a wallet after locking MiniPay funds (requires `txHash`).
- `POST /match/cancel` – remove a queued ticket.
- `GET /match/:id` – fetch match details.
- `GET /decks`, `GET /missions`, `GET /leaderboard` – content feeds used throughout the app.
- `GET /health` – simple health check.

## Environment

Set `PORT` (defaults to `4000`). Mission/deck/leaderboard data and matches are currently stored in memory. Replace the `DataStore` with Prisma/SQLite or another persistence layer when ready. For cloud deployments, consider:

- `USE_DYNAMO_STORE=true` and `DYNAMO_TABLE_NAME=<table>` to enable the DynamoDB implementation. You can apply the recommended Lambda env vars via `aws lambda update-function-configuration --cli-input-json file://backend/env.template.json`.
- `ADMIN_API_KEY=<secret>` to secure `/admin/*` routes (defaults to `admin-demo-key`).
- `ASSET_UPLOAD_BUCKET` / `ASSET_UPLOAD_REGION` / `ASSET_PUBLIC_BASE_URL` for S3 deck art uploads (see **Asset Uploads** below).

## AWS Lambda Deployment

Builds now emit `dist/lambda.js`, which exposes a `handler` produced through `@fastify/aws-lambda`. Use that handler when wiring the backend to API Gateway/Lambda:

```ts
import { handler } from './dist/lambda.js'
export { handler }
```

The handler lazily boots the Fastify instance from `src/server.ts` so cold starts stay low while keeping the regular `npm start` workflow untouched.

## Asset Uploads

To support custom deck artwork uploads, the backend can mint short-lived S3 pre-signed URLs via `POST /uploads/decks`. Configure the following environment variables (IAM credentials/roles must have `s3:PutObject` on the bucket):

- `ASSET_UPLOAD_BUCKET` – target bucket name (required)
- `ASSET_UPLOAD_REGION` – bucket region (falls back to `AWS_REGION`)
- `ASSET_PUBLIC_BASE_URL` – optional CDN/public URL prefix; defaults to the S3 bucket URL
- IAM: grant `s3:PutObject` on `arn:aws:s3:::<bucket>/*` and `s3:ListBucket` on `arn:aws:s3:::<bucket>`.
- S3 CORS: allow `PUT` and `GET` from your app origin. Example:
  ```json
  [
    {
      "AllowedOrigins": ["https://your-app.example"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
  ```

Request body:

```json
{ "contentType": "image/png" }
```

Response:

```json
{
  "uploadUrl": "https://s3....",
  "fileUrl": "https://cdn.example.com/creator-decks/abc123.png",
  "key": "creator-decks/abc123.png"
}
```

The frontend can upload directly to `uploadUrl` and persist `fileUrl` inside `previewImageUrl` when submitting a deck.
