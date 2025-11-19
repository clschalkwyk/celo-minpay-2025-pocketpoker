# STYLE_GUIDE – PocketPoker (Web Mini App)

Goal: Consistent, playful, slightly “esports” UI with African‑inspired flair and MiniPay‑friendly aesthetics. Everything should feel **fast**, **clean**, and **a little flashy**, but not visually noisy.

---

## 1. Brand Tone

- **Vibe:** Neon poker arcade meets mobile casual game.
- **Energy:** Competitive, fun, not sleazy‑casino.
- **Personality:** Confident, cheeky, but readable.
- **Target:** Mobile users in emerging markets via MiniPay.

Copy should be short, punchy, and informal:
- “You smashed it.”
- “Tough beat, try again.”
- “New deck unlocked – flex time.”

---

## 2. Color System

We’ll use a **dark base** with neon accents and a few warm cultural tones.

### 2.1 Core Palette

- **Background (Primary App BG)**  
  - `#050816` – Deep navy/space.
- **Surface / Card BG**  
  - `#0B1020` – Slightly lighter for panels.
- **Primary Accent**  
  - `#35D07F` – Celo mint green (MiniPay alignment).
- **Secondary Accent**  
  - `#8B5CF6` – Electric violet/purple.
- **Highlight Accent**  
  - `#F97316` – Warm orange for alerts and callouts.

### 2.2 Functional Colors

- **Text Primary**: `#F9FAFB` (near‑white)
- **Text Secondary**: `#9CA3AF` (muted grey)
- **Borders / Dividers**: `#1F2933`
- **Success**: `#22C55E` (subtle green)
- **Error**: `#EF4444` (red)
- **Warning**: `#FACC15` (amber)
- **Info**: `#38BDF8` (sky blue)

### 2.3 Deck Theme Integration

Card deck themes can introduce their own mini‑palettes for card backs, but should not change the core app layout colors.

Examples:
- Midnight Noir: black + gold.
- Celo Cybermint: mint + neon grid.
- Ndebele Geometry: charcoal + geometric lines in muted warm colors.

---

## 3. Typography

Use a clean, geometric sans‑serif that feels modern and game‑ready.

- **Primary Font:** `Inter` or `Outfit` (Google Fonts, whichever you prefer to import).
- **Fallbacks:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

### 3.1 Font Sizes

- Display / Hero: `text-3xl` to `text-4xl` (screen titles like “WINNER!”)
- Section Titles: `text-xl`
- Body Text: `text-sm` to `text-base`
- Labels / UI Bits: `text-xs`

### 3.2 Weights

- Titles & Buttons: `font-semibold` or `font-bold`
- Body: `font-normal`
- Muted meta text: `font-medium` with `text-gray-400`

---

## 4. Spacing & Layout

General spacing scale:
- Base unit: `4px`
- Tailwind mapping: `1 = 4px, 2 = 8px, 4 = 16px, 6 = 24px, 8 = 32px` etc.

Rules:
- Main screen padding: `p-4` on mobile.
- Cards / panels: `p-4` to `p-6` inside.
- Vertical rhythm: space sections with `gap-4` or `space-y-4`.
- Keep all tap targets ≥ `44x44px`.

Layout style:
- Use vertical stacks with clear grouping.
- Center main CTA buttons.
- Avoid dense tables on mobile – use stacked rows with clear hierarchy.

---

## 5. Components – Visual Style

### 5.1 Buttons

**Primary Button**
- Background: gradient from `#35D07F` to `#8B5CF6` or solid `#35D07F`.
- Text: white.
- Radius: `rounded-full` or `rounded-xl`.
- Padding: `px-4 py-2` minimum.
- Shadow: soft glow (`shadow-lg`) with subtle colored shadow.

**Secondary Button**
- Background: transparent with border: `border border-gray-600`.
- Text: `text-gray-100`.
- Hover: border and text accent lighten slightly.

**Danger Button (if used)**
- Background: `#B91C1C`.
- Text: white.

Hover / active states:
- Slight scale `scale-105` on hover.
- Slight press depth `scale-95` on active.

### 5.2 Cards / Panels

- Background: `bg-[#0B1020]` / `bg-slate-900` with `bg-opacity-80` if needed.
- Radius: `rounded-2xl`.
- Border: `border border-slate-800` optional.
- Shadow: `shadow-md` or `shadow-lg` for focus panels (Play card, Modals).

