# MVP Phase 2 – Marketplace & Live Ops Scope

## Goals
- Separate the poker experience (demo credits) from paid cosmetic economy.
- Stand up the minimum admin tooling to manage creator submissions, review content, and trace sales/payouts.
- Introduce a 2% platform fee on every skin purchase to cover operating costs.

## Credits vs. Paid Skins
1. **Demo credits for matches**
   - Seed R50 in demo credits on every new profile (already live).
   - Deduct credits when queuing, refund on cancel/timeout/no-opponent.
   - Award credits to winners from the match pot so the loop stays self-contained.
2. **MiniPay-only skin purchases**
   - Locked decks show `Buy for RX` buttons.
   - Trigger MiniPay payment → call `/decks/purchase` → server logs purchase + unlocks deck.
   - Add platform fee calculation (2% of price) and store gross, fee, net.

## Admin Dashboard (New)
- Auth gate (basic password or wallet allowlist to start).
- Views:
  1. **Submission queue** – list pending/approved/rejected decks with thumbnails, creator info, submission timestamp, and quick approve/reject buttons (calls existing PATCH routes).
  2. **Sales ledger** – table of purchases showing buyer wallet, deck, price, platform fee, creator share, MiniPay tx hash (when available).
  3. **Metrics overview** – counts of pending decks, total sales, total platform fees, payouts owed per creator.
- Moderation helpers:
  - Notes field when rejecting (reason stored on submission).
  - Manual “flag NSFW” toggle that prevents decks from going live until reviewed.
  - Hook for future AI/vision scan integration (queue items awaiting scan).

## Backend Enhancements
- Persist creator decks + purchases (move `DataStore` to SQLite/Prisma) so data survives restarts.
- Extend `/decks/purchase` to:
  - Calculate fee + creator share.
  - Append purchase record with `deckId`, `buyer`, `price`, `platformFee`, `creatorShare`, `txHash` (optional), timestamp.
- Add `/admin/purchases`, `/admin/stats` endpoints for the dashboard (read-only for now).
- Expose `/admin/submissions` with pagination, filters, and ability to set notes/flags.

## Frontend Enhancements
- **Decks screen:**
  - Show creator name + price, disable the buy button during processing.
  - Surface platform messaging (“2% platform fee keeps the lights on”).
- **Admin UI:**
  - New route(s) under `/admin` gated by password.
  - Submission list with inline approve/reject.
  - Sales table with CSV export.
- **Notifications:** push toasts for purchase success/failure and admin actions.

## Compliance & Ops Considerations
- Document process for manual payouts to creators (off-chain for now).
- Track fee totals vs. creator earnings for finance handoff.
- Plan AI moderation integration (e.g., queue images for future scanning service).
- Update README / onboarding with the credits-vs-paid split and admin responsibilities.

## Nice-to-Haves (post MVP2)
- Email/webhook alerts when new submissions arrive or large sales occur.
- Creator self-service portal with sales stats and withdrawal requests.
- Automated MiniPay payouts once compliance/story is sorted.
