# PocketPoker – MiniPay PvP Arena
Frontend Stack: **React + Vite + TypeScript + TailwindCSS** (web Mini App style)

---

## 1. One‑Liner

> PocketPoker is a mobile‑first MiniPay game where players enter fast 1v1 “stake & showdown” poker matches with micro‑stakes, climb a global leaderboard, and unlock cosmetic card decks.

Single round. Simple rules. Juicy UI. Money flow via MiniPay.

---

## 2. Problem & Opportunity

### Problem
Most Web3 / blockchain games:
- Have terrible UX (wallet popups, sign‑ins, jargon).
- Are grindy DeFi clones, not “snackable” games.
- Don’t show why a payment rail like MiniPay is actually useful.

### Opportunity
MiniPay is:
- Mobile‑first.
- Embedded in a popular browser/wallet.
- Perfect for **micro‑stakes**, **micro‑transactions**, and **casual competitive games**.

PocketPoker becomes:
- A **hero demo** of “micro‑esports” powered by MiniPay.
- A simple, addictive game that could realistically ship in the MiniPay ecosystem.

---

## 3. MVP Scope

### In Scope

**Gameplay**
- 1v1 **Stake & Showdown** poker:
  - Each player stakes a fixed amount upfront (via MiniPay).
  - Each gets **3 cards**.
  - No in‑hand betting for MVP.
  - Reveal → winner takes pot.

**Core Features**
- **Lobby**: balance display, stake selection, “Play Now” quick‑match button.
- **Matchmaking**: match vs another player at same stake, with timeout + refund.
- **Game Table**: card dealing, pot display, reveal animation.
- **Result Screen**: win/loss, pot, XP, ELO, unlocks.
- **Progression**:
  - XP + Levels.
  - ELO rating + global leaderboard.
- **Cosmetics**:
  - Card deck themes (visual only).
  - Simple inventory UI to equip decks.
- **Missions**:
  - A handful of daily missions (e.g. play X matches, win once).
- **MiniPay Integration**:
  - Detect MiniPay.
  - Get wallet address.
  - Show balance.
  - Stake transaction into game contract.
  - Payout winner via contract.

### Out of Scope (MVP)

- Full Texas Hold’em.
- More than 2 players per table.
- Complex betting rounds and side pots.
- Shops / paid cosmetics.
- Regional leaderboards.
- Bot opponents.
- Deep anti‑cheat and fraud analysis beyond basic checks.

---

## 4. User Personas

### 4.1 Casual Player – “Scroll Bored”
- Finds PocketPoker through MiniPay / ecosystem links.
- Wants something quick and visually satisfying.
- Plays in short sessions.
- Doesn’t care about deep poker strategy.

### 4.2 Grinder – “Rank Chaser”
- Returns frequently.
- Optimizes for ELO and flexing rare deck themes.
- Cares about leaderboards, win streaks, and unlockables.

### 4.3 Ecosystem Reviewer – “MiniPay Stakeholder”
- Evaluates: UX quality, polish, and MiniPay integration.
- Wants to see:
  - Seamless payments.
  - Minimal friction.
  - A story that aligns with MiniPay goals (micro‑transactions, financial access, games).

---

## 5. Core Game Loop (High Level)

1. Player opens app inside MiniPay → auto‑connect.
2. Lobby screen shows:
   - Wallet balance (from MiniPay).
   - Stake selector (e.g. R0.50, R1, R5, R10 equivalent in cUSD).
   - “Play Now” button.
3. Player chooses stake → taps “Play Now”.
4. Matchmaking:
   - Backend queues player at selected stake.
   - When another player is queued at same stake, a match is created.
   - Alternatively, timeout → cancel + refund.
5. Stake Transaction:
   - Stake amount transferred via MiniPay to game contract (or locked in pooled address).
6. Game Start:
   - Both clients receive match data.
   - 3 cards dealt to each player.
