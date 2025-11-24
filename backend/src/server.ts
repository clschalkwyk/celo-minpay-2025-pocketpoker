import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyPlugin from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { registerAuthRoutes } from './routes/auth.js'
import { registerMetaRoutes } from './routes/meta.js'
import { registerMatchRoutes } from './routes/match.js'
import { registerProfileRoutes } from './routes/profile.js'
import { MatchmakingService } from './services/matchmaking.js'
import { registerUploadRoutes } from './routes/uploads.js'

// Define the root plugin
async function appPlugin(app: FastifyInstance) {
  const matchmaking = new MatchmakingService(app)
  app.decorate('matchmaking', matchmaking)

  // Register all individual route plugins
  await app.register(registerAuthRoutes)
  await app.register(registerMetaRoutes)
  await app.register(registerMatchRoutes)
  await app.register(registerProfileRoutes)
  await app.register(registerUploadRoutes)
}

export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: true,
    // Allow up to ~6MB JSON bodies for image data URLs from the creator portal.
    bodyLimit: 6 * 1024 * 1024,
  })

  // This hook will remove the API Gateway stage from the path.
  // This is necessary because API Gateway includes the stage in the path
  // passed to the Lambda function, but Fastify's router doesn't know about it.
  app.addHook('onRequest', (request, reply, done) => {
    if (request.raw.url && request.raw.url.startsWith('/prod')) {
      request.raw.url = request.raw.url.substring(5); // 5 is the length of '/prod'
      if (request.raw.url === '') {
        request.raw.url = '/';
      }
    }
    done();
  });

  await app.register(cors, { origin: true })

  // Register the root plugin
  await app.register(fastifyPlugin(appPlugin))

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

const isLambdaEnv = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.LAMBDA_TASK_ROOT)
const isDirectRun = Boolean(process.argv[1]) && import.meta.url === `file://${process.argv[1]}`

if (isDirectRun && !isLambdaEnv) {
  const port = Number(process.env.PORT ?? 4000)
  buildServer()
    .then((app) => app.listen({ port, host: '0.0.0.0' }))
    .catch((err) => {
      console.error('Failed to start backend', err)
      process.exit(1)
    })
}
