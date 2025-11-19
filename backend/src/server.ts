import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import type { FastifyInstance, FastifyRequest, RouteShorthandOptions } from 'fastify'
import type WebSocket from 'ws'
import { registerAuthRoutes } from './routes/auth.js'
import { registerMetaRoutes } from './routes/meta.js'
import { registerMatchRoutes } from './routes/match.js'
import { registerProfileRoutes } from './routes/profile.js'
import { MatchmakingService } from './services/matchmaking.js'

export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: true })
  await app.register(cors, { origin: true })
  await app.register(websocket)

  const matchmaking = new MatchmakingService(app)
  app.decorate('matchmaking', matchmaking)

  await registerAuthRoutes(app)
  await registerMetaRoutes(app)
  await registerMatchRoutes(app)
  await registerProfileRoutes(app)

  app.register(async (instance) => {
    const wsOptions = { websocket: true } as RouteShorthandOptions
    const wsGet = instance.get as unknown as (
      url: string,
      opts: RouteShorthandOptions,
      handler: (connection: { socket: WebSocket }, request: FastifyRequest<{ Params: { matchId: string } }>) => void,
    ) => void

    wsGet('/ws/:matchId', wsOptions, (connection, request) => {
      const { matchId } = request.params
      matchmaking.registerConnection(matchId, connection.socket)
    })
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 4000)
  buildServer()
    .then((app) => app.listen({ port, host: '0.0.0.0' }))
    .catch((err) => {
      console.error('Failed to start backend', err)
      process.exit(1)
    })
}
