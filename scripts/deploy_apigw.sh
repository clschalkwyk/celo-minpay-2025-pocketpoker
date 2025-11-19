#!/usr/bin/env bash
set -euo pipefail

API_NAME="${API_NAME:-pocketpoker-backend-http}"
API_STAGE="${API_STAGE:-prod}"
AWS_REGION="${AWS_REGION:-af-south-1}"
LAMBDA_NAME="${LAMBDA_NAME:-pocketpoker-backend}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"

LAMBDA_ARN=$(aws lambda get-function \
  --function-name "$LAMBDA_NAME" \
  --region "$AWS_REGION" \
  --query 'Configuration.FunctionArn' \
  --output text)

if [[ "$LAMBDA_ARN" == "None" || -z "$LAMBDA_ARN" ]]; then
  echo "Lambda $LAMBDA_NAME not found. Deploy it first."
  exit 1
fi

API_ID=$(aws apigatewayv2 get-apis \
  --region "$AWS_REGION" \
  --query "Items[?Name=='$API_NAME'].ApiId | [0]" \
  --output text 2>/dev/null || true)

if [[ "$API_ID" == "None" || -z "$API_ID" ]]; then
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --region "$AWS_REGION" \
    --query 'ApiId' \
    --output text)
fi

INTEGRATION_URI="arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"

INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" \
  --region "$AWS_REGION" \
  --query 'Items[0].IntegrationId' \
  --output text)

if [[ "$INTEGRATION_ID" == "None" || -z "$INTEGRATION_ID" ]]; then
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --integration-type AWS_PROXY \
    --integration-uri "$INTEGRATION_URI" \
    --payload-format-version 2.0 \
    --query 'IntegrationId' \
    --output text)
fi

if [[ "$INTEGRATION_ID" == "None" || -z "$INTEGRATION_ID" ]]; then
  echo "Failed to resolve integration ID."
  exit 1
fi

ROUTE_ID=$(aws apigatewayv2 get-routes \
  --api-id "$API_ID" \
  --region "$AWS_REGION" \
  --query "Items[?RouteKey=='ANY /{proxy+}'].RouteId | [0]" \
  --output text)

if [[ "$ROUTE_ID" == "None" || -z "$ROUTE_ID" ]]; then
  ROUTE_ID=$(aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --region "$AWS_REGION" \
    --route-key "ANY /{proxy+}" \
    --target integrations/"$INTEGRATION_ID" \
    --query 'RouteId' \
    --output text)
else
  aws apigatewayv2 update-route \
    --api-id "$API_ID" \
    --route-id "$ROUTE_ID" \
    --region "$AWS_REGION" \
    --target integrations/"$INTEGRATION_ID" \
    >/dev/null
fi

STAGE_EXISTS=$(aws apigatewayv2 get-stages \
  --api-id "$API_ID" \
  --region "$AWS_REGION" \
  --query "length(Items[?StageName=='$API_STAGE'])" \
  --output text)

if [[ "$STAGE_EXISTS" == "0" || -z "$STAGE_EXISTS" ]]; then
  aws apigatewayv2 create-stage \
    --api-id "$API_ID" \
    --stage-name "$API_STAGE" \
    --region "$AWS_REGION" \
    >/dev/null
fi

aws apigatewayv2 create-deployment \
  --api-id "$API_ID" \
  --region "$AWS_REGION" \
  --stage-name "$API_STAGE" \
  >/dev/null

aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --region "$AWS_REGION" \
  --statement-id "apigw-${API_ID}" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*/*" \
  >/dev/null 2>&1 || true

echo "API Gateway invoke URL: https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${API_STAGE}"
