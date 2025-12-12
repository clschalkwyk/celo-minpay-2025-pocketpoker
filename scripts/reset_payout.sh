#!/usr/bin/env bash
set -euo pipefail

# Reset payout status for a given match so it can be reprocessed.
# Usage: MATCH_ID=<id> bash scripts/reset_payout.sh

BACKEND_URL="${BACKEND_URL:-https://9k6n7awi42.execute-api.af-south-1.amazonaws.com/prod}"
ADMIN_API_KEY="${ADMIN_API_KEY:-}"
MATCH_ID="${MATCH_ID:-}"

if [ -z "${ADMIN_API_KEY}" ]; then
  echo "ERROR: ADMIN_API_KEY is not set."
  exit 1
fi

if [ -z "${MATCH_ID}" ]; then
  echo "ERROR: MATCH_ID is required (export MATCH_ID=...)."
  exit 1
fi

echo "Resetting payout state for match ${MATCH_ID} ..."
curl -sS -X POST \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"matchId\":\"${MATCH_ID}\"}" \
  "${BACKEND_URL}/admin/reset-payout" \
  | jq .
