import { describe, expect, it } from 'vitest'
import type { Card } from '../../types'
import { evaluateHand } from '../gameLogic'

const makeCards = (codes: string[]): Card[] =>
  codes.map((code) => ({
    rank: code.slice(0, -1),
    suit: code.slice(-1),
    code,
  }))

describe('evaluateHand', () => {
  it('scores straight flush highest', () => {
    const straightFlush = makeCards(['10♠', 'J♠', 'Q♠'])
    const pair = makeCards(['A♠', 'A♥', '3♣'])

    expect(evaluateHand(straightFlush).score).toBeGreaterThan(evaluateHand(pair).score)
  })

  it('detects pairs vs high card', () => {
    const pair = makeCards(['9♠', '9♥', '4♦'])
    const high = makeCards(['K♠', 'J♦', '7♥'])
    expect(evaluateHand(pair).score).toBeGreaterThan(evaluateHand(high).score)
  })
})