### 5.3 Modals

- Background overlay: `bg-black bg-opacity-70`.
- Modal surface: same as card but with slightly stronger shadow + border.
- Animate with fade + scale‑up.

### 5.4 Inputs (Stake Selector, etc.)

- Use pill‑like segmented controls for stake amounts.
- Selected stake: filled pill with primary accent background, white text.
- Unselected: outline pill with muted text.

---

## 6. Cards & Game Table Visuals

### 6.1 Playing Cards

- Base card shape:
  - Ratio: 5:7 (approx), `rounded-xl`.
- Background:
  - Use deck theme for card back.
  - Front uses classic white/cream with clear suits and ranks.
- Suits:
  - Spades/Clubs: near‑black.
  - Hearts/Diamonds: rich red, slightly neon for style.
- Rank styling:
  - Large enough to read quickly on mobile.
  - Use bold weights and high contrast.

### 6.2 Table

- Felt color: dark green or deep teal: `#064E3B` or `#0F766E` with blurred vignette.
- Pot display:
  - Floating chip stack with animated glow.
- Use a subtle radial gradient behind cards to focus attention.

---

## 7. Motion & Animation

We want **snappy, satisfying micro‑animations**, not slow cinematic bullshit.

### 7.1 Card Deal

- Duration: ~250–300ms per card.
- Ease: `cubic-bezier(0.22, 0.61, 0.36, 1)` (snappy).
- Animation: translate + fade‑in + slight rotation.

### 7.2 Card Flip

- Duration: 250ms.
- Use CSS `transform: rotateY(180deg)` with backface‑visibility trick.
- Stagger opponent & player flip for drama (small delay).

### 7.3 Pot Animation

- When pot is set or increased:
  - Quick scale‑up (`scale-110`) then settle back (`scale-100`).
- On win:
  - Short coin/particle burst effect if possible.

### 7.4 Result Overlay

- Fade + scale from 0.9 → 1.
- “WINNER!” text:
  - Slight bounce (`scale-110` → `scale-100`).

### 7.5 XP Bar

- Animate width from old XP to new XP over 300–400ms.
- If level‑up, briefly flash bar in accent color + small “Level Up!” toast.

---

## 8. Iconography

- Use a consistent icon set, e.g. Heroicons or Lucide.
- Keep stroke width consistent.
- Icons used for:
  - Balance (wallet icon).
  - Stake (chip icon).
  - Missions (target or flag).
  - Leaderboard (trophy).
  - Decks (cards icon).

Coloring:
- Default: `text-gray-400`.
- Active / hovered: `text-primaryAccent` (`#35D07F`).

---

## 9. Responsive Behavior

This is primarily a **mobile‑first** UI:

- Design for ~360–414px width first.
- Use single‑column layout.
- On larger screens (tablet/desktop):
  - Center content with max width ~`max-w-md` or `max-w-lg`.
  - Leave background gradient visible.

---

## 10. Tone & Microcopy Examples

- Result screen messages:
  - Win: “You cleaned them out.”
  - Loss: “Brutal beat. Shuffle up again?”
- Missions:
  - “Warm‑up laps: Play 3 matches.”
  - “Prove it: Win 1 game today.”
- Deck unlocks:
  - “New deck unlocked: Midnight Noir. Time to look dangerous.”

Keep language:
- Light, fun, non‑toxic.
- Short enough to not clutter mobile UI.

---

## 11. Tailwind Setup Hints

In `tailwind.config.js`, define:

- Custom colors:
  - `brand-bg`, `brand-surface`, `brand-primary`, `brand-secondary`, etc.
- Font family:
  - `fontFamily: { sans: ['Inter', 'system-ui', ...] }`
- Radius scale:
  - `2xl` for cards and modals.

Example snippet:

```js
theme: {
  extend: {
    colors: {
      'pp-bg': '#050816',
      'pp-surface': '#0B1020',
      'pp-primary': '#35D07F',
      'pp-secondary': '#8B5CF6',
      'pp-highlight': '#F97316',
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      '2xl': '1.25rem',
    },
  },
}
```

This style guide should be enough to keep components coherent and let you “vibe code” the UI with a consistent, funky look and feel.
