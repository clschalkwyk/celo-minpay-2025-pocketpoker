import { expect, test } from '@playwright/test'

const buildMissionPayload = (progress: number) => ({
  missions: [
    {
      id: 'mission-1',
      title: 'Warm-up Laps',
      description: 'Play 3 matches today.',
      type: 'daily',
      target: 3,
      progress,
      rewardXp: 150,
      state: progress >= 3 ? 'completed' : 'active',
      objective: 'matches_played',
    },
  ],
})

const mockMatch = {
  id: 'match-demo',
  stake: 1,
  pot: 2,
  phase: 'result' as const,
  state: 'finished',
  playerA: {
    playerId: 'player-001',
    walletAddress: '0xTest',
    username: 'E2E Tester',
    deckId: 'deck-ndebele',
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
    deckId: 'deck-creator',
    cards: [
      { rank: '9', suit: '♠', code: '9♠' },
      { rank: '7', suit: '♣', code: '7♣' },
      { rank: '5', suit: '♦', code: '5♦' },
    ],
    ready: true,
  },
  winner: '0xTest',
  resultSummary: 'You outplayed your opponent.',
}

test.describe('Match + mission flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/init', (route) =>
      route.fulfill({
        json: {
          profile: {
            id: 'player-001',
            walletAddress: '0xTest',
            username: 'E2E Tester',
            avatarUrl: '/deck_3.jpg',
            rankTitle: 'Street Ace',
            level: 5,
            xp: 220,
            xpToNextLevel: 400,
            elo: 1500,
            stats: { matches: 12, wins: 7, losses: 5, streak: 1 },
            activeDeckId: 'deck-ndebele',
            unlockedDeckIds: ['deck-ndebele', 'deck-creator'],
          },
        },
      }),
    )

    await page.route('**/decks', (route) =>
      route.fulfill({
        json: {
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
              id: 'deck-creator',
              name: 'Creator Skin',
              rarity: 'legendary',
              description: 'Community drop.',
              previewImageUrl: '/deck_5.jpg',
              unlockCondition: 'Creator drop',
            },
          ],
        },
      }),
    )

    await page.route('**/leaderboard', (route) =>
      route.fulfill({
        json: {
          leaderboard: [
            { id: 'p1', walletAddress: '0xMint', username: 'MintMonarch', elo: 1800, wins: 400, rank: 1 },
          ],
        },
      }),
    )

    let missionProgress = 1

    await page.route('**/missions?**', (route) => {
      route.fulfill({ json: buildMissionPayload(missionProgress) })
    })

    await page.route('**/missions/progress', async (route) => {
      try {
        const body = (await route.request().postDataJSON?.()) as { matchesPlayed?: number } | undefined
        missionProgress = Math.min(3, missionProgress + (body?.matchesPlayed ?? 0))
      } catch (err) {
        console.error('Failed to read progress payload', err)
      }
      await route.fulfill({ json: buildMissionPayload(missionProgress) })
    })

    await page.route('**/match/queue-demo', (route) =>
      route.fulfill({
        json: {
          status: 'matched',
          match: mockMatch,
        },
      }),
    )
  })

  test('queue match updates missions and shows local decks', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Stake & Showdown')).toBeVisible()

    await page.getByRole('button', { name: 'Play now' }).click()

    await expect(page.getByText(/Match #/)).toBeVisible()

    const deckTexture = page.locator('[style*="/deck_3.jpg"]')
    await expect(deckTexture.first()).toBeVisible()

    const returnButton = page.getByRole('button', { name: 'Return to Lobby' })
    await returnButton.waitFor({ timeout: 8000 })
    await returnButton.click()

    await expect(page.getByText('Stake & Showdown')).toBeVisible()
    await page.getByRole('link', { name: 'Missions' }).click()

    await expect(page.getByText('Missions')).toBeVisible()
    await expect(page.getByText('2/3')).toBeVisible()
  })
})
