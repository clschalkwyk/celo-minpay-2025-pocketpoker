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
- `POST /match/queue` – queue a wallet at a stake; pairs players immediately if possible.
- `POST /match/cancel` – remove a queued ticket.
- `GET /match/:id` – fetch match details.
- `GET /decks`, `GET /missions`, `GET /leaderboard` – content feeds used throughout the app.
- `GET /health` – simple health check.

## WebSocket Events

Connect to `/ws/:matchId` to receive:

- `match_init` – players paired and cards dealt.
- `state_update` – readiness updates.
- `result` – resolved winner summary.

## Environment

Set `PORT` (defaults to `4000`). Mission/deck/leaderboard data and matches are currently stored in memory. Replace the `DataStore` with Prisma/SQLite or another persistence layer when ready.
