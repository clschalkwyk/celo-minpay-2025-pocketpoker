import type { FastifyInstance } from 'fastify'
import { customAlphabet } from 'nanoid'
import { store } from '../data/store.js'
import type { Match, QueueOptions, WalletAddress } from '../types.js'
import { createMatchWithCards, resolveMatch } from './gameLogic.js'

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 12)

export type QueueResult =
  | { status: 'queued'; ticketId: string }
  | { status: 'matched'; match: Match }

export class MatchmakingService {
  constructor(private app: FastifyInstance) {}

  async queuePlayer(walletAddress: WalletAddress, stake: number, options?: QueueOptions): Promise<QueueResult> {
    const player = await store.getOrCreateProfile(walletAddress)
    this.app.log.info(`MatchmakingService: queuePlayer for ${walletAddress}, stake=${stake}, escrowId=${options?.escrowId}, botOpponent=${options?.botOpponent}`)

    if (options?.botOpponent) {
      const bot = store.createBotProfile()
      this.app.log.info(`MatchmakingService: Creating bot match for ${walletAddress}`)
      const match = await createMatchWithCards(stake, player, bot, options?.escrowId)
      if (!match.escrowId) {
        this.scheduleResult(match)
      }
      return { status: 'matched', match }
    }

    const ticketId = nanoid()
    await store.enqueue({ id: ticketId, stake, walletAddress, enqueuedAt: Date.now() })
    const pair = await store.dequeuePair(stake)
    if (!pair) {
      this.app.log.info(`MatchmakingService: No pair found for ${walletAddress}, ticketId=${ticketId}. Queued.`)
      return { status: 'queued', ticketId }
    }

    const [a, b] = pair
    const playerA = await store.getOrCreateProfile(a.walletAddress)
    const playerB = await store.getOrCreateProfile(b.walletAddress)
    this.app.log.info(`MatchmakingService: Pair found for ${a.walletAddress} and ${b.walletAddress}, stake=${stake}. Creating match.`)
    const match = await createMatchWithCards(stake, playerA, playerB, options?.escrowId)
    await store.mapTicketsToMatch([a.id, b.id], match.id)
    if (!match.escrowId) {
      this.scheduleResult(match)
    }
    return { status: 'matched', match }
  }

  cancelQueue(walletAddress: WalletAddress) {
    return store.clearTicket(walletAddress)
  }

  private scheduleResult(match: Match) {
    setTimeout(() => {
      match.playerA.ready = true
      if (match.playerB) match.playerB.ready = true
      void store
        .saveMatch(match)
        .catch((err) => this.app.log.error({ err }, 'failed to persist match ready state'))
    }, 800)

    setTimeout(() => {
      void resolveMatch(match)
        .catch((err) => {
          this.app.log.error({ err }, 'failed to resolve match')
        })
    }, 2500)
  }
}
