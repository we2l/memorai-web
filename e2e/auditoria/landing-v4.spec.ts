import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './support/fixtures'

/**
 * Landing v4 (prd-landing-v4 §9): the action goes to sign-up, the numbers come from the (mocked) catalog, `?m=`
 * picks the hero before the first paint, the phone gets the action in the thumb zone, and no sentence the product
 * does not keep comes back. Anonymous visitor; the consent banner already answered (playwright.config), except where
 * the test says otherwise.
 */
const CATALOG = {
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  plans: [
    {
      key: 'free', name: 'Grátis', prices: { monthly: null, annual: null },
      highlights: ['Cadernos, notas e cards sem limite', 'Revisão com FSRS-6'],
      limits: { cards_ai: 10, agent_chat: 5, podcast: 1, pdf_to_note: 1, quiz_ai: 1, note_improve: 1, mindmap_ai: 0 },
      extras: { pdf_pages_per_note: 100, rag_max_pages: 300, upload_max_mb: 50, pdf_pages_monthly_cap: 4000, quiz_max_questions: 10, quiz_short_answer: false, podcast_format: 'teaser', podcast_max_minutes: 0.5 },
    },
    {
      key: 'pro', name: 'Pro',
      prices: {
        monthly: { amount_cents: 2990, label: 'R$ 29,90/mês' },
        annual: { amount_cents: 28790, label: 'R$ 287,90/ano', monthly_equivalent_cents: 2399, installments_max: 1, savings_cents: 7090 },
      },
      highlights: ['Tudo do Grátis'],
      limits: { cards_ai: null, agent_chat: null, podcast: 5, pdf_to_note: 20, quiz_ai: null, note_improve: null, mindmap_ai: null },
      extras: { pdf_pages_per_note: 500, rag_max_pages: 1000, upload_max_mb: 100, pdf_pages_monthly_cap: 4000, quiz_max_questions: 50, quiz_short_answer: true, podcast_format: 'full', podcast_max_minutes: 15 },
    },
  ],
  features: {
    cards_ai: { label: 'gerações de cards com IA', unit: 'por mês', pro_benefit: 'Gerações ilimitadas' },
    podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: '5 episódios de até 15 min' },
  },
}

/** The launch catalog (planos-lancamento): a Pro trial without a card and the new annual price. */
function launchCatalog() {
  const c = structuredClone(CATALOG) as any
  c.trial = { days: 7, card_required: false, starts_on: 'first_material', excludes: ['podcast'], pdf_pages_cap: 300 }
  c.plans[1].prices.annual = { amount_cents: 23990, label: 'R$ 239,90/ano', monthly_equivalent_cents: 1999, installments_max: 1, savings_cents: 11890 }
  return c
}

