import { defineConfig } from '@playwright/test'
import { CONSENT_DECIDED } from '../helpers'

// Real screens of the landing (prd-landing-v4 RF-L12). Out of the default testMatch: it never runs in
// `npx playwright test`. Run with the API and the web build up (see the header of shots.ts):
//   npx playwright test -c e2e/landing/shots.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: 'shots.ts',
  timeout: 600_000,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://localhost:3000', headless: true, storageState: CONSENT_DECIDED },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
