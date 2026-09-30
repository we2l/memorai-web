import { defineConfig } from '@playwright/test'
import { CONSENT_DECIDED } from './e2e/helpers'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
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