async function open(page: Page, path = '/', catalog: object = CATALOG) {
  await page.route('**/api/plans', route => route.fulfill({ json: { data: catalog } }))
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/** The hero title the visitor sees (the variants hidden by CSS do not count). */
const visibleTitle = (page: Page) => page.locator('h1 [data-m-variant]:visible')

/** What the old landing promised and the product does not keep (critique §4, PRD §5.1). */
const FORBIDDEN = [/offline/i, /servidores no brasil/i, /1 clique/i, /sem perder nada/i, /o que cai mais/i, /em segundos/i, /mais popular/i, /mesmo algoritmo do anki/i, /sobreviv/i, /mapa mental/i, /nunca mais esque/i, /aprove em/i]

test.describe('landing v4', () => {
  test('o CTA do herói leva ao cadastro', async ({ page }) => {
    await open(page)
    await page.getByTestId('landing-hero-cta').click()
    await page.waitForURL('**/criar-conta')
  })

  test('preço e limites seguem o catálogo mockado e mudam com ele', async ({ page }) => {
    await open(page, '/#planos')
    const plans = page.locator('#planos')
    await expect(plans.getByTestId('plan-pro-price')).toContainText('R$ 23,99')
    await expect(plans.getByText('Gerações de cards com IA: 10 por mês')).toBeVisible()
    await expect(page.getByTestId('landing-free-line')).toContainText('Grátis, sem cartão.')
    await expect(page.getByText(/dias do Pro/)).toHaveCount(0)
    await expect(page.getByText(/\d+x de/)).toHaveCount(0)

    // A new document (a new query), so the catalog is fetched again
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await open(page, '/?catalogo=lancamento#planos', launchCatalog())
    await expect(plans.getByTestId('plan-pro-price')).toContainText('R$ 19,99')
    await expect(page.getByTestId('landing-free-line')).toContainText('O primeiro material abre 7 dias do Pro.')
    await expect(page.getByTestId('landing-plans-lead')).toContainText('7 dias do Pro')
    await expect(page.getByText(/\d+x de/)).toHaveCount(0)
  })

  test('nenhum preço nem limite escrito à mão: sem catálogo, sem R$', async ({ page }) => {
    await page.route('**/api/plans', route => route.fulfill({ status: 500, body: '' }))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main').getByText(/R\$/)).toHaveCount(0)
  })

  test('?m= troca o título antes da hidratação, e um valor desconhecido cai no padrão', async ({ page }) => {
    for (const [m, title] of [['ingles', 'Vocabulário que fica'], ['faculdade', 'Os slides da aula'], ['esqueci', 'Você não esquece por falta de esforço'], ['prova', 'Prova marcada?'], ['xyz', 'Saiba quanto você vai lembrar'], ['', 'Saiba quanto você vai lembrar']]) {
      await page.route('**/api/plans', route => route.fulfill({ json: { data: CATALOG } }))
      // Before any app script runs: what the visitor sees on the first paint
      await page.goto(m ? `/?m=${m}` : '/', { waitUntil: 'domcontentloaded' })
      await expect(visibleTitle(page), m).toHaveCount(1)
      await expect(visibleTitle(page), m).toContainText(title)
      await page.waitForLoadState('networkidle')
      await expect(visibleTitle(page), `${m} depois de hidratar`).toContainText(title)
    }
  })

  test('?m=ingles escolhe Idiomas nos exemplos por área', async ({ page }) => {
    await open(page, '/?m=ingles')
    await expect(page.getByTestId('landing-segment-panel').filter({ visible: true })).toContainText('to take for granted')
    await page.getByRole('radio', { name: 'ENEM e vestibular' }).check()
    await expect(page.getByTestId('landing-segment-panel').filter({ visible: true })).toContainText('1ª Lei de Mendel')
  })

  test('nenhuma frase que o produto não cumpre', async ({ page }) => {
    await open(page)
    // The answers of the questions are in the DOM even closed
    const text = await page.locator('body').textContent()
    for (const bad of FORBIDDEN) expect(text, String(bad)).not.toMatch(bad)
  })

  for (const width of [360, 390, 768, 1440]) {
    test(`sem rolagem lateral em ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await open(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    })
  }

  test.describe('celular', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('título e CTA na primeira dobra', async ({ page }) => {
      await open(page)
      const cta = await page.getByTestId('landing-hero-cta').boundingBox()
      const h1 = await page.locator('h1').boundingBox()
      expect(h1!.y + h1!.height).toBeLessThan(844)
      expect(cta!.y + cta!.height).toBeLessThan(844)
    })

    test('a barra fixa aparece depois do herói e some na chamada final', async ({ page }) => {
      await open(page)
      const bar = page.getByTestId('landing-sticky-cta')
      await expect(bar).toHaveCount(0)
      await page.locator('#como-funciona').scrollIntoViewIfNeeded()
      await expect(bar).toBeVisible()
      await bar.getByRole('link', { name: 'Criar conta grátis' }).click()
      await page.waitForURL('**/criar-conta')
      await page.goBack()
      await page.waitForLoadState('networkidle')
      await page.getByTestId('landing-final-cta').scrollIntoViewIfNeeded()
      await expect(bar).toHaveCount(0)
    })

    test('a barra fixa não disputa espaço com o banner de consentimento', async ({ browser }) => {
      const ctx = await browser.newContext({ baseURL: 'http://localhost:3000', storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } })
      const page = await ctx.newPage()
      await open(page)
      await page.locator('#como-funciona').scrollIntoViewIfNeeded()
      await expect(page.getByTestId('consent-banner')).toBeVisible()
      await expect(page.getByTestId('landing-sticky-cta')).toHaveCount(0)
      await page.getByTestId('consent-reject').click()
      await expect(page.getByTestId('landing-sticky-cta')).toBeVisible()
      await ctx.close()
    })
  })

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('âncoras do cabeçalho e o CTA dele só fora do herói', async ({ page }) => {
      await open(page)
      await expect(page.getByTestId('landing-header-cta')).toBeHidden()
      await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Planos' }).click()
      await expect(page.locator('#planos')).toBeInViewport()
      await expect(page.getByTestId('landing-header-cta')).toBeVisible()
      await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Como funciona' }).click()
      await expect(page.locator('#como-funciona h2')).toBeInViewport()
    })
  })

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1440]) {
      test(`axe sem violação séria (${theme}, ${width} px)`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* only the test */ } }, theme)
        await open(page)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)
        expect(serious).toEqual([])
      })
    }
  }
})
