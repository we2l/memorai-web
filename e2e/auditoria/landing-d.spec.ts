import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import sharp from 'sharp'
import type { Page } from '@playwright/test'
import { test, expect } from './support/fixtures'

/**
 * Landing D (prd-landing-d §9): every call goes to sign-up with its own position, the areas are tabs reachable by
 * click and keyboard (all 5 on a phone), the player plays the real sample and says when it fails, `?m=` picks the
 * hero before the first paint, prices, trial and the name of the paid plan follow the (mocked) catalog in both names
 * ("Pro" today, "Intensivo" after the API), reduced motion gets posters only, and no sentence the product does not
 * keep comes back. Anonymous visitor; the consent banner already answered (playwright.config), unless said otherwise.
 */

/** The launch catalog of the API (#136), with the name of the paid plan as a parameter. */
const PREVIEW_TEXT = 'Prévia grátis da IA, uma vez por conta: 1 PDF de até 50 páginas, 10 gerações de cards, 10 perguntas ao tira-dúvidas, 1 simulado de 10 questões, 1 melhoria de nota, 1 mapa mental e 1 podcast de 30 s.'

function launchCatalog(name: string, { trial = true, preview = false } = {}) {
  return {
    currency: 'BRL',
    period: 'calendar_month',
    period_timezone: 'America/Sao_Paulo',
    preview: preview ? { lifetime: true, requires_verified_email: true, limits: { cards_ai: 10, agent_chat: 10, podcast: 1, pdf_to_note: 1, quiz_ai: 1, note_improve: 1, mindmap_ai: 1 }, pdf_pages: 50, quiz_max_questions: 10, quiz_short_answer: false, podcast_seconds: 30, text: PREVIEW_TEXT } : null,
    trial: trial ? { days: 7, card_required: false, starts_on: 'first_material', excludes: ['podcast'], pdf_pages_cap: 100, limits: { cards_ai: 20, agent_chat: 30, podcast: 0, pdf_to_note: 3, quiz_ai: 3 } } : null,
    plans: [
      {
        key: 'free', name: 'Grátis', prices: { monthly: null, annual: null },
        highlights: ['Cadernos, notas e cards sem limite', 'Revisão com FSRS-6', 'Importar do Anki sem recomeçar do zero', 'Modo recuperação e revisão relâmpago', 'Domínio e acerto por assunto', `Teste do ${name} sem cartão no primeiro material`],
        limits: { cards_ai: 0, agent_chat: 0, podcast: 0, pdf_to_note: 0, quiz_ai: 0, note_improve: 0, mindmap_ai: 0 },
        extras: { pdf_pages_per_note: 100, rag_max_pages: 300, upload_max_mb: 50, pdf_pages_monthly_cap: 4000, quiz_max_questions: 10, quiz_short_answer: false, podcast_format: 'none', podcast_max_minutes: 0 },
      },
      {
        key: 'pro', name,
        prices: {
          monthly: { amount_cents: 2990, label: 'R$ 29,90/mês' },
          annual: { amount_cents: 23990, label: 'R$ 239,90/ano', monthly_equivalent_cents: 1999, installments_max: 1, savings_cents: 11890 },
        },
        highlights: ['Tudo do Grátis', 'IA nos cards, no tira-dúvidas, nas questões e nos mapas mentais', 'Podcast curto dos seus pontos fracos'],
        limits: { cards_ai: 400, agent_chat: 700, podcast: 8, pdf_to_note: 20, quiz_ai: 40, note_improve: 60, mindmap_ai: 40 },
        extras: { pdf_pages_per_note: 500, rag_max_pages: 1000, upload_max_mb: 100, pdf_pages_monthly_cap: 4000, quiz_max_questions: 50, quiz_short_answer: true, podcast_format: 'full', podcast_max_minutes: 8 },
      },
    ],
    features: {
      cards_ai: { label: 'gerações de cards com IA', unit: 'por mês', pro_benefit: '400 gerações por mês' },
      agent_chat: { label: 'perguntas ao tira-dúvidas', unit: 'por mês', pro_benefit: '700 perguntas por mês' },
      pdf_to_note: { label: 'PDFs transformados em nota', unit: 'por mês', pro_benefit: '20 PDFs por mês, até 500 páginas cada' },
      quiz_ai: { label: 'simulados com IA', unit: 'por mês', pro_benefit: '40 simulados por mês, com dissertativas' },
      podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: '8 episódios por mês, de até 8 min' },
    },
  }
}

