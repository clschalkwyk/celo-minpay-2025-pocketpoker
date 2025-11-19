import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UIStoreProvider, useUIStore } from '../../state/UIStoreProvider'
import { AppProviders } from '../../providers/AppProviders'
import { useMatch } from '../useMatch'
import type { UserProfile } from '../../types'
import { Api, type MatchPayload } from '../../lib/api'

const TestUIStoreHarness = () => {
  const { selectedStake, setSelectedStake } = useUIStore()
  return (
    <div>
      <p data-testid="stake-value">{selectedStake}</p>
      <button onClick={() => setSelectedStake(5)}>set</button>
    </div>
  )
}

const sampleProfile: UserProfile = {
  id: 'tester',
  walletAddress: '0xDemoUser',
  username: 'Tester',
  avatarUrl: '',
  rankTitle: 'Rogue',
  level: 5,
  xp: 200,
  xpToNextLevel: 400,
  elo: 1200,
  stats: { matches: 10, wins: 6, losses: 4, streak: 1 },
  activeDeckId: 'deck',
  unlockedDeckIds: ['deck'],
}

const matchPayload: MatchPayload = {
  id: 'match-1234',
  stake: 5,
  pot: 10,
  state: 'active',
  playerA: {
    playerId: 'tester',
    walletAddress: '0xDemoUser',
    username: 'Tester',
    deckId: 'deck',
    cards: [],
    ready: true,
  },
  playerB: {
    playerId: 'opp',
    walletAddress: '0xOpp',
    username: 'Opponent',
    deckId: 'deck',
    cards: [],
    ready: false,
  },
}

const MatchHarness = () => {
  const { queueForMatch, match } = useMatch()
  return (
    <div>
      <button onClick={() => queueForMatch(5)}>queue</button>
      <p data-testid="phase">{match?.phase ?? 'none'}</p>
      <p data-testid="result">{match?.result?.summary ?? ''}</p>
    </div>
  )
}

describe('state hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(Api, 'initProfile').mockResolvedValue({ profile: sampleProfile })
    vi.spyOn(Api, 'queueMatch').mockResolvedValue({ status: 'matched', match: matchPayload })
    vi.spyOn(Api, 'openMatchSocket').mockImplementation(() => ({ close: vi.fn() } as unknown as WebSocket))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates selected stake in UI store', async () => {
    const user = userEvent.setup()
    render(
      <UIStoreProvider>
        <TestUIStoreHarness />
      </UIStoreProvider>,
    )

    expect(screen.getByTestId('stake-value')).toHaveTextContent('1')
    await user.click(screen.getByText('set'))
    expect(screen.getByTestId('stake-value')).toHaveTextContent('5')
  })

  it('queues a match via useMatch', async () => {
    const user = userEvent.setup()

    render(
      <AppProviders>
        <MatchHarness />
      </AppProviders>,
    )

    await user.click(screen.getByText('queue'))
    await waitFor(() => expect(Api.queueMatch).toHaveBeenCalled())

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('active'))
  })
})
