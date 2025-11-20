# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

# Copy all package manifests
COPY package.json ./
COPY package-lock.json ./
COPY backend/package.json backend/

# Install all dependencies for the backend workspace
RUN npm ci --workspace=backend

# Copy the rest of the backend source
COPY backend ./backend

# Build the backend
RUN npm run build --workspace backend

# Use AWS Lambda's official Node.js 20 image as the base for the runner
FROM public.ecr.aws/lambda/nodejs:20 AS runner
WORKDIR ${LAMBDA_TASK_ROOT}

ENV NODE_ENV=production

# Copy production node_modules from the builder stage
# The root node_modules contains shared dependencies, and backend/node_modules contains backend-specific ones.
# Copying them in this order should merge them correctly.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./node_modules

# Copy compiled code from the builder stage
COPY --from=builder /app/backend/dist ./dist

# Copy the backend's package.json to the root for "type": "module" resolution
COPY --from=builder /app/backend/package.json ./package.json

# The CMD should specify the handler file and the handler function
CMD [ "dist/lambda.handler" ]


