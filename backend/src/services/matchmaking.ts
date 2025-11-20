import { EventEmitter } from 'node:events'
import type { FastifyInstance } from 'fastify'
import type WebSocket from 'ws'
import { customAlphabet } from 'nanoid'
import { store } from '../data/store.js'
import type { Match, MatchmakingEvent, QueueOptions, WalletAddress } from '../types.js'
import { createMatchWithCards, resolveMatch } from './gameLogic.js'

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 12)

export type QueueResult =
  | { status: 'queued'; ticketId: string }
  | { status: 'matched'; match: Match }

export class MatchmakingService extends EventEmitter {
  private connections = new Map<string, Set<WebSocket>>()
  private timeouts = new Map<string, NodeJS.Timeout[]>()

  constructor(private app: FastifyInstance) {
    super()
  }

  async queuePlayer(walletAddress: WalletAddress, stake: number, options?: QueueOptions): Promise<QueueResult> {
    const player = await store.getOrCreateProfile(walletAddress)

    if (options?.botOpponent) {
      const bot = store.createBotProfile()
      const match = await createMatchWithCards(stake, player, bot)
      this.broadcast(match.id, { type: 'match_init', payload: match })
      this.scheduleResult(match)
      return { status: 'matched', match }
    }

    const ticketId = nanoid()
    await store.enqueue({ id: ticketId, stake, walletAddress, enqueuedAt: Date.now() })
    const pair = await store.dequeuePair(stake)
    if (!pair) return { status: 'queued', ticketId }

    const [a, b] = pair
    const playerA = await store.getOrCreateProfile(a.walletAddress)
    const playerB = await store.getOrCreateProfile(b.walletAddress)
    const match = await createMatchWithCards(stake, playerA, playerB)
    this.broadcast(match.id, { type: 'match_init', payload: match })
    this.scheduleResult(match)
    return { status: 'matched', match }
  }

  cancelQueue(walletAddress: WalletAddress) {
    return store.clearTicket(walletAddress)
  }

  registerConnection(matchId: string, socket: WebSocket) {
    const sockets = this.connections.get(matchId) ?? new Set<WebSocket>()
    sockets.add(socket)
    this.connections.set(matchId, sockets)
    socket.once('close', () => {
      sockets.delete(socket)
      if (!sockets.size) {
        this.connections.delete(matchId)
      }
    })

    void store
      .getMatch(matchId)
      .then((existing) => {
        if (existing) socket.send(JSON.stringify({ type: 'state_update', payload: existing }))
      })
      .catch((err) => {
        this.app.log.error({ err }, 'failed to fetch match for websocket')
      })
  }

  private broadcast(matchId: string, event: MatchmakingEvent) {
    const sockets = this.connections.get(matchId)
    if (!sockets) return
    const payload = JSON.stringify(event)
    for (const socket of sockets) {
      try {
        socket.send(payload)
      } catch (err) {
        this.app.log.warn({ err }, 'failed to send websocket event')
      }
    }
  }

  private scheduleResult(match: Match) {
    const timers: NodeJS.Timeout[] = []
    const readyTimer = setTimeout(() => {
      match.playerA.ready = true
      if (match.playerB) match.playerB.ready = true
      this.broadcast(match.id, { type: 'state_update', payload: match })
    }, 800)
    timers.push(readyTimer)

    const resultTimer = setTimeout(() => {
      void resolveMatch(match)
        .then((resolved) => {
          this.broadcast(match.id, { type: 'result', payload: resolved })
        })
        .catch((err) => {
          this.app.log.error({ err }, 'failed to resolve match')
        })
    }, 2500)
    timers.push(resultTimer)
    this.timeouts.set(match.id, timers)
  }
}
