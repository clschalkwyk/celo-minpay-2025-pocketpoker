# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

# Install backend workspace dependencies
COPY package*.json ./
COPY backend/package*.json backend/
RUN npm install --workspace backend
# If you have package-lock.json, prefer:
# RUN npm ci --workspace backend

# Build backend TypeScript output
COPY backend ./backend
RUN npm run build --workspace backend

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    DATA_DIR=/app/backend/data

# Install only production deps for backend workspace
COPY package*.json ./
COPY backend/package*.json backend/
RUN npm install --workspace backend --omit=dev
# Or: RUN npm ci --workspace backend --omit=dev

# Copy compiled backend and runtime assets
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/backend/data ./backend/data

WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/server.js"]
