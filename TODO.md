# TODO – Implementation Roadmap

Use this as a phased checklist. Mark items done and keep scopes tight.

## Phase 0 – Repo Setup
- [x] Create `frontend/`, `backend/`, `contracts/`, `assets/`, `docs/` structure.
- [x] Add root README with quickstart and env samples.
- [x] Configure ESLint + Prettier; simple CI (lint + test).

## Phase 1 – Frontend MVP: Lobby + Gameplay
- [x] Scaffold Vite + React + TypeScript in `frontend/`.
- [x] Add Tailwind; theme per `docs/STYLE_GUIDE.md`.
- [x] Routes: `/`, `/lobby`, `/match/:id`, `/decks`, `/missions`, `/leaderboard`.
- [x] Global state/contexts: `useMiniPay`, `useProfile`, `useMatch`, `useUIStore`.
- [x] Screens/overlays: Splash/Init, Lobby, Matchmaking Modal, Game Table, Result Overlay.
- [x] Core components from `docs/UI_SPEC.md` (TopBar, StakeSelector, CardRow, PotDisplay...).
- [x] Mock data layer (no backend) to drive UI.
- [x] Unit tests (Vitest/Jest) for StakeSelector, ResultOverlay, state hooks.

## Phase 2 – Backend MVP (Node.js)
- [x] Scaffold `backend/` (Express/Fastify + TypeScript).
- [x] Data model: UserProfile, Match, Mission, DeckTheme (SQLite/Prisma or in‑memory).
- [x] REST: `POST /auth/init`, `POST /match/queue`, `POST /match/cancel`, `GET /decks`, `GET /missions`, `GET /leaderboard`.
- [x] WebSocket: rooms per match; events `match_init`, `state_update`, `result`.
- [x] Game logic: 3‑card deal/eval, XP/level, ELO, missions update.
- [x] Tests: hand evaluator + matchmaking integration.

## Phase 3 – Contracts (Hardhat, Celo Testnet)
- [x] Init Hardhat in `contracts/`; add escrow contract.
- [x] Functions: `fundStake(matchId)`, `markReady()`, `payoutWinner(matchId, winner)` (operator‑gated).
- [x] Emit events; guard double‑funding and replay.
- [x] Tests: happy path, double‑spend, unauthorized payout.
- [x] Deploy scripts + env (`CELO_RPC_URL`, deployer key); record addresses.

## Phase 4 – MiniPay Integration
- [x] Provider util: detect `window.ethereum.isMiniPay`, `eth_requestAccounts`.
- [x] Balance display; chain check; graceful “open in MiniPay” fallback.
- [x] Stake tx flow: send tx, pending/success/error states.
- [x] Wire tx → backend confirmation → in‑app result.

## Phase 5 – Matchmaking & Result Wiring
- [x] Frontend connects to WS; subscribe per match.
- [x] Implement Ready → Reveal → Result transitions and animations.
- [x] Persist profile progress; update XP/ELO after result.
- [x] E2E (Playwright/Cypress): lobby → queue → match → result (mobile viewport).

## Phase 6 – Polish & Demo
- [ ] Style polish per STYLE_GUIDE (buttons, cards, motion).
- [ ] Seed decks, missions, leaderboard data.
- [ ] Error/edge states (no opponent, network loss, MiniPay missing).
- [ ] Demo script + seed accounts; screenshots/GIFs for README.

## Post‑MVP – Creator Skins Lite Marketplace
- [ ] Data: Skin, Purchase, Inventory; seed curated skins.
- [ ] UI: marketplace browse, detail, buy, owned inventory/equip.
- [ ] Purchase: MiniPay tx → backend grant; no resale/royalties.
- [ ] Creator upload form (PNG/JPEG, size/aspect checks); admin approve/reject.
- [ ] Content policy + manual moderation flow.

## Stretch (Later)
- [ ] Resale listings + royalties.
- [ ] On‑chain skin ownership (ERC‑1155 or similar).
- [ ] Automated moderation and reporting.
