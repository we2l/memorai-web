import { defineConfig } from '@playwright/test'
import { CONSENT_DECIDED } from './e2e/helpers'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    // E2E_WEB_ORIGIN: another build on a free port when the 3000 is taken (a worktree)
    baseURL: process.env.E2E_WEB_ORIGIN || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // Consent banner answered by default (prd-analytics-posthog); banner specs reset it
    storageState: CONSENT_DECIDED,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
