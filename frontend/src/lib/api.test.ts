import { describe, expect, it } from 'vitest'
import { mapMatchPayloadToState, type MatchPayload } from './api'

const basePayload: MatchPayload = {
  id: 'match-xyz',
  stake: 5,
  pot: 10,
  state: 'finished',
  playerA: {
    playerId: 'p1',
    walletAddress: '0xPlayerOne',
    username: 'Player One',
    deckId: 'deck-a',
    cards: [{ rank: 'A', suit: '♠', code: 'A♠' }],
    ready: true,
  },
  playerB: {
    playerId: 'p2',
    walletAddress: '0xPlayerTwo',
    username: 'Player Two',
    deckId: 'deck-b',
    cards: [{ rank: 'K', suit: '♦', code: 'K♦' }],
    ready: true,
  },
  winner: '0xPlayerTwo',
  resultSummary: 'Tough beat. Shuffle again.',
}

describe('mapMatchPayloadToState', () => {
  it('treats the viewer wallet as the local player even when they are playerB', () => {
    const state = mapMatchPayloadToState(basePayload, '0xplayertwo')
    expect(state.you.username).toBe('Player Two')
    expect(state.opponent.username).toBe('Player One')
    expect(state.result?.winner).toBe('you')
    expect(state.result?.summary).toBe('You cleaned them out.')
  })

  it('keeps perspective when the viewer is playerA and loses', () => {
    const losingPayload = { ...basePayload, winner: '0xPlayerTwo' }
    const state = mapMatchPayloadToState(losingPayload, '0xplayerone')
    expect(state.you.username).toBe('Player One')
    expect(state.opponent.username).toBe('Player Two')
    expect(state.result?.winner).toBe('opponent')
    expect(state.result?.summary).toBe('Tough beat. Shuffle again.')
  })

  it('enters ready phase until both players report ready', () => {
    const notReadyPayload: MatchPayload = {
      ...basePayload,
      state: 'active',
      winner: undefined,
      resultSummary: undefined,
      playerA: { ...basePayload.playerA, ready: true },
      playerB: { ...basePayload.playerB, ready: false },
    }
    const state = mapMatchPayloadToState(notReadyPayload, '0xplayerone')
    expect(state.phase).toBe('ready')
    expect(state.you.ready).toBe(true)
    expect(state.opponent.ready).toBe(false)
  })
})
