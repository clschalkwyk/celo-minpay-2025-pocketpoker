# UI_SPEC – PocketPoker (React + Vite + TypeScript)

This document defines the screens, components, routes, and major events required to implement the PocketPoker UI. The goal is to make it trivial to scaffold the full frontend and “vibe code” the implementation.

---

## 1. Routes

- `/` – Splash / Init
- `/lobby` – Main Lobby
- `/match/:matchId` – Game Table
- `/decks` – Deck Themes / Inventory
- `/missions` – Missions
- `/leaderboard` – Leaderboard

Routing can be handled by React Router or similar.

---

## 2. Global Layout & State

### 2.1 Global Layout

- Top‑level `<App>` component:
  - Provides theme + Tailwind classes.
  - Holds global providers (e.g. query client, MiniPay context, match polling store).
- Optional `<ShellLayout>`:
  - Header and background styling shared across screens where appropriate.

### 2.2 Global State

Suggested global contexts/hooks:
- `useAuth()` / `useProfile()` – current `UserProfile`, loading states.
- `useMiniPay()` – detects MiniPay provider, wallet address, balance.
- `useMatch()` – current match info, polling timers, etc.
- `useUIStore()` – modal visibility, toasts, current stake selection.

---

## 3. Screen Specs

### 3.1 Screen: Splash / Init

**Route:** `/`  
**Purpose:** Detect MiniPay, bootstrap profile, and redirect to `/lobby`.

**Layout:**
- Centered logo and loading spinner.
- Status text below.

**Components:**
- `<AppLogo />`
- `<LoadingSpinner />`
- `<StatusText message="Connecting via MiniPay..." />`

**Behavior:**
- On mount:
  - Check `window.ethereum` and `window.ethereum.isMiniPay`.
  - Request accounts (`eth_requestAccounts`).
  - Call `POST /auth/init` with wallet address.
  - Store returned `UserProfile` in global state.
  - Navigate to `/lobby` on success.
  - On failure:
    - Show error (“Please open this app inside MiniPay”) + retry option.

---

### 3.2 Screen: Lobby

**Route:** `/lobby`  
**Purpose:** Main hub; start matches and access meta & progression.

**Layout:**
1. **Top Bar**
   - Left: Avatar circle, username, rank badge.
   - Right: Balance (formatted) + refresh icon.

2. **Main Play Card**
   - Large card with:
     - “Play Now” title.
     - Stake selector component.
     - “Quick Match” button.

3. **Progress Strip**
   - Horizontal XP bar.
   - Level label: `Lv X – Title`.

4. **Nav Buttons Row**
   - Three pill buttons: `Decks`, `Missions`, `Leaderboard`.

5. **Footer**
   - MiniPay + Celo branding.
   - App version.

**Components:**
- `<TopBar avatar username rank balance onRefreshBalance />`
- `<StakeSelector stakes={number[]} value onChange />`
- `<PlayCard stake onPlay />`
- `<XPProgress level currentXP xpToNext />`
- `<NavRow>` with `<NavButton>` items.

**Key Events:**
- `onPlay()`:
  - Opens Matchmaking Modal.
- `onNavDecks()` → navigate `/decks`.
- `onNavMissions()` → navigate `/missions`.
- `onNavLeaderboard()` → navigate `/leaderboard`.
- `onRefreshBalance()` → refetch MiniPay balance.

**State Dependencies:**
- `UserProfile` for username, rank, XP, level.
- `MiniPay` balance display.

---

### 3.3 Overlay: Matchmaking Modal

**Rendered over `/lobby` and `/match` when searching.**

**Layout:**
- Center card with soft glow.
- Title: “Finding an opponent...”
- Stake text: `Stake: X`
- Two silhouetted players with “You” label on one side, “Opponent” placeholder on the other.
- Circular loading animation.
- Cancel button at bottom (“Cancel & Refund”).

**Components:**
- `<MatchmakingModal stake onCancel timeoutSeconds />`

- **Behavior:**
- Calls `POST /match/queue-demo` (demo credits) or `POST /match/queue-escrow` (real stakes) with `stake`.
- If response returns a match, close modal and navigate to `/match/:matchId`.
- If response reports `queued`, keep modal visible, poll the queue status endpoint, and navigate once the backend responds with a match ID (MiniPay forbids WebSockets).
- On timeout:
  - Display “Still searching…” and optionally auto‑cancel after extended timeout.
- On cancel:
  - Call `/match/cancel` and close modal.

---

### 3.4 Screen: Game Table

**Route:** `/match/:matchId`  
**Purpose:** Run a single 1v1 “Stake & Showdown” game.

