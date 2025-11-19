import { expect, test, type Page } from '@playwright/test'

const price = 12
const targetDeckId = 'deck-sunrise'

const buildProfile = (ownsDeck: boolean) => ({
  id: 'player-001',
  walletAddress: '0xDeckTester',
  username: 'DeckTester',
  avatarUrl: '/deck_3.jpg',
  rankTitle: 'Street Ace',
  level: 5,
  xp: 220,
  xpToNextLevel: 400,
  credits: 48,
  stats: { matches: 7, wins: 4, losses: 3, streak: 1 },
  activeDeckId: 'deck-ndebele',
  unlockedDeckIds: ownsDeck ? ['deck-ndebele', targetDeckId] : ['deck-ndebele'],
})

const decksResponse = () => ({
  decks: [
    {
      id: 'deck-ndebele',
      name: 'Ndebele Geometry',
      rarity: 'legendary',
      description: 'Warm geometric lines.',
      previewImageUrl: '/deck_3.jpg',
      unlockCondition: 'Starter set',
    },
    {
      id: targetDeckId,
      name: 'Sunrise Mirage',
      rarity: 'rare',
      description: 'Heat-wave gradients with pearlescent flares.',
      previewImageUrl: '/deck_6.png',
      unlockCondition: 'Creator drop',
      price,
      creatorName: 'Pocket Creator',
    },
  ],
})

const missionsResponse = () => ({
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
})

const registerRoutes = async (page: Page) => {
  let ownsDeck = false

  await page.route('**/auth/init', (route) =>
    route.fulfill({
      json: { profile: buildProfile(ownsDeck) },
    }),
  )

  await page.route('**/decks', (route) =>
    route.fulfill({
      json: decksResponse(),
    }),
  )

  await page.route('**/missions?**', (route) => route.fulfill({ json: missionsResponse() }))

  await page.route('**/missions/progress', async (route) => {
    await route.fulfill({ json: missionsResponse() })
  })

  await page.route('**/leaderboard', (route) =>
    route.fulfill({
      json: {
        leaderboard: [
          { id: 'p1', walletAddress: '0xMint', username: 'MintMonarch', elo: 1800, wins: 400, rank: 1 },
        ],
      },
    }),
  )

  await page.route('**/creator-decks', (route) =>
    route.fulfill({
      json: { submissions: [] },
    }),
  )

  await page.route('**/decks/purchase', async (route) => {
    ownsDeck = true
    await route.fulfill({
      json: {
        profile: buildProfile(true),
        purchase: {
          id: 'purchase-1',
          deckId: targetDeckId,
          deckName: 'Sunrise Mirage',
          price,
          platformFee: 0.24,
          creatorShare: price - 0.24,
          buyer: '0xDeckTester',
          purchasedAt: Date.now(),
        },
      },
    })
  })
}

test.describe('Deck purchases', () => {
  test('unlocks a deck after purchase flow', async ({ page }) => {
    await registerRoutes(page)

    await page.goto('/')
    await expect(page.getByText('Stake & Showdown')).toBeVisible()
    await page.getByRole('link', { name: 'Decks' }).click()

    const purchaseButton = page.getByRole('button', { name: `Buy for R${price.toFixed(2)}` })
    await expect(purchaseButton).toBeVisible()
    await purchaseButton.click()

    await page.waitForResponse('**/decks/purchase')
    await expect(page.getByText('Deck unlocked!')).toBeVisible()
    await expect(purchaseButton).toBeHidden()
    await expect(page.getByRole('button', { name: 'Equip deck' })).toBeVisible()
  })
})
