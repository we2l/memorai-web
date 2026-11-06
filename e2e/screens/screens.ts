import type { Page } from '@playwright/test'

/**
 * Telas do spec de screenshots (e2e/screens.spec.ts) e do gravador do HAR
 * (e2e/screens/record.ts). Os dois percorrem exatamente os mesmos passos, então
 * toda request feita no replay existe no HAR.
 */

export interface Fixture {
  recordedAt: string
  topicId: string
  emptyTopicId: string
  noteId: string
  noteTitle: string
}

export interface Variant {
  tag: 'desktop' | 'mobile'
  theme: 'light' | 'dark'
}

export interface Screen {
  name: string
  /** Página pública vista deslogada (sem cookie de sessão) */
  anonymous?: boolean
  fullPage?: boolean
  /** Também captura em tema escuro */
  dark?: boolean
  run: (page: Page, fx: Fixture, v: Variant) => Promise<void>
}

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
} as const

export const API_URL = /\/api\/|\/sanctum\//


export async function settle(page: Page, ms = 800) {
  // Limitado: telas com polling (documento processando) nunca ficam networkidle
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(ms)
}

async function openTopic(page: Page, path: string) {
  await page.goto(path)
  await settle(page, 1500)
}

export const SCREENS: Screen[] = [
  {
    name: 'hoje',
    fullPage: true,
    dark: true,
    run: async (page) => { await page.goto('/hoje'); await settle(page, 1500) },
  },
  {
    name: 'cadernos',
    run: async (page) => { await openTopic(page, '/cadernos') },
  },
  {
    // The trash (4b-2): the state this fixture has (empty, or the lines it left)
    name: 'lixeira',
    run: async (page) => { await openTopic(page, '/cadernos/lixeira') },
  },
  {
    // Hub of the caderno (4b-1): header with one number, next step, subjects, materials, practice
    name: 'caderno-hub',
    fullPage: true,
    dark: true,
    run: async (page, fx) => { await openTopic(page, `/cadernos/${fx.topicId}`) },
  },
  {
    name: 'caderno-cards',
    fullPage: true,
    run: async (page, fx) => { await openTopic(page, `/cadernos/${fx.topicId}/cards`) },
  },
  {
    name: 'caderno-mapa',
    run: async (page, fx) => { await openTopic(page, `/cadernos/${fx.topicId}/mapa`); await page.waitForTimeout(1500) },
  },
  {
    name: 'nota',
    dark: true,
    run: async (page, fx) => { await openTopic(page, `/cadernos/${fx.topicId}/material/${fx.noteId}`) },
  },
  {
    name: 'caderno-vazio',
    run: async (page, fx) => { await openTopic(page, `/cadernos/${fx.emptyTopicId}`) },
  },
  {
    name: 'revisar',
    run: async (page) => { await page.goto('/revisar'); await settle(page, 1500) },
  },
  {
    // Praticar v3 (4e): the 3 modes with the accuracy of the scope and the episode of the day
    name: 'praticar',
    fullPage: true,
    dark: true,
    run: async (page) => { await page.goto('/praticar'); await settle(page, 1500) },
  },
  {
    name: 'questoes',
    run: async (page) => { await page.goto('/simulados'); await settle(page) },
  },
  {
    name: 'ouvir',
    fullPage: true,
    run: async (page) => { await page.goto('/podcasts'); await settle(page) },
  },
  {
    // Progresso e Provas v3 (4f): summary, exams with the projection, performance and the 26 weeks
    name: 'progresso',
    fullPage: true,
    dark: true,
    run: async (page) => { await page.goto('/progresso'); await settle(page, 1500) },
  },
  {
    name: 'planos',
    fullPage: true,
    run: async (page) => { await page.goto('/planos'); await settle(page) },
  },
  {
    name: 'configuracoes',
    fullPage: true,
    run: async (page) => { await page.goto('/configuracoes'); await settle(page) },
  },
  {
    name: 'entrar',
    anonymous: true,
    run: async (page) => { await page.goto('/entrar'); await settle(page) },
  },
]

export function variantsOf(s: Screen): Variant[] {
  const out: Variant[] = [{ tag: 'desktop', theme: 'light' }, { tag: 'mobile', theme: 'light' }]
  if (s.dark) out.push({ tag: 'desktop', theme: 'dark' }, { tag: 'mobile', theme: 'dark' })
  return out
}

export const shotName = (s: Screen, v: Variant) => `${s.name}-${v.tag}${v.theme === 'dark' ? '-dark' : ''}`

/** Zera transições/animações (complementa reducedMotion) */
export const NO_MOTION_CSS = '*,*::before,*::after{transition-duration:0s!important;transition-delay:0s!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}'

/**
 * "Página inteira" sem quebrar o layout h-screen + scroll interno: cresce o viewport até caber
 * o maior conteúdo rolável (barras fixas ficam no rodapé real, não no meio do PNG).
 */
export async function growViewportToContent(page: Page, max = 6000) {
  const vp = page.viewportSize()
  if (!vp) return
  const extra = await page.evaluate(() => {
    let e = document.documentElement.scrollHeight - window.innerHeight
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const oy = getComputedStyle(el).overflowY
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) e = Math.max(e, el.scrollHeight - el.clientHeight)
    }
    return Math.max(0, e)
  })
  if (!extra) return
  await page.setViewportSize({ width: vp.width, height: Math.min(max, vp.height + extra) })
  await settle(page, 600)
}

export function initScript(theme: 'light' | 'dark', css: string) {
  return `(() => {
    try { localStorage.setItem('color-mode', ${JSON.stringify(theme)}) } catch {}
    const add = () => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s) }
    if (document.head) add(); else document.addEventListener('DOMContentLoaded', add)
  })()`
}