**Layout:**
1. **Top Bar**
   - Opponent name + rank + deck badge.
   - Timer badge (e.g., “Round: 15s”).

2. **Opponent Card Row**
   - 3 card backs using opponent’s deck theme.

3. **Center Area**
   - Pot display: chip stack + text `Pot: X`.
   - Optional subtle animation or “VS” emblem.

4. **Your Card Row**
   - 3 face‑up cards using active deck theme.

5. **Action Area**
   - Status line: “Ready when you are…” or “Waiting for opponent…”.
   - Big “Ready” button (for MVP) OR auto‑ready countdown bar.

**Components:**
- `<OpponentHeader name rank deckTheme />`
- `<CardRow cards theme faceUp />`
- `<PotDisplay amount />`
- `<StatusBanner text />`
- `<PrimaryButton label="Ready" onClick />` (optional)

**Game States (client‑visible):**
- `DEALING` – cards animating into place.
- `READY` – player can inspect cards.
- `WAITING_FOR_OPPONENT` – after player clicks Ready.
- `REVEALING` – both sides flip; highlight winner.
- `FINISHED` – transition to Result overlay.

- **Match Update Loop:**
- `match_init` – initial state, includes cards and stake (returned by `POST /match/queue-demo` / `-escrow` when instantly matched).
- Poll `GET /match/:id` for ready flags, timer, and results.

**Client Events:**
- `player_ready` – sent when user hits Ready (if not auto).

---

### 3.5 Overlay: Result

**Shown over Game Table after result.**

**Layout:**
- Big banner: `WINNER!` (green) or `DEFEAT` (red).
- Summary:
  - Outcome text: “You won X” / “You lost this round.”
  - Pot + payout details.
- Stats block:
  - ELO change.
  - XP gained.
  - XP progress bar with possible level‑up effect.
- Optional unlock banner:
  - “New deck unlocked: Ice White” with small card preview.
  - Buttons: `Equip Now`, `Later`.
- Actions row:
  - `Play Again` (same stake) button.
  - `Back to Lobby` button.

**Components:**
- `<ResultOverlay outcome pot eloDelta xpGain levelUp unlockedDeck? />`
- `<ResultBanner />`
- `<PayoutSummary />`
- `<EloChange />`
- `<XPProgress />`
- `<UnlockCard deck onEquip />`

**Behavior:**
- On `Equip Now`:
  - `POST /decks/equip` then update global profile.
- On `Play Again`:
  - Close overlay, navigate back to `/lobby` (or auto‑open matchmaking at previous stake).
- On `Back to Lobby`:
  - Navigate to `/lobby`.

---

### 3.6 Screen: Decks

**Route:** `/decks`  
**Purpose:** Show all card deck themes, allow equipping, and communicate unlock conditions.

**Layout:**
1. Header:
   - Title: “Deck Themes”.
   - Back arrow to Lobby.

2. Active Deck Panel:
   - Large preview of current active deck.
   - Label: “Active: {deckName}”.

3. Deck Grid:
   - Cards displayed in responsive grid.
   - Each tile shows:
     - Preview image.
     - Name.
     - Rarity tag.
     - Lock state (Unlocked / Locked).
   - Locked decks show a lock icon.

4. Deck Detail Modal (on click):
   - Larger preview.
   - Description.
   - Unlock condition text.
   - `Equip` button (if unlocked).

**Components:**
- `<DecksScreen />`
- `<DeckPreview deck />`
- `<DeckGrid decks />`
- `<DeckTile deck locked />`
- `<DeckDetailModal deck onEquip />`

**Data:**
- `GET /decks` → list of all themes.
- `UserProfile.unlockedDeckIds` to compute locked/unlocked.

---

### 3.7 Screen: Missions

**Route:** `/missions`  
**Purpose:** Daily retention and guided play.

**Layout:**
- Header: “Daily Missions”.
- List of mission cards:
  - Title: “Play 3 matches”.
  - Subtitle: “Complete today to earn 50 XP.”
  - Progress bar + numeric (e.g. `2 / 3`).
  - Reward pill (XP or deck).
  - Claim button when complete and unclaimed.

**Components:**
- `<MissionsScreen />`
- `<MissionList missions />`
- `<MissionCard mission onClaim />`

**Behavior:**
- `GET /missions` on mount.
- `POST /missions/:id/claim` when clicking Claim.
- Update XP and profile on reward.

---

### 3.8 Screen: Leaderboard

**Route:** `/leaderboard`  
**Purpose:** Show competitive standing and top players.

