# TODO.final – Consolidated Tracker

## Status Snapshot
- Phases 0–5 are complete: repo structure, tooling, Vite/Tailwind frontend, Fastify backend with WS matchmaking, Hardhat escrow contract, and MiniPay integration are all in place.
- Mission progress, queue/match loops, and creator deck submission flows are live with Vitest + Playwright coverage and integration wiring.
- Remaining focus is Phase 6 polish plus MVP Phase 2 marketplace/persistence upgrades.

## Phase 6 – Polish & Player Retention
- Prep marketing assets: demo script, lobby/match screenshots, GIFs of mission progress + deck skins for README/docs updates.
- Keep docs/user onboarding current (README, Rules screen) with mission mechanics, creator workflow, and profile unlock details.

## Persistence & Infrastructure
- Move mission progress and player profiles off the in-memory store to persistent storage (SQLite/Prisma or similar) so rewards survive restarts.
- Plan the eventual data migration for creator decks/purchases as part of the persistence upgrade.

## Contracts & MiniPay Deployment
- Deploy the escrow contract to Celo Alfajores, record the live address, and pipe confirmations back into the MiniPay flow.
- Handle MiniPay transaction receipts + chain confirmations before treating stakes as locked.

## Testing & QA
- Playwright coverage now includes profile gating, deck purchases, MiniPay detection errors, and queue error toasts; add remaining scenarios (queue timeout refund + MiniPay transaction failure) if needed.
- Add backend integration tests once persistence lands; continue Vitest coverage for matchmaking/mission logic.
- Manual QA on reveal/result timers, refund flows, and the new profile unlock path.

## Marketplace & Creator Skins (MVP Phase 2)
- **Economy split:** demo credits continue to drive matches (seed R50, deduct/refund per queue, pay winners). Paid skins remain MiniPay-only with “Buy for R…” CTAs, MiniPay tx, `/decks/purchase` unlock, and a 2% platform fee tracked per sale.
- **Admin dashboard:** gated `/admin` area with submission queue (approve/reject with notes + NSFW flag), sales ledger (buyer, deck, price, fee, tx hash), and metrics overview (pending decks, platform fees, payouts owed).
- **Backend extensions:** persist creator decks + purchases, compute fee/creator share, expose `/admin/submissions`, `/admin/purchases`, `/admin/stats`, and allow PATCHes for status/notes/flags.
- **Frontend updates:** Decks screen shows creator info, price, platform messaging; disable buy button while processing; add admin UI with submission moderation, sales table, CSV export, and toasts for actions.
- **Compliance/Ops:** document manual payout flow, track fee totals vs. creator earnings, plan AI moderation hooks, and update README/onboarding with credits-vs-paid + admin responsibilities.
- **Nice-to-haves:** alerting (email/webhook) for submissions or large sales, creator self-service portal, automated MiniPay payouts once compliant.

## Post-MVP & Stretch
- Marketplace roadmap beyond MVP2: resale listings, royalties, on-chain ownership (ERC-1155 or similar), automated moderation/reporting.
- Future enhancements for skins marketplace data (inventory, resale, creator payouts) and MiniPay-colored missions/events once persistence is battle-tested.
