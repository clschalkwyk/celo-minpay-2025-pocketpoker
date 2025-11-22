import { expect, test, type Page } from '@playwright/test'

const profile = {
  id: 'player-001',
  walletAddress: '0xQueueTester',
  username: 'QueueTester',
  avatarUrl: '/deck_3.jpg',
  rankTitle: 'Street Ace',
  level: 5,
  xp: 220,
  xpToNextLevel: 400,
  credits: 50,
  stats: { matches: 10, wins: 6, losses: 4, streak: 2 },
  activeDeckId: 'deck-ndebele',
  unlockedDeckIds: ['deck-ndebele', 'deck-midnight'],
}

const decksResponse = {
  decks: [
    {
      id: 'deck-ndebele',
      name: 'Ndebele Geometry',
      rarity: 'legendary',
      description: 'Warm geometric lines.',
      previewImageUrl: '/deck_3.jpg',
      unlockCondition: 'Starter set',
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
      progress: 2,
      rewardXp: 150,
      state: 'active',
      objective: 'matches_played',
    },
  ],
}

const registerRoutes = async (page: Page) => {
  await page.route('**/auth/init', (route) =>
    route.fulfill({
      json: { profile },
    }),
  )
  await page.route('**/decks', (route) => route.fulfill({ json: decksResponse }))
  await page.route('**/missions?**', (route) => route.fulfill({ json: missionsResponse }))
  await page.route('**/missions/progress', async (route) => route.fulfill({ json: missionsResponse }))
  await page.route('**/leaderboard', (route) =>
    route.fulfill({
      json: {
        leaderboard: [
          { id: 'p1', walletAddress: '0xMint', username: 'MintMonarch', elo: 1800, wins: 400, rank: 1 },
        ],
      },
    }),
  )
}

test.describe('Queue error handling', () => {
  test('shows toast when matchmaking fails', async ({ page }) => {
    await registerRoutes(page)
    await page.route('**/match/queue-demo', (route) =>
      route.fulfill({
        status: 500,
        body: 'Server error',
      }),
    )

    await page.goto('/')
    await expect(page.getByText('Stake & Showdown')).toBeVisible()
    await page.getByRole('button', { name: 'Play now' }).click()

    await expect(page.getByText('Server error')).toBeVisible()
    await expect(page.getByText('Matchmaking failed')).toBeVisible()
  })
})
