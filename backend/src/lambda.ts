import awsLambdaFastify from '@fastify/aws-lambda'
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda'
import { buildServer } from './server.js'

type LambdaEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2
type LambdaResponse = APIGatewayProxyResult | APIGatewayProxyStructuredResultV2
type LambdaHandler = (event: LambdaEvent, context: Context) => Promise<LambdaResponse>

console.log('PocketPoker lambda bootstrap starting')
console.log('Environment snapshot:', {
  nodeVersion: process.version,
  pid: process.pid,
  lambdaTaskRoot: process.env.LAMBDA_TASK_ROOT,
  functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
  dataDir: process.env.DATA_DIR,
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in lambda runtime', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in lambda runtime', reason)
})

let lambdaProxy: LambdaHandler | null = null

const stripStagePrefix = (path: string | undefined, stage?: string) => {
  if (!path || !stage) return path
  const stagePrefix = `/${stage}`
  if (path === stagePrefix || path === `${stagePrefix}/`) {
    return '/'
  }
  if (path.startsWith(`${stagePrefix}/`)) {
    return path.slice(stagePrefix.length) || '/'
  }
  return path
}

const normalizeEventPaths = (event: LambdaEvent) => {
  const stage = event.requestContext?.stage
  if (!stage) return

  const rawPath = 'rawPath' in event ? event.rawPath : undefined
  const currentPath = 'path' in event ? event.path : undefined
  const normalized = stripStagePrefix(rawPath ?? currentPath, stage)
  if (!normalized || normalized === rawPath || normalized === currentPath) {
    return
  }

  if ('path' in event) {
    ;(event as APIGatewayProxyEvent).path = normalized
  }
  if ('rawPath' in event) {
    ;(event as APIGatewayProxyEventV2).rawPath = normalized
  }
  if ('requestContext' in event && 'http' in event.requestContext && event.requestContext.http) {
    ;(event.requestContext.http as { path?: string }).path = normalized
  }
}

async function getLambdaProxy(): Promise<LambdaHandler> {
  if (!lambdaProxy) {
    console.log('Bootstrapping Fastify for Lambda')
    try {
      const fastifyInstance = await buildServer()
      lambdaProxy = awsLambdaFastify<LambdaEvent, LambdaResponse>(fastifyInstance, {
        callbackWaitsForEmptyEventLoop: false,
        retainStage: false,
      })
      console.log('Fastify bootstrapped')
    } catch (err) {
      console.error('Failed to initialize Fastify for Lambda', err)
      throw err
    }
  }

  return lambdaProxy
}

export const handler = async (event: LambdaEvent, context: Context): Promise<LambdaResponse> => {
  normalizeEventPaths(event)
  const path = 'rawPath' in event ? event.rawPath : 'path' in event ? event.path : undefined

  console.log('Lambda event received', {
    requestId: context.awsRequestId,
    method: 'httpMethod' in event ? event.httpMethod : event.requestContext?.http?.method,
    path,
    stage: event.requestContext?.stage,
    hasBody: Boolean(event.body),
  })

  try {
    const proxy = await getLambdaProxy()
    const response = await proxy(event, context)
    console.log('Lambda response ready', {
      requestId: context.awsRequestId,
      statusCode: response.statusCode,
    })
    return response
  } catch (err) {
    console.error('Error while handling lambda request', err)
    throw err
  }
}
