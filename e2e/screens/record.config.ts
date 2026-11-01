import { defineConfig } from '@playwright/test'

// Só o gravador do HAR (fora do testMatch padrão, não roda em `npx playwright test`)
export default defineConfig({
  testDir: '.',
  testMatch: 'record.ts',
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://localhost:3000', headless: true, actionTimeout: 10_000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