7. Showdown:
   - Optional “Ready” state.
   - Cards revealed.
   - Best hand wins (3‑card ranking).
8. Result:
   - Winner paid pot.
   - XP and ELO updated.
   - Missions updated; deck unlocks triggered.
9. Return to lobby or start next match.

---

## 6. Architecture Overview

### Frontend
- **React + Vite + TypeScript**
- **TailwindCSS** with a custom theme + a few utility components.
- Polling client for live match updates (MiniPay runtime blocks WebSockets).
- Deployed as a static web app (S3/CloudFront, Vercel, Netlify, etc.).

### Backend
- Language: Python (FastAPI) or Node.js (Express / Nest) – implementation detail.
- Responsibilities:
  - User profile + progression.
  - Matchmaking and match lifecycle.
  - Game logic (card dealing, hand evaluation).
  - XP and ELO calculations.
  - Missions and unlock tracking.
  - Leaderboards.
- Match updates:
  - Lightweight polling for match state sync (no WebSockets inside MiniPay).
  - Simple in‑memory match registry powering the queue + timers.

### Smart Contract (Celo)
- Very simple game escrow contract:
  - Accept stakes for a given match ID.
  - Track which players have funded.
  - Allow backend (trusted operator) to trigger payout to winner wallet.
- All game logic stays off‑chain; smart contract ONLY holds and releases funds.

### MiniPay
- MiniPay acts as the wallet and dApp host.
- Frontend interacts with MiniPay’s injected provider (`window.ethereum.isMiniPay`) to:
  - Detect wallet.
  - Read address and chain.
  - Send transactions.

---

## 7. Data Model (Conceptual)

### UserProfile
- id
- walletAddress
- username
- avatarUrl
- elo
- level
- xp, xpToNextLevel
- activeDeckId
- unlockedDeckIds[]
- stats: matches, wins, losses, streak

### DeckTheme
- id
- name
- rarity (common/rare/ranked/legendary/mythic)
- description
- previewImageUrl
- unlockCondition (type + payload)

### Match
- id
- stake
- pot
- state (queued / started / finished / cancelled)
- playerA, playerB (userId, walletAddress, deckId, cards, ready)
- winnerId

### Mission
- id, title, description, type (daily/seasonal)
- objective (matchesPlayed, matchesWon, etc.)
- progress, target, state (active/completed/claimed)
- reward (xp or deck unlock)

---

## 8. Routes / Screens Summary

- `/` – Splash / Init (MiniPay detection & profile bootstrap)
- `/lobby` – Main hub (balance, stake, Play Now, quick stats)
- `/match/:id` – GameTable screen
- `/decks` – Deck inventory & equip screen
- `/missions` – Missions screen
- `/leaderboard` – Leaderboard screen
- `/profile` – Player settings. Unlock nickname + avatar editing after 5 completed matches (tracks via `profile.stats.matches`).

Full details are in **UI_SPEC.md**.

---

## 9. MVP Deliverables

1. **Playable PvP game loop**:
   - Two real users can stake, get matched, play a round, and be paid out.
2. **Full UI implementation**:
   - All screens wired with fake data initially, then with real backend.
3. **Progression systems**:
   - XP, Level, ELO, at least 6–8 deck themes with unlocks.
4. **MiniPay integration**:
   - Works inside MiniPay.
   - POC smart contract deployed on Celo testnet.
5. **Demo flow**:
   - Clear path for judges/reviewers: open, connect, play, see payout, see unlock.

---

## 10. Roadmap (Post‑MVP Ideas)

- Add bots for low‑traffic periods.
- Add fully featured betting rounds.
- Add 4‑player mini‑tournaments.
- Add premium cosmetics purchasable with MiniPay.
- Add friends list + direct challenges + invites.
- Add regional leaderboards (per country).

PocketPoker MVP focuses on: **fast lane from stake → play → payout → progression**, with a funky, memorable UI and clean MiniPay integration.
