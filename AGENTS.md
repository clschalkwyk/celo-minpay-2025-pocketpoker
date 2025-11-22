# Repository Guidelines

## Development Principles
- KISS
- YAGNI
- SOLID
- ATOMIC DESIGN (for frontend)

## Project Structure & Module Organization
- Docs-first today. Key files: `docs/PROJECT_BRIEF.md`, `docs/UI_SPEC.md`, `docs/STYLE_GUIDE.md`.
- Preferred landing spots:
  - `frontend/` – React + Vite + TypeScript + Tailwind.
  - `backend/` – Fastify/Node with matchmaking, profiles, and ELO logic.
  - `contracts/` – Celo escrow contract + Hardhat tests/scripts.
  - `assets/` – images, icons, card previews.
  - `docs/` – product, UI, and style specs (source of truth).

## Build, Test, and Development Commands
- Frontend (npm): `npm run dev`, `npm run build`, `npm test`, `npm run lint`.
- Contracts (Hardhat): `npx hardhat compile`, `npx hardhat test`, `npx hardhat node`, `npx hardhat run scripts/deploy.ts --network <network>` after installing `hardhat` + `@nomicfoundation/hardhat-toolbox`.

## Coding Style & Naming Conventions
- TypeScript with 2-space indent and no implicit `any`.
- React components named in PascalCase (e.g., `GameTable.tsx`); hooks in `useX.ts`; utilities kebab-case (e.g., `match-service.ts`).
- Enforce ESLint + Prettier; follow Tailwind tokens from `docs/STYLE_GUIDE.md`.

## Testing Guidelines
- Units via Vitest or Jest; colocate `*.test.ts[x]` with source.
- E2E via Playwright/Cypress covering MiniPay detection through queue→match→result.
- Target ≥80% logic coverage and avoid unstable snapshots.

## Current Status (Phases 0–5 Complete)
- Frontend: Vite + React + TS + Tailwind with MiniPay detection, queue/match UI, state providers, toasts, polling-based match updates, and real-money toggle/profile reset UI; Vitest + Playwright smoke tests exist.
- Backend: Fastify API services for auth, match queue, missions, decks, leaderboard, matchmaking/bot fallback, in-memory persistence, and Vitest coverage for logic/matchmaking; `/profile/reset` wipes stats and reseeds missions.
- Contracts: Hardhat escrow contract deployed locally with tests & deploy script; latest Celo Sepolia deploy at `0x8Adf65484A90Cb691B712484B24B6D52d2cF927c`.
- Integration: MiniPay → backend flows wired up with documented env values (`VITE_BACKEND_URL`, `VITE_ESCROW_ADDRESS`, `VITE_ENABLE_BOT_MATCHES`); escrow toggle triggers MiniPay txs before queueing.
- Backend fixes/testing: demo credit payouts now reuse the profile from `store.adjustCredits`, and a regression test ensures credits persist even after cloned responses; match finalization now triggers on-demand if Lambda timers miss the window, with tests covering both the service and `/match/:id`; `npm test` run inside `backend/` confirms the extra `demo payout …` log line during the stale-match test.

## Outstanding Work (Phase 6+)
1. Phase 6 polish
   - Apply `docs/STYLE_GUIDE.md` motion/styles to cards, buttons, and transitions.
   - Seed richer decks, missions, and leaderboard data.
   - Cover MiniPay missing, network loss, match timeout, and no opponent errors with inline UX and telemetry.
   - Prep demo script plus README screenshots/GIFs.
2. Backend persistence upgrade for profile and mission progress (memory store is volatile unless Dynamo is configured).
3. Deploy escrow contract to Alfajores, wire in the deployed address/tx receipts, and document the real-money flow.
4. Expand Playwright coverage for the queue→match→result path and add backend integration tests once persistence is solid.
5. Post-MVP marketplace roadmap (skins data & purchase flow) remains pending.

## Quick Notes for Next Session
- Document the real-money toggle, `/profile/reset`, Sepolia escrow address, and `VITE_CELO_ZAR_RATE` in README/docs.
- Add a queue-status polling endpoint so non-bot matchmaking can work without WebSockets.
- Update the lobby CTA to reflect escrow mode (disable until MiniPay connects and clarify credit messaging).
- Mock mission endpoints in tests to avoid repeated ENOTFOUND warnings.
- Consider persisting deck purchases + credits in Dynamo for demo portability.
- Pull fresh CloudWatch logs for wallet `0x8c1be6b555c25d80e82bf500d08f55f2ad39e0ca` to verify `demo stake deducted` events align with the new `demo payout` log and confirm DB credit deltas during demo matchmaking.

## MiniPay Implementation Notes
- Reference: https://docs.minipay.xyz/technical-references/
- Detection/transact sequence (EIP-1193):
  ```ts
  if (!window.ethereum?.isMiniPay) throw new Error('Open in MiniPay');
  const [from] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: contractAddress, data, value: '0x0' }],
  });
  ```
- UX must include explicit MiniPay detection, pending/progress states, and error toasts; flows should stay mobile-first per `docs/UI_SPEC.md`.

## Agent-Specific Instructions
- Read the `docs/` folder before editing code and match the UI/brand specs provided there.
- Keep changes minimal and scoped; don’t restructure without discussion.
- If deviating from these guidelines, update this file in the same PR.
