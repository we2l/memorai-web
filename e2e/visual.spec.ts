import type { Page } from '@playwright/test'
import { test, expect } from './auditoria/support/fixtures'

/**
 * Regressão visual: compara pixel a pixel com a linha de base em e2e/visual.spec.ts-snapshots.
 * Fora do CI (fontes e renderização mudam de máquina): rode antes e depois de mexer no CSS global.
 *
 * Regravar: npx playwright test e2e/visual.spec.ts --update-snapshots (em commit separado)
 *
 * As telas do app usam uma conta só deste spec (auditUser 'visual'), recriada a cada execução: não dependem da ordem
 * da suíte. A landing (v4) usa catálogo fixo e a mesma tolerância das outras telas.
 */
const APP_TOLERANCE = { maxDiffPixelRatio: 0.005, fullPage: true, animations: 'disabled' } as const

const APP_PAGES = [
  { name: 'dashboard', path: '/hoje' },
  { name: 'cadernos', path: '/cadernos' },
  { name: 'praticar', path: '/praticar' },
  { name: 'simulados', path: '/simulados' },
  { name: 'podcasts', path: '/podcasts' },
  { name: 'progresso', path: '/progresso' },
  { name: 'configuracoes', path: '/configuracoes' },
  { name: 'importar', path: '/importar' },
  { name: 'planos', path: '/planos' },
  { name: 'ajuda', path: '/ajuda' },
]

const PUBLIC_PAGES = [
  { name: 'login', path: '/entrar' },
  { name: 'criar-conta', path: '/criar-conta' },
  { name: 'termos', path: '/termos' },
  { name: 'privacidade', path: '/privacidade' },
  { name: 'ajuda-anonimo', path: '/ajuda?tab=atalhos' },
  { name: 'planos-anonimo', path: '/planos' },
]

const CATALOG = {
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  plans: [
    {
      key: 'free',
      name: 'Grátis',
      prices: { monthly: null, annual: null },
      highlights: ['Cadernos, notas e cards sem limite', 'Revisão com FSRS-6', 'Importar do Anki com o histórico', 'Modo recuperação e revisão relâmpago'],
      limits: { cards_ai: 10, pdf_upload: null, agent_chat: 5, podcast: 1, pdf_to_note: 1, quiz_ai: 1, note_improve: 1, mindmap_ai: 0 },
      extras: { pdf_pages_per_note: 100, rag_max_pages: 300, upload_max_mb: 50, pdf_pages_monthly_cap: 4000, quiz_max_questions: 10, quiz_short_answer: false, podcast_format: 'teaser', podcast_max_minutes: 0.5 },
    },
    {
      key: 'pro',
      name: 'Pro',
      prices: {
        monthly: { amount_cents: 2990, label: 'R$ 29,90/mês' },
        annual: { amount_cents: 28790, label: 'R$ 287,90/ano', monthly_equivalent_cents: 2399, installments_max: 1, savings_cents: 7090 },
      },
      highlights: ['Tudo do Grátis', 'IA sem limite mensal nos cards, no tira-dúvidas e nas questões'],
      limits: { cards_ai: null, pdf_upload: null, agent_chat: null, podcast: 5, pdf_to_note: 20, quiz_ai: null, note_improve: null, mindmap_ai: null },
      extras: { pdf_pages_per_note: 500, rag_max_pages: 1000, upload_max_mb: 100, pdf_pages_monthly_cap: 4000, quiz_max_questions: 50, quiz_short_answer: true, podcast_format: 'full', podcast_max_minutes: 15 },
    },
  ],
  features: {
    cards_ai: { label: 'gerações de cards com IA', unit: 'por mês', pro_benefit: 'Gerações ilimitadas' },
    agent_chat: { label: 'perguntas ao tira-dúvidas', unit: 'por mês', pro_benefit: 'Tira-dúvidas ilimitado' },
    pdf_to_note: { label: 'PDFs transformados em nota', unit: 'por mês', pro_benefit: '20 PDFs por mês, até 500 páginas cada' },
    quiz_ai: { label: 'simulados com IA', unit: 'por mês', pro_benefit: 'Simulados ilimitados, com dissertativas' },
    note_improve: { label: 'melhorias de nota com IA', unit: 'por mês', pro_benefit: 'Melhorias ilimitadas' },
    podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: '5 episódios de até 15 min' },
    mindmap_ai: { label: 'mapas mentais com IA', unit: 'por mês', pro_benefit: 'Mapas mentais com IA ilimitados' },
  },
}

const THEMES = ['light', 'dark'] as const
const SIZES = [{ tag: 'mobile', width: 390, height: 844 }, { tag: 'desktop', width: 1440, height: 900 }] as const

async function prepare(page: Page, theme: string, path: string) {
  await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* só no teste */ } }, theme)
  await page.route('**/api/plans', route => route.fulfill({ json: { data: CATALOG } }))
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
}

for (const size of SIZES) {
  test.describe(`Visual ${size.tag}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test.describe('app', () => {
      test.use({ auditUser: 'visual' })
      for (const pg of APP_PAGES) {
        for (const theme of THEMES) {
          test(`${pg.name} (${theme})`, async ({ page }) => {
            await prepare(page, theme, pg.path)
            await expect(page).toHaveScreenshot(`${pg.name}-${size.tag}-${theme}.png`, APP_TOLERANCE)
          })
        }
      }
    })

    test.describe('públicas', () => {
      for (const pg of PUBLIC_PAGES) {
        for (const theme of THEMES) {
          test(`${pg.name} (${theme})`, async ({ page }) => {
            await prepare(page, theme, pg.path)
            await expect(page).toHaveScreenshot(`${pg.name}-${size.tag}-${theme}.png`, APP_TOLERANCE)
          })
        }
      }
    })

    // Landing D (prd-landing-d): inside the DS, same tolerance as the rest. The lazy screens of the app load near
    // the viewport: scroll the page once before the full-page capture.
    test.describe('landing', () => {
      for (const theme of THEMES) {
        test(`landing (${theme})`, async ({ page }) => {
          // The screens of the app follow the system theme (<picture> media query), like a first-time visitor's
          await page.emulateMedia({ colorScheme: theme })
          await prepare(page, theme, '/')
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
              window.scrollTo(0, y)
              await new Promise(resolve => setTimeout(resolve, 60))
            }
          })
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(500)
          await expect(page).toHaveScreenshot(`landing-${size.tag}-${theme}.png`, APP_TOLERANCE)
        })
      }
    })
  })
}