async function open(page: Page, path = '/', catalog: object = launchCatalog('Intensivo')) {
  await page.route('**/api/plans', route => route.fulfill({ json: { data: catalog } }))
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/** The hero title the visitor sees (the variants hidden by CSS do not count). */
const visibleTitle = (page: Page) => page.locator('.lp-h1[data-m-variant]:visible')

/** Scrolls to the first point below the hero where no call of a section is on screen; returns false if none. */
async function scrollToNoCall(page: Page): Promise<boolean> {
  const y = await page.evaluate(() => {
    const calls = [...document.querySelectorAll('[data-cta]')].filter(el => (el as HTMLElement).offsetParent)
    for (let y = window.innerHeight; y < document.body.scrollHeight; y += 100) {
      const free = calls.every((el) => {
        const r = el.getBoundingClientRect()
        const top = r.top + window.scrollY
        return top + r.height < y || top > y + window.innerHeight
      })
      if (free) return y
    }
    return -1
  })
  if (y < 0) return false
  await page.evaluate(to => window.scrollTo(0, to), y)
  return true
}

/** What the old landings promised and the product does not keep (prd-landing-v4 §5.1). */
const FORBIDDEN = [/offline/i, /servidores no brasil/i, /1 clique/i, /sem perder nada/i, /o que cai mais/i, /em segundos/i, /mais popular/i, /mesmo algoritmo do anki/i, /sobreviv/i, /mapa mental/i, /nunca mais esque/i, /aprove em/i, /aprovação garantida/i, /180 páginas/i, /página de onde saiu/i, /intervalos e erros vêm junto/i, /dias do (Pro|Intensivo) no primeiro/i]

/** The calls of the sections (prd-landing-d RF-D2 a RF-D10): each one goes to sign-up or to /planos. */
const CALLS: [testId: string, path: string][] = [
  ['landing-cta-hero', '/criar-conta'],
  ['landing-cta-curve', '/criar-conta'],
  ['landing-cta-story_material', '/criar-conta'],
  ['landing-cta-story_review', '/criar-conta'],
  ['landing-cta-quiz', '/criar-conta'],
  ['landing-cta-projection', '/criar-conta'],
  ['landing-cta-podcast-signup', '/criar-conta'],
  ['landing-cta-areas-concurso', '/criar-conta'],
  ['landing-cta-plans_free', '/criar-conta'],
  ['landing-cta-plans_pro', '/planos'],
  ['landing-cta-final', '/criar-conta'],
]

test.describe('landing D', () => {
  test('o CTA do herói leva ao cadastro, e cada seção tem a sua chamada', async ({ page }) => {
    await open(page)
    for (const [id, path] of CALLS) await expect(page.getByTestId(id), id).toHaveAttribute('href', path)
    await expect(page.getByTestId('landing-cta-hero')).toHaveText('Criar conta grátis')
    await expect(page.getByTestId('landing-cta-quiz')).toHaveText('Fazer um simulado com meu material')
    await page.getByTestId('landing-cta-hero').click()
    await page.waitForURL('**/criar-conta')
  })

  for (const name of ['Pro', 'Intensivo']) {
    test(`preço, teste e nome do plano seguem o catálogo ("${name}")`, async ({ page }) => {
      await open(page, '/#planos', launchCatalog(name))
      const plans = page.locator('#planos')
      await expect(plans.getByTestId('landing-plan-paid-name')).toHaveText(name)
      await expect(plans.getByTestId('landing-plan-paid-price')).toContainText('R$ 29,90')
      await expect(plans.getByTestId('landing-plan-paid-annual')).toContainText('R$ 239,90 por ano (equivale a R$ 19,99 por mês) · até 3× sem juros · ou 12× com juros · Pix R$ 227,90')
      await expect(plans.getByText('Teste de 7 dias da IA no primeiro material, sem cartão')).toBeVisible()
      // The trial's conditions, from the catalog: e-mail, quotas and no podcast (landing-promessas)
      await expect(page.getByTestId('landing-player-sample')).toContainText(`de um episódio de até 8 min do ${name}.`)
      await expect(plans.getByTestId('landing-plans-trial')).toHaveText(`O teste de 7 dias começa no primeiro material, pede o e-mail confirmado e vale uma vez por conta. Inclui 20 gerações de cards com IA, 30 perguntas ao tira-dúvidas, 3 PDFs transformados em nota (100 páginas no total) e 3 simulados com IA. O podcast fica só no ${name}.`)
      await expect(plans.getByText('20 PDFs por mês, até 500 páginas cada (4.000 páginas no mês)')).toBeVisible()
      // The AI says its plan next to the calls that sell it
      await expect(page.getByTestId('landing-ai-story')).toHaveText(`A IA está no teste grátis, com até 100 páginas de PDF, e no ${name}.`)
      await expect(page.getByTestId('landing-ai-quiz')).toHaveText(`A IA está no teste grátis e no ${name}.`)
      await expect(page.locator('#areas [data-testid="landing-ai-areas"]:visible')).toHaveText(`A IA está no teste grátis e no ${name}.`)
      await expect(plans.getByText('8 episódios por mês, de até 8 min')).toBeVisible()
      await expect(page.getByTestId('landing-cta-plans_pro')).toHaveText(`Ver o ${name} em detalhe`)
      await expect(page.getByTestId('landing-plans-lead')).toContainText(`No ${name}, ela acompanha você até a prova`)
      await expect(page.getByTestId('landing-podcast-plan')).toHaveText(`No ${name}: 8 episódios por mês, de até 8 min. O teste de 7 dias não inclui o podcast.`)
      await expect(plans.locator('summary', { hasText: `Como cancelo o ${name}?` })).toHaveCount(1)
      // Two cards of 5 lines each (prd-landing-d §5.2)
      await expect(plans.getByTestId('landing-plans').locator('li')).toHaveCount(10)
      // The other name never shows up in the page's own text
      const other = name === 'Pro' ? /\bIntensivo\b/ : /\bPro\b/
      expect(await page.locator('main').textContent()).not.toMatch(other)
      await expect(page.getByText(/\d+x de/)).toHaveCount(0)
    })
  }

  test('sem teste no catálogo, nenhuma linha de teste', async ({ page }) => {
    await open(page, '/#planos', launchCatalog('Intensivo', { trial: false }))
    await expect(page.locator('main').getByText(/dias do Intensivo|teste de \d+ dias|teste grátis/i)).toHaveCount(0)
    await expect(page.getByTestId('landing-ai-quiz')).toHaveText('A IA faz parte do Intensivo.')
    await expect(page.getByTestId('landing-plans').locator('li')).toHaveCount(10)
  })

  test('prévia grátis no catálogo (prd-uso-justo §9): a frase da API nas condições, nada do teste', async ({ page }) => {
    await open(page, '/#planos', launchCatalog('Intensivo', { trial: false, preview: true }))
    await expect(page.getByTestId('landing-plans-trial')).toHaveText(`${PREVIEW_TEXT} Pede o e-mail confirmado.`)
    await expect(page.getByTestId('landing-ai-quiz')).toHaveText('Experimente na prévia grátis. A IA fica no Intensivo.')
    await expect(page.locator('main').getByText(/teste de \d+ dias|dias do Intensivo/i)).toHaveCount(0)
  })

  test('sem catálogo: nenhum R$, o erro e "Tentar de novo" que recarrega', async ({ page }) => {
    let fail = true
    await page.route('**/api/plans', route => (fail ? route.fulfill({ status: 500, body: '' }) : route.fulfill({ json: { data: launchCatalog('Intensivo') } })))
    await page.goto('/#planos')
    await page.waitForLoadState('networkidle')
    const plans = page.locator('#planos')
    await expect(plans.getByText('Não deu para carregar os preços agora.')).toBeVisible()
    await expect(page.locator('main').getByText(/R\$/)).toHaveCount(0)
    fail = false
    await plans.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(plans.getByTestId('landing-plan-paid-price')).toContainText('R$ 29,90')
  })

  test('?m= troca o título antes da hidratação, e um valor desconhecido cai no padrão', async ({ page }) => {
    for (const [m, title] of [['ingles', 'Inglês sem memória de peixe.'], ['faculdade', 'Faculdade sem memória de peixe.'], ['esqueci', 'Leu ontem, esqueceu hoje? Memória de peixe.'], ['prova', 'Até a prova, sem memória de peixe.'], ['xyz', 'Chega de memória de peixe.'], ['', 'Chega de memória de peixe.']]) {
      await page.route('**/api/plans', route => route.fulfill({ json: { data: launchCatalog('Intensivo') } }))
      // Before any app script runs: what the visitor sees on the first paint
      await page.goto(m ? `/?m=${m}` : '/', { waitUntil: 'domcontentloaded' })
      await expect(visibleTitle(page), m).toHaveCount(1)
      // The lines are blocks: compare the text without the spaces between them
      expect((await visibleTitle(page).textContent())!.replace(/\s/g, ''), m).toBe(title.replace(/\s/g, ''))
      await expect(page.locator('.lp-h1 .lp-grifo:visible')).toHaveText('peixe')
      await page.waitForLoadState('networkidle')
      expect((await visibleTitle(page).textContent())!.replace(/\s/g, ''), `${m} depois de hidratar`).toBe(title.replace(/\s/g, ''))
    }
  })

  test('áreas em abas: clique, setas, Home e End, cada uma com tela real e chamada própria', async ({ page }) => {
    await open(page, '/#areas')
    const tab = (key: string) => page.getByTestId(`landing-area-tab-${key}`)
    await expect(tab('concurso')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#area-panel-concurso')).toBeVisible()
    await tab('oab').click()
    await expect(page.locator('#area-panel-oab')).toBeVisible()
    await expect(page.locator('#area-panel-concurso')).toBeHidden()
    await expect(page.getByTestId('landing-cta-areas-oab')).toHaveText('Começar pela OAB')
    await expect(page.locator('#area-panel-oab img')).toHaveAttribute('alt', /conta de demonstração/)
    await page.keyboard.press('ArrowRight')
    await expect(tab('enem')).toBeFocused()
    await expect(tab('enem')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(tab('idiomas')).toBeFocused()
    await expect(page.getByTestId('landing-cta-areas-idiomas')).toHaveText('Começar pelo meu inglês')
    await page.keyboard.press('ArrowRight')
    await expect(tab('concurso')).toBeFocused()
    await page.keyboard.press('Home')
    await expect(tab('concurso')).toHaveAttribute('aria-selected', 'true')
    // Only the selected tab is in the Tab order
    await expect(page.locator('[role=tab][tabindex="0"]')).toHaveCount(1)
  })

  test('o player toca a amostra real e mostra a falha com "Tentar de novo"', async ({ page }) => {
    await open(page)
    const play = page.getByTestId('landing-player-play')
    await expect(play).toHaveAttribute('aria-label', 'Ouvir o exemplo')
    // "Ouvir um exemplo" plays right there
    await page.getByTestId('landing-cta-podcast').click()
    // A toggle button: the name stays, the state is aria-pressed (announced once)
    await expect(play).toHaveAttribute('aria-pressed', 'true')
    await expect(play).toHaveAttribute('aria-label', 'Ouvir o exemplo')
    await expect.poll(() => page.getByTestId('landing-player-time').textContent(), { timeout: 8000 }).toMatch(/^0:0[1-9] \//)
    await play.click()
    await expect(play).toHaveAttribute('aria-pressed', 'false')

    // A sample that does not load: the player says so and offers to try again
    const other = await page.context().newPage()
    await other.route('**/landing/podcast-amostra.mp3', route => route.abort())
    await open(other)
    await other.getByTestId('landing-player-play').click()
    await expect(other.getByTestId('landing-player-error')).toContainText('Não deu para tocar o áudio agora.')
    await expect(other.getByTestId('landing-player-error').getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
    await other.close()
  })

  test('a projeção usa os números da conta de demonstração', async ({ page }) => {
    await open(page)
    // demo.json is written by e2e/landing/shots.ts from the same account the screens show
    const demo = JSON.parse(readFileSync(join(__dirname, '../../app/assets/landing/demo.json'), 'utf8'))
    await page.locator('.lp-proof').scrollIntoViewIfNeeded()
    await expect(page.locator('.lp-proof')).toContainText(`${demo.keep_pace}%`, { timeout: 5000 })
    await expect(page.locator('.lp-proof')).toContainText(`${demo.stop_today}%`)
    await expect(page.getByText(`${demo.exam}, daqui a ${demo.days} dias, na conta de demonstração.`)).toBeVisible()
  })

  test('compartilhar: og:image absoluta de 1200×630, opaca e leve', async ({ page }) => {
    await open(page)
    const meta = (key: string) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).getAttribute('content')
    const image = await meta('og:image')
    expect(image).toBe('https://baigi.com.br/landing/og-baigi.jpg')
    expect(await meta('twitter:image')).toBe(image)
    expect(await meta('twitter:card')).toBe('summary_large_image')
    expect(await meta('og:url')).toBe('https://baigi.com.br/')
    expect([await meta('og:image:width'), await meta('og:image:height')]).toEqual(['1200', '630'])
    expect(await meta('og:image:alt')).toBeTruthy()
    // The file of the build (e2e/landing/og.ts): JPEG has no alpha, so Facebook can't turn the mascot black
    const res = await page.request.get('/landing/og-baigi.jpg')
    expect(res.headers()['content-type']).toBe('image/jpeg')
    const body = await res.body()
    expect(body.length).toBeLessThan(300 * 1024)
    const { width, height } = await sharp(body).metadata()
    expect([width, height]).toEqual([1200, 630])
  })

  test('nenhuma frase que o produto não cumpre, e "FSRS-6" no máximo uma vez', async ({ page }) => {
    await open(page)
    // The answers of the questions and the hidden panels are in the DOM
    const text = (await page.locator('body').textContent())!
    for (const bad of FORBIDDEN) expect(text, String(bad)).not.toMatch(bad)
    expect(text.match(/FSRS-6/g)?.length ?? 0).toBeLessThanOrEqual(1)
  })

  test.describe('movimento reduzido', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } })

    test('só os pôsteres: nenhum vídeo baixa, nada escondido, números no valor final', async ({ page }) => {
      const media: string[] = []
      page.on('request', (r) => { if (/\.(mp4|webm|mp3)(\?|$)/.test(r.url())) media.push(r.url()) })
      await open(page)
      expect(await page.evaluate(() => document.documentElement.classList.contains('lp-motion'))).toBe(false)
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y)
          await new Promise(resolve => setTimeout(resolve, 40))
        }
      })
      await page.waitForTimeout(500)
      expect(media).toEqual([])
      const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter(el => getComputedStyle(el).opacity !== '1').length)
      expect(hidden).toBe(0)
      await expect(page.locator('.lp-score')).toContainText('70%')
      await expect(page.locator('.lp-proof')).toContainText('90%')
      // Nothing moves on its own
      const animated = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)
      expect(animated).toBe(0)
    })
  })

  test('com movimento, o vídeo do herói só baixa quando toca e o resto espera aparecer', async ({ page }) => {
    const media: string[] = []
    page.on('request', (r) => { if (/\/landing\/video\/.*\.(mp4|webm)/.test(r.url())) media.push(r.url()) })
    await open(page)
    expect(await page.evaluate(() => document.documentElement.classList.contains('lp-motion'))).toBe(true)
    await expect.poll(() => media.some(u => u.includes('revisao-light'))).toBe(true)
    expect(media.some(u => u.includes('simulado'))).toBe(false)
    await page.locator('#simulado').scrollIntoViewIfNeeded()
    await page.locator('.lp-quiz-media').scrollIntoViewIfNeeded()
    await expect.poll(() => media.some(u => u.includes('simulado-light'))).toBe(true)
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
      const cta = await page.getByTestId('landing-cta-hero').boundingBox()
      const h1 = await page.locator('h1').boundingBox()
      expect(h1!.y + h1!.height).toBeLessThan(844)
      expect(cta!.y + cta!.height).toBeLessThan(844)
    })

    test('as 5 abas de área cabem na tela, sem rolar de lado', async ({ page }) => {
      await open(page, '/#areas')
      for (const key of ['concurso', 'faculdade', 'oab', 'enem', 'idiomas']) {
        const box = (await page.getByTestId(`landing-area-tab-${key}`).boundingBox())!
        expect(box.x, key).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, key).toBeLessThanOrEqual(390)
        expect(box.height, key).toBeGreaterThanOrEqual(44)
      }
    })

    test('a barra fixa aparece fora das chamadas de seção e some quando uma delas entra', async ({ page }) => {
      await open(page)
      const bar = page.getByTestId('landing-sticky-cta')
      await expect(bar).toHaveAttribute('data-show', 'false')
      // A point of the page where no call of a section is on screen
      expect(await scrollToNoCall(page)).toBe(true)
      await expect(bar).toHaveAttribute('data-show', 'true')
      await bar.getByRole('link', { name: 'Criar conta grátis' }).click()
      await page.waitForURL('**/criar-conta')
      await page.goBack()
      await page.waitForLoadState('networkidle')
      await page.getByTestId('landing-cta-final').scrollIntoViewIfNeeded()
      await expect(bar).toHaveAttribute('data-show', 'false')
    })

    test('a barra fixa não disputa espaço com o banner de consentimento', async ({ browser }) => {
      const ctx = await browser.newContext({ baseURL: 'http://localhost:3000', storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } })
      const page = await ctx.newPage()
      await open(page)
      // A thin bar at the bottom (owner, 06/11): never over the hero's call
      const banner = (await page.getByTestId('consent-banner').boundingBox())!
      const heroCta = (await page.getByTestId('landing-cta-hero').boundingBox())!
      expect(heroCta.y + heroCta.height).toBeLessThan(banner.y)
      // Two lines on a phone: the sentence with the policy link, then the three buttons
      expect(banner.height).toBeLessThanOrEqual(110)
      await page.locator('.lp-story .lp-chap').first().locator('h3').scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy(0, 300))
      await expect(page.getByTestId('consent-banner')).toBeVisible()
      await expect(page.getByTestId('landing-sticky-cta')).toHaveAttribute('data-show', 'false')
      await page.getByTestId('consent-reject').click()
      await expect(page.getByTestId('consent-banner')).toHaveCount(0)
      await ctx.close()
    })
  })

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('o herói ocupa a tela, as âncoras levam às seções e o CTA do cabeçalho fica sempre', async ({ page }) => {
      await open(page)
      const hero = (await page.locator('.lp-hero').boundingBox())!
      expect(hero.y + hero.height).toBeGreaterThanOrEqual(900 - 1)
      // Always there on the desktop, like the prototype D (owner, 06/11)
      const headerCta = page.getByTestId('landing-cta-header')
      await expect(headerCta).toBeVisible()
      const nav = page.getByRole('navigation', { name: 'Seções' })
      await nav.getByRole('link', { name: 'Planos' }).click()
      await expect(page.locator('#planos h2')).toBeInViewport()
      await nav.getByRole('link', { name: 'Podcast' }).click()
      await expect(page.locator('#podcast h2')).toBeInViewport()
      await nav.getByRole('link', { name: 'Como funciona' }).click()
      await expect(page.locator('#como h2')).toBeInViewport()
      await expect(headerCta).toBeVisible()
      await headerCta.click()
      await page.waitForURL('**/criar-conta')
    })

    test('no "Como funciona" a tela do celular fixo troca com o capítulo', async ({ page }) => {
      await open(page)
      const layer = (key: string) => page.locator(`.lp-stage [data-layer="${key}"]`)
      await page.locator('.lp-chap[data-step="material"] h3').scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy(0, 1))
      await expect(layer('material')).toHaveAttribute('data-on', 'true')
      await page.evaluate(() => {
        const el = document.querySelector('.lp-chap[data-step="revisao"]')!
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.getBoundingClientRect().height / 2 - window.innerHeight / 2)
      })
      await expect(layer('revisao')).toHaveAttribute('data-on', 'true')
      await expect(layer('material')).toHaveAttribute('data-on', 'false')
      await expect(page.locator('.lp-chap[data-step="revisao"]')).toHaveAttribute('data-active', 'true')
    })
  })

  test('desktop sem consentimento: a barra de cookies é uma linha no rodapé, longe da chamada do herói', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: 'http://localhost:3000', storageState: { cookies: [], origins: [] }, viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await open(page)
    const banner = page.getByTestId('consent-banner')
    const box = (await banner.boundingBox())!
    expect(box.y + box.height).toBe(900)
    expect(box.width).toBe(1440)
    expect(box.height).toBeLessThanOrEqual(80)
    const heroCta = (await page.getByTestId('landing-cta-hero').boundingBox())!
    expect(heroCta.y + heroCta.height).toBeLessThan(box.y)
    for (const id of ['consent-reject', 'consent-accept', 'consent-customize']) await expect(page.getByTestId(id)).toBeVisible()
    await expect(banner.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade')
    await ctx.close()
  })

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1440]) {
      test(`axe sem violação séria (${theme}, ${width} px)`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* only the test */ } }, theme)
        await open(page)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)
        expect(serious).toEqual([])
      })
    }
  }
})
