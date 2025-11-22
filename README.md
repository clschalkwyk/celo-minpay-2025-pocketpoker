# PocketPoker (MiniPay MVP)

PocketPoker is a mobile-first MiniPay experience where players stake a few cUSD, play a snappy three-card showdown, and race up a global leaderboard. This repo is a monorepo that houses the frontend (React + Vite + Tailwind), backend (Node.js + Fastify/Express + TypeScript), and Celo escrow smart contract (Hardhat).

## Repo Layout

```
frontend/  # Vite + React client (mobile-first MiniPay UI)
backend/   # Node.js API server for matchmaking and results
contracts/ # Hardhat workspace for the MiniPay escrow contract
assets/    # Marketing art, deck previews, screenshots
docs/      # Product brief, UI spec, style guide (source of truth)
```

## Quickstart

1. Install dependencies
   ```bash
   npm install
   ```
2. Bootstrap each workspace
   ```bash
   cd frontend && npm install && cd -
   cd backend && npm install && cd -
   cd contracts && npm install && cd -
   ```
3. Run lint + tests across all workspaces
   ```bash
   npm run lint
   npm run test
   ```
4. See `frontend/README.md`, `backend/README.md`, and `contracts/README.md` for detailed instructions per layer. Run `npm run test --workspace frontend -- --run` for unit tests or `npm run test:e2e --workspace frontend` to execute the Playwright smoke test (spins up Vite automatically).

## How to Run the App

1. **Prerequisites**
   - Node.js 20+ and npm 10+.
   - One terminal per service (backend + frontend) or use a process manager such as `npm-run-all`.
2. **Create env files**
   - Copy the samples below into `frontend/.env.local` and `backend/.env`. Point `VITE_BACKEND_URL` to your local backend (`http://localhost:4000`) and set `VITE_ESCROW_ADDRESS` to any placeholder when toggling MiniPay demo mode.
3. **Start the backend**
   ```bash
   cd backend
   npm run dev    # or npm run start once compiled
   ```
   The Fastify server listens on `PORT` (default 4000) and exposes REST + `/ws/:matchId`.
4. **Run the frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Vite serves the MiniPay UI on `http://localhost:5173`. The splash screen will auto-connect using the MiniPay provider or the built-in demo fallback when `import.meta.env.DEV` is true.
5. **(Optional) Contracts**
   ```bash
   cd contracts
   npx hardhat node                # start a local chain
   npx hardhat run scripts/deploy.ts --network localhost
   npm run deploy:alfajores        # deploy with the Celo Composer defaults (set PRIVATE_KEY first)
   ```
   Update `VITE_ESCROW_ADDRESS` (currently `0x8Adf65484A90Cb691B712484B24B6D52d2cF927c` on Celo Sepolia) and backend payout config with the deployed address when you move beyond demo mode. Use `VITE_CELO_ZAR_RATE` to set your fiat↔CELO conversion (default `100000`, i.e. R1 ↔ 0.00001 CELO) so real-money stakes stay tiny on-chain.
6. **Verify flows**
   - Visit `http://localhost:5173` (mobile viewport recommended).
   - Queue a match; demo credits (R50 seeded per wallet) are deducted instead of real MiniPay stakes and refunded on cancel/timeout.
   - Run `npm run test --workspace frontend` or backend/unit tests to ensure logic stays green.
   - Run `npm run test:e2e --workspace frontend -- --project=chromium match-missions.spec.ts` to execute the Playwright smoke for queue → deck visuals → mission progress.

## Docker Image (Backend API)

If you prefer to run the backend in a container (e.g., for AWS App Runner, ECS, or any other host), a Dockerfile lives at the repo root:

```bash
# Build the image
docker build -t pocketpoker-backend .

# Run it locally on port 4000
docker run -p 4000:4000 --env-file backend/.env pocketpoker-backend
```

The image only contains the Fastify backend API server. Pass in your usual backend env vars (`PORT`, `CELO_RPC_URL`, etc.). The container exposes port `4000`.

> ℹ️ AWS Lambda (and other request-per-run platforms) still aren’t a great fit because matchmaking timers live in memory. Use a service that keeps the container running (App Runner, ECS/Fargate, EC2, Fly.io, etc.) so those timers fire reliably. If you still want to experiment with Lambda container images, add the [AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter) and make sure your timers don’t rely on long-lived state.

## Makefile Deployment Helpers

