import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.POCKETPOKER_BASE_URL || 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --host localhost --port 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
})