**Layout:**
- Header: “Global Leaderboard”.
- Optional tabs: `Global` (MVP is just global).
- Table layout:
  - Columns: Rank, Player, ELO, Wins.
  - Highlight top 3 with special styling.
- “You” footer:
  - Shows current player’s rank, ELO, Wins.

**Components:**
- `<LeaderboardScreen />`
- `<LeaderboardTable entries />`
- `<LeaderboardRow entry isSelf />`
- `<SelfRow entry />`

**Data:**
- `GET /leaderboard` → top N entries + current player rank.

---

### 3.9 Screen: Profile

**Route:** `/profile`  
**Purpose:** Let players customize nickname + avatar after proving engagement.

**Unlock Logic:**
- Require `profile.stats.matches >= 5`. Show locked state until threshold hit.
- Display progress meter (`matches / 5`) and copy encouraging return play when locked.

**Layout:**
1. Header with back arrow, “Player profile” eyebrow, and “Identity & Avatar” title.
2. Unlock card:
   - Matches played count vs. requirement.
   - Progress bar + badge (`Locked` vs `Customization unlocked`).
   - Reminder text when locked (“Play X more matches to unlock edits.”).
3. Customization form:
   - Nickname input (3–20 chars, letters/numbers/space/underscore).
   - Avatar gallery (preset image chips) + optional custom URL input.
   - Primary CTA (disabled/locked until threshold, shows “Locked until 5 matches”).

**Components:**
- `<ProfileScreen />`
- `<UnlockProgress matches required />`
- `<AvatarGallery options selected onSelect disabled />`
- `<PrimaryButton disabled reason />`

**Behavior:**
- Prefill nickname/avatar from `UserProfile`.
- On submit, call `POST /profile/update` with `{ walletAddress, username, avatarUrl }`.
- Surface success/error toasts; refresh profile context so lobby + leaderboards reflect new identity.

---

## 4. Component Overview (Frontend)

### Shared Components

- `AppLogo`
- `LoadingSpinner`
- `StatusText`
- `TopBar`
- `StakeSelector`
- `PrimaryButton`, `SecondaryButton`, `IconButton`
- `XPProgress`
- `RankBadge`
- `DeckCard` / `DeckTile`
- `Modal` (generic)
- `Toast` / `Snackbar`

### Match Components

- `MatchmakingModal`
- `GameTable`
- `CardRow`
- `Card` (front + back variants)
- `PotDisplay`
- `ResultOverlay`

---

## 5. State & Networking Integration Points

### 5.1 On Init

- Detect MiniPay and wallet.
- `POST /auth/init` → `UserProfile` into global state.

### 5.2 On Lobby Load

- Fetch profile (if not already loaded).
- Optionally fetch `missions` and basic `leaderboard` summary.

### 5.3 On Play Now

- Open Matchmaking modal.
- `POST /match/queue-demo { stake }` when demo credits are active OR `POST /match/queue-escrow { stake, txHash }` when real-money mode is toggled on.
- If response is `matched`, navigate directly to `/match/:matchId`.
- If response is `queued`, keep the modal open and periodically re-hit the queue status endpoint (MiniPay forbids WebSockets, so long-poll HTTP when implemented).

### 5.4 On Match Screen

- Poll `GET /match/:id` on an interval for lifecycle updates.
- First response includes cards & stake.
- Display table UI.
- On Ready (or auto), emit `player_ready`.
- Once `state=result`, open Result overlay.

### 5.5 On Result Actions

- On `Play Again`, reuse last stake or return to Lobby & open Matchmaking.
- On `Equip Now`, call `POST /decks/equip` and update `UserProfile`.

---

## 6. Animation & Motion (Hooks for STYLE_GUIDE)

Front‑end should implement:

- Card deal animation:
  - Cards slide in from center or deck.
- Card flip animation:
  - CSS transform for reveal.
- Pot growth animation:
  - Chip stack scales / bounces when pot is funded.
- Result overlay:
  - Fade‑in + scale with slight bounce on “WINNER” text.
- XP bar:
  - Smooth width animation when XP increases.

Details (timings, easing, etc.) are in **STYLE_GUIDE.md**.

---

## 7. Error & Edge States

- MiniPay not detected:
  - Show error with instruction to open inside MiniPay.
- No opponent found within timeout:
  - Show retry prompt or suggestion to lower stake.
- Network error:
  - Toast: “Connection lost, returning to lobby.”
- Match desync / invalid state:
  - Fallback: show generic error and return to lobby.

This spec should provide enough structure to generate the full React + Tailwind UI and wire it against mocked backend responses initially.