The `Makefile` includes AWS CLI helpers to push the backend image, deploy a Lambda, wire API Gateway, and upload the frontend bundle. Customize the variables (defaults shown below) by exporting them in your shell or passing them inline:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
export ECR_REPO=pocketpoker-backend
export LAMBDA_NAME=pocketpoker-backend
export LAMBDA_ROLE_ARN=arn:aws:iam::123456789012:role/pocketpoker-backend
export API_NAME=pocketpoker-backend-http
export API_STAGE=prod
export S3_BUCKET=pocketpoker-frontend
```

Then run the targets:

```bash
make docker-build-backend            # docker build + tag with your ECR URI
make docker-push-backend             # login & push image to ECR (creates repo if needed)
make lambda-deploy                   # create or update the Lambda using the pushed image
make apigw-deploy                    # create/refresh an HTTP API Gateway proxying to Lambda
make frontend-build                  # npm run build inside frontend/
make frontend-upload                 # sync dist/ to the S3 bucket (index.html set to no-cache)
```

Each command uses the AWS CLI; ensure you’re authenticated with IAM credentials that can manage ECR, Lambda, API Gateway v2, and S3. The `apigw-deploy` target prints the invoke URL when it finishes.

## Missions & Creator Decks

- **Mission persistence** – Mission state is stored server-side per MiniPay wallet. The frontend `MissionProvider` records match progress and claims rewards via `/missions/progress` + `/missions/:id/claim`, so XP/mission completion survives refreshes. Point `MissionProvider` at a real persistence layer when you move past the in-memory store.
- **Creator deck portal** – Visit `/creator-decks` to submit mock card art (PNG/JPEG or hosted URL) together with the creator’s MiniPay wallet, and manage the review queue. Each submission stores the wallet so purchases can later trigger creator payouts once the deck is approved and priced. Submissions are kept in memory via `/creator-decks` endpoints; approving a deck flags it as “Live soon” on the main Decks screen so players can preview community drops.
- **Deck status badges** – Deck cards now surface placeholder badges for “Pending review” and “Live soon” states to tease marketplace availability before unlock mechanics are wired up.
- **Settlements** – Buying a creator deck records the price, platform fee, creator share, creator wallet, and a `settlementState = pending` flag (and, when paid, `payoutSettledAt`/`payoutTxHash`) so your payout job can sweep funds from the escrow contract to the creator. Use the recorded `txHash` + `creatorWallet` to drive that payout externally.
- **Profile customization** – After five completed matches, players unlock `/profile`, where they can pick a new nickname + avatar (preset gallery or custom URL). The frontend calls `/profile/update`, which enforces the five-match gate and validates names/URLs.
- **Demo credits vs. paid skins** – Matches only consume the free R50 credit balance that every profile receives (credits are deducted on queue, refunded on cancel/timeout, and payouts go to winners). Skins are now purchased via MiniPay micro-payments: locked decks display a price, trigger a MiniPay transaction, and call `/decks/purchase` to unlock once the payment succeeds.
- **Admin dashboard** – Go to `/admin`, enter the admin key (`VITE_ADMIN_KEY` / `ADMIN_API_KEY`), and manage submissions, NSFW flags, and review notes while monitoring sales + the 2% platform fee totals.

## Environment Samples

```bash
# frontend/.env.local
VITE_MINIPAY_PROVIDER=https://forno.celo-sepolia.celo-testnet.org
VITE_MINIPAY_CHAIN_ID=44787
VITE_BACKEND_URL=http://localhost:4000
VITE_ESCROW_ADDRESS=0x8Adf65484A90Cb691B712484B24B6D52d2cF927c # Celo Sepolia escrow
VITE_ENABLE_BOT_MATCHES=true
VITE_CELO_ZAR_RATE=100000
VITE_ADMIN_KEY=demo-admin-key

# backend/.env
PORT=4000
DATABASE_URL=file:./dev.db
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
MATCH_OPERATOR_PRIVATE_KEY=0xabc123
ADMIN_API_KEY=demo-admin-key
PLATFORM_FEE_PERCENT=2
ASSET_UPLOAD_BUCKET=
ASSET_UPLOAD_REGION=
ASSET_PUBLIC_BASE_URL=

# contracts/.env
CELO_ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC_URL=https://forno.celo.org
CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
PRIVATE_KEY=0xfeed
CELOSCAN_API_KEY=

# Common
VITE_APP_VERSION=2025.11.21-2
```

Never commit real secrets. Keep MiniPay keys and deployer keys inside git-ignored local env files.

## Tooling

- **Linting / Formatting:** ESLint + Prettier (run via `npm run lint` / `npm run format`).
- **CI:** GitHub workflow runs install → lint → test on every push/PR.
- **Docs:** Start with `docs/PROJECT_BRIEF.md`, `docs/UI_SPEC.md`, `docs/STYLE_GUIDE.md` before touching code.

Refer to `TODO.md` for the current implementation roadmap and phase tracker.
