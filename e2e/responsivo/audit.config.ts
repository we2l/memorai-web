import { defineConfig } from '@playwright/test'
import { CONSENT_DECIDED } from '../helpers'
import { AUDIT_DEVICES } from './devices'

// Auditoria de responsividade (prd-responsividade): fora do testMatch padrão, nunca roda em `npx playwright test`.
//   npx playwright test -c e2e/responsivo/audit.config.ts [--project=iphone-se]
// RESP_BASE_URL aponta para outro build (a 3000 ocupada). A API e o Sanctum só aceitam localhost:3000: fora dela o
// Chromium roda sem a checagem de CORS e manda Origin/Referer da 3000 (só local, nunca no CI).
const BASE = process.env.RESP_BASE_URL || 'http://localhost:3000'
const otherPort = !BASE.endsWith(':3000')

export default defineConfig({
  testDir: '.',
  testMatch: 'audit.ts',
  timeout: 600_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    headless: true,
    storageState: CONSENT_DECIDED,
    ...(otherPort ? {
      launchOptions: { args: ['--disable-web-security'] },
      extraHTTPHeaders: { Origin: 'http://localhost:3000', Referer: 'http://localhost:3000/' },
    } : {}),
  },
  projects: AUDIT_DEVICES.map(d => ({ name: d.key, use: d.use })),
})
