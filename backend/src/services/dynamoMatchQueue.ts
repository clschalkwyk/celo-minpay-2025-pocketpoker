import {
  DynamoDBClient,
  ConditionalCheckFailedException,
  type ConditionalCheckFailedException as ConditionalCheckFailedExceptionType,
} from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  GetCommand,
  type QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'

const TABLE_NAME = process.env.MATCH_TABLE_NAME || process.env.DYNAMO_TABLE_NAME || 'PocketPokerMatches'
const STATUS_GSI = process.env.MATCH_STATUS_GSI || 'GSI_StatusCreatedAt'
const MATCH_WAIT_TIMEOUT_MS = Number(process.env.MATCH_WAIT_TIMEOUT_MS ?? 30_000)

const baseClient = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.ASSET_UPLOAD_REGION || 'us-east-1',
})

const docClient = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: { removeUndefinedValues: true },
})

type QueueResult =
  | { matchId: string; role: 'P1'; status: 'WAITING'; stake: number }
  | { matchId: string; role: 'P2'; status: 'READY'; stake: number }

export const queueForMatch = async (userId: string, stake: number): Promise<QueueResult> => {
  const now = Date.now()
  const waiting = await queryOldestWaitingMatch(now)

  if (waiting) {
    try {
      const updated = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { match_id: waiting.match_id },
          UpdateExpression: 'SET player2_id = :p2, #status = :ready, updated_at = :now',
          ConditionExpression: '#status = :waiting AND attribute_not_exists(player2_id)',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':p2': userId,
            ':waiting': 'WAITING',
            ':ready': 'READY',
            ':now': now,
          },
          ReturnValues: 'ALL_NEW',
        }),
      )

      return {
        matchId: updated.Attributes?.match_id as string,
        role: 'P2',
        status: 'READY',
        stake: Number(updated.Attributes?.stake ?? waiting.stake ?? stake),
      }
    } catch (err) {
      const condFail = err as ConditionalCheckFailedExceptionType
      if (!(condFail instanceof ConditionalCheckFailedException)) {
        throw err
      }
      // Someone else grabbed it; fall through to create a new one
    }
  }

  const matchId = randomUUID()
  const ttl = Math.floor((now + MATCH_WAIT_TIMEOUT_MS) / 1000)
  const item = {
    match_id: matchId,
    player1_id: userId,
    status: 'WAITING',
    stake,
    created_at: now,
    updated_at: now,
    ttl,
  }
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(match_id)',
    }),
  )

  return {
    matchId,
    role: 'P1',
    status: 'WAITING',
    stake,
  }
}

export const getMatchState = async (matchId: string, userId: string) => {
  const now = Date.now()
  const resp = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { match_id: matchId },
    }),
  )
  if (!resp.Item) return { state: 'NOT_FOUND' as const }
  const status = resp.Item.status as string
  const createdAt = Number(resp.Item.created_at)
  const p1 = resp.Item.player1_id as string | undefined
  const p2 = resp.Item.player2_id as string | undefined

  if (p1 !== userId && p2 !== userId) {
    return { state: 'FORBIDDEN' as const }
  }

  if (status === 'WAITING' && now - createdAt > MATCH_WAIT_TIMEOUT_MS) {
    return { state: 'EXPIRED' as const }
  }

  if (status === 'READY' || status === 'IN_PROGRESS') {
    const stake = resp.Item.stake as number | undefined
    return {
      state: 'READY' as const,
      matchId,
      stake: stake ? Number(stake) : undefined,
      players: { p1, p2 },
    }
  }

  return { state: status as 'WAITING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' }
}

export const cancelMatch = async (matchId: string, userId: string) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { match_id: matchId },
      UpdateExpression: 'SET #status = :cancelled, updated_at = :now',
      ConditionExpression: '#status = :waiting AND player1_id = :userId',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':cancelled': 'CANCELLED',
        ':userId': userId,
        ':now': Date.now(),
      },
    }),
  )
}

const queryOldestWaitingMatch = async (now: number) => {
  let resp: QueryCommandOutput
  try {
    resp = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: STATUS_GSI,
        KeyConditionExpression: '#status = :waiting',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':waiting': 'WAITING' },
        ScanIndexForward: true,
        Limit: 5,
      }),
    )
  } catch (err) {
    // fallback: no waiting match
    return undefined
  }
  const items = resp.Items || []
  return items.find((item) => {
    const createdAt = Number(item.created_at)
    return Number.isFinite(createdAt) && now - createdAt < MATCH_WAIT_TIMEOUT_MS
  }) as { match_id: string; stake?: number } | undefined
}
