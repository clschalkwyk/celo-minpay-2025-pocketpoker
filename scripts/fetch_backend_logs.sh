#!/usr/bin/env bash
set -euo pipefail

# Fetch the last 30 minutes of backend Lambda logs from CloudWatch.

LOG_GROUP="/aws/lambda/pocketpoker-backend"
START_TIME=$(date -v-30M +%s 2>/dev/null || date -d '30 minutes ago' +%s)
END_TIME=$(date +%s)

QUERY='fields @timestamp, @message | sort @timestamp desc | limit 200'

echo "Starting query for ${LOG_GROUP} from $(date -r "${START_TIME}" 2>/dev/null || date -d @"${START_TIME}") to $(date -r "${END_TIME}" 2>/dev/null || date -d @"${END_TIME}")..."
QUERY_ID=$(aws logs start-query \
  --log-group-name "${LOG_GROUP}" \
  --start-time "${START_TIME}" \
  --end-time "${END_TIME}" \
  --query-string "${QUERY}" \
  --output text \
  --query 'queryId')

echo "Query ID: ${QUERY_ID}"
echo "Waiting for results..."
sleep 2

aws logs get-query-results --query-id "${QUERY_ID}"

