# Repository Guidelines


## Development Principals
- KISS
- YAGNI
- SOLID
- ATOMIC DESIGN (for frontend)

## Project Structure & Module Organization
- Docs-first today. Key files: `docs/PROJECT_BRIEF.md`, `docs/UI_SPEC.md`, `docs/STYLE_GUIDE.md`.
- Preferred structure when code lands:
  - `frontend/` – React + Vite + TypeScript + Tailwind.
  - `backend/` – FastAPI or Node.js (matchmaking, profiles, ELO).
  - `contracts/` – Celo escrow contract + tests (Hardhat).
  - `assets/` – images, icons, card previews.
  - `docs/` – product/UI/style specs (source of truth).

## Build, Test, and Development Commands
- Frontend (npm): `npm run dev` (serve), `npm run build` (bundle), `npm test` (unit), `npm run lint` (ESLint/Prettier).
- Contracts (Hardhat): install `hardhat` + `@nomicfoundation/hardhat-toolbox`; `npx hardhat compile`; `npx hardhat test`; `npx hardhat node`; deploy with `npx hardhat run scripts/deploy.ts --network <network>`.

## Coding Style & Naming Conventions
- TypeScript, 2-space indent, no implicit `any`.
- React components: PascalCase (e.g., `GameTable.tsx`); hooks `useX.ts`; utilities kebab-case (e.g., `match-service.ts`).
- Enforce ESLint + Prettier; apply Tailwind tokens from `docs/STYLE_GUIDE.md`.

## Testing Guidelines
- Unit: Vitest or Jest; files `*.test.ts[x]` colocated with source.
- E2E: Playwright/Cypress for MiniPay detection and queue → match → result.
- Aim ≥80% coverage on logic; snapshot sparingly for stable UI.

## Commit & Pull Request Guidelines
- Conventional Commits (e.g., `feat: matchmaking modal`, `fix: MiniPay detection`).
- PRs: clear description, linked issue, UI screenshots/GIFs, test notes; ensure tests/lint pass and docs updated if UX/API changes.

## Security & Configuration Tips
- Don’t commit secrets. Use `.env.local` (gitignored) for `VITE_MINIPAY_PROVIDER`, `CELO_RPC_URL`, deploy keys.
- Target Celo testnet in dev; always branch on `window.ethereum?.isMiniPay`.

## MiniPay Implementation Notes
- Reference: https://docs.minipay.xyz/technical-references/
- Detect and transact (EIP-1193):
  ```ts
  if (!window.ethereum?.isMiniPay) throw new Error('Open in MiniPay');
  const [from] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: contractAddress, data, value: '0x0' }],
  });
  ```
- UX: explicit MiniPay detection, pending/progress states, and error toasts; keep flows mobile-first per `docs/UI_SPEC.md`.

## Agent-Specific Instructions
- Read `docs/` before editing code; match UI/brand specs.
- Keep changes minimal and scoped; don’t restructure without discussion.
- If deviating from these guidelines, update this file in the same PR.
