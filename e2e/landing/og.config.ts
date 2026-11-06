import { defineConfig } from '@playwright/test'
import { CONSENT_DECIDED } from '../helpers'

// Share card of the landing (og:image). Out of the default testMatch: it never runs in `npx playwright test`.
// Run with the web build up (see the header of og.ts):
//   npx playwright test -c e2e/landing/og.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: 'og.ts',
  timeout: 60_000,
  workers: 1,
  retries: 0,
  use: { headless: true, storageState: CONSENT_DECIDED },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
