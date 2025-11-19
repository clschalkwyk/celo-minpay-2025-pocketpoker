import { expect, test, type Page } from '@playwright/test'

const buildProfile = (matches: number) => ({
  id: 'player-001',
  walletAddress: '0xTestUser',
  username: 'Demo_Player',
  avatarUrl: '/deck_1.jpg',
  rankTitle: 'Street Ace',
  level: 5,
  xp: 220,
  xpToNextLevel: 400,
  credits: 49.5,
  stats: {
    matches,
    wins: Math.max(matches - 2, 0),
    losses: matches > 0 ? 2 : 0,
    streak: matches > 0 ? 1 : 0,
  },
  activeDeckId: 'deck-ndebele',
  unlockedDeckIds: ['deck-ndebele', 'deck-midnight', 'deck-creator'],
})

const buildDecks = () => [
  {
    id: 'deck-ndebele',
    name: 'Ndebele Geometry',
    rarity: 'legendary',
    description: 'Warm geometric lines.',
    previewImageUrl: '/deck_3.jpg',
    unlockCondition: 'Starter set',
  },
  {
    id: 'deck-midnight',
    name: 'Midnight Noir',
    rarity: 'rare',
    description: 'Black on black with gold glyphs.',
    previewImageUrl: '/deck_1.jpg',
    unlockCondition: 'Reach level 5',
  },
]

const buildMissionsPayload = () => ({
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

const mockRoutes = async (page: Page, matches: number) => {
  await page.route('**/auth/init', (route) =>
    route.fulfill({
      json: { profile: buildProfile(matches) },
    }),
  )

  await page.route('**/decks', (route) =>
    route.fulfill({
      json: { decks: buildDecks() },
    }),
  )

  await page.route('**/missions?**', (route) =>
    route.fulfill({
      json: buildMissionsPayload(),
    }),
  )

  await page.route('**/missions/progress', async (route) => {
    await route.fulfill({ json: buildMissionsPayload() })
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
}

test.describe('Profile unlock gate', () => {
  test('keeps nickname edits locked before 5 matches', async ({ page }) => {
    await mockRoutes(page, 3)
    await page.goto('/')
    await expect(page.getByText('Stake & Showdown')).toBeVisible()
    await page.getByRole('link', { name: 'Profile' }).click()

    await expect(page.getByText('Locked', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Play 2 more matches to unlock nickname + avatar edits.')).toBeVisible()
    await expect(page.getByPlaceholder('PocketQueen')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Locked until 5 matches' })).toBeDisabled()
  })

  test('unlocks the profile form after 5 matches', async ({ page }) => {
    await mockRoutes(page, 6)
    await page.goto('/')
    await expect(page.getByText('Stake & Showdown')).toBeVisible()
    await page.getByRole('link', { name: 'Profile' }).click()

    await expect(page.getByText('Customization unlocked')).toBeVisible()
    const nicknameInput = page.getByPlaceholder('PocketQueen')
    await expect(nicknameInput).toBeEnabled()
    await nicknameInput.fill('AceChaser')
    await expect(page.getByRole('button', { name: 'Save profile' })).toBeEnabled()
  })
})
