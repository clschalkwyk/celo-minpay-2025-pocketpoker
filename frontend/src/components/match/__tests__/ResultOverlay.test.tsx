import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultOverlay } from '../ResultOverlay'
import type { MatchState } from '../../../types'

const baseMatch: MatchState = {
  id: 'match-test',
  stake: 1,
  pot: 2,
  phase: 'result',
  you: {
    id: 'me',
    username: 'Tester',
    avatarUrl: '',
    deckId: 'deck',
    cards: [],
    ready: true,
    isYou: true,
  },
  opponent: {
    id: 'opp',
    username: 'Opponent',
    avatarUrl: '',
    deckId: 'deck',
    cards: [],
    ready: true,
    isYou: false,
  },
  result: { winner: 'you', summary: 'You cleaned them out.' },
}

describe('ResultOverlay', () => {
  it('shows winner copy and fires callbacks', async () => {
    const onPlayAgain = vi.fn()
    const onBack = vi.fn()
    const user = userEvent.setup()

    render(<ResultOverlay match={baseMatch} onPlayAgain={onPlayAgain} onBack={onBack} />)

    expect(screen.getByText('WINNER')).toBeInTheDocument()

    await user.click(screen.getByText('Play again'))
    await user.click(screen.getByText('Return to Lobby'))

    expect(onPlayAgain).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders loss state when opponent wins', () => {
    render(
      <ResultOverlay
        match={{ ...baseMatch, result: { winner: 'opponent', summary: 'Tough beat' } }}
        onPlayAgain={() => {}}
        onBack={() => {}}
      />,
    )
    expect(screen.getByText('YOU LOST')).toBeInTheDocument()
  })
})
