import { test, expect } from '@playwright/test'

const profileResponse = {
  profile: {
    id: 'player-001',
    walletAddress: '0xTest',
    username: 'E2E Tester',
    avatarUrl: '',
    rankTitle: 'Street Ace',
    level: 5,
    xp: 250,
    xpToNextLevel: 400,
    elo: 1500,
    stats: { matches: 10, wins: 6, losses: 4, streak: 2 },
    activeDeckId: 'deck-midnight',
    unlockedDeckIds: ['deck-midnight'],
  },
}

const decksResponse = {
  decks: [
    {
      id: 'deck-midnight',
      name: 'Midnight Noir',
      rarity: 'rare',
      description: 'Black on black with gold glyphs.',
      previewImageUrl: 'https://example.com/deck.jpg',
      unlockCondition: 'Reach Level 5',
    },
  ],
}

const missionsResponse = {
  missions: [
    {
      id: 'mission-1',
      title: 'Warm-up Laps',
      description: 'Play 3 matches today.',
      type: 'daily',
      target: 3,
      progress: 1,
      rewardXp: 150,
      state: 'active',
    },
  ],
}

const leaderboardResponse = {
  leaderboard: [
    { id: 'p1', walletAddress: '0xMint', username: 'MintMonarch', elo: 1800, wins: 400, rank: 1 },
  ],
}

test.describe('PocketPoker lobby', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/init', (route) => route.fulfill({ json: profileResponse }))
    await page.route('**/decks', (route) => route.fulfill({ json: decksResponse }))
    await page.route('**/missions', (route) => route.fulfill({ json: missionsResponse }))
    await page.route('**/leaderboard', (route) => route.fulfill({ json: leaderboardResponse }))
    await page.route('**/match/queue-demo', (route) =>
      route.fulfill({ json: { status: 'matched', match: { ...mockMatch } } }),
    )
  })

  test('renders splash and navigates to lobby', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Connecting via MiniPay')).toBeVisible()
    await page.waitForTimeout(100) // allow mocked profile to resolve

    await expect(page.getByText('Stake & Showdown')).toBeVisible()
    await expect(page.getByText('Play now')).toBeVisible()

    await page.click('text=Decks')
    await expect(page.getByText('Deck Themes')).toBeVisible()
  })
})

const mockMatch = {
  id: 'match-demo',
  stake: 1,
  pot: 2,
  state: 'active',
  playerA: {
    playerId: 'player-001',
    walletAddress: '0xTest',
    username: 'E2E Tester',
    deckId: 'deck-midnight',
    cards: [
      { rank: 'A', suit: '♠', code: 'A♠' },
      { rank: 'K', suit: '♣', code: 'K♣' },
      { rank: 'Q', suit: '♦', code: 'Q♦' },
    ],
    ready: true,
  },
  playerB: {
    playerId: 'bot',
    walletAddress: '0xBot',
    username: 'CPU_Bot',
    deckId: 'deck-midnight',
    cards: [
      { rank: '9', suit: '♠', code: '9♠' },
      { rank: '7', suit: '♣', code: '7♣' },
      { rank: '5', suit: '♦', code: '5♦' },
    ],
    ready: false,
  },
}
