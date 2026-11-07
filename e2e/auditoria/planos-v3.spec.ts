import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, API, catalogProName } from './support/fixtures'
import { mockSubscription, expectNoHydrationMismatch } from './support/public-pages'

/**
 * /planos, /checkout/sucesso, /termos, /privacidade e /ajuda v4 (prd-4h-landing-v3 RF-F11 a RF-F15): um layout só,
 * logado ou não, números só do catálogo e um destaque por tela. Nenhum checkout real: a sessão e a Stripe são mockadas.
 */
const primaries = (page: Page) => page.locator('.shadow-press').filter({ visible: true })

async function catalog(page: Page) {
  const res = await page.request.get(`${API}/plans`)
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data
}

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

test.describe('/planos anônimo', () => {
  test('um primário, "Recomendado" escrito, anual por padrão, mensal no seletor; números do catálogo', async ({ page }) => {
    const data = await catalog(page)
    const pro = data.plans.find((p: any) => p.key === 'pro')
    await gotoApp(page, '/planos')

    await expect(page.getByRole('heading', { name: 'Planos', level: 1 })).toBeVisible()
    await expect(page.getByTestId('plan-pro').getByText('Recomendado')).toBeVisible()
    await expect(primaries(page)).toHaveCount(1)
    await expect(page.locator('.bg-tinted').filter({ visible: true })).toHaveCount(1)

    await expect(page.getByRole('radio', { name: 'Anual' })).toBeChecked()
    // The annual by its total, and its monthly share "cobrado uma vez por ano" (prd-planos-lancamento RF-F4)
    await expect(page.getByTestId('plan-pro-price')).toContainText(brl(pro.prices.annual.amount_cents))
    await expect(page.getByTestId('plan-pro-note')).toContainText(`${brl(pro.prices.annual.monthly_equivalent_cents)} por mês, cobrado uma vez por ano`)
    await expect(page.getByTestId('billing-savings')).toContainText(brl(pro.prices.annual.savings_cents))

    await page.getByRole('radio', { name: 'Mensal' }).check()
    await expect(page.getByTestId('plan-pro-price')).toContainText(brl(pro.prices.monthly.amount_cents))
    await expect(page.getByTestId('plan-pro-note')).toHaveText('Cancele quando quiser, pelo portal de assinatura')

    for (const highlight of [...data.plans[0].highlights.map((h: string) => ['plan-free', h]), ...pro.highlights.map((h: string) => ['plan-pro', h])]) {
      await expect(page.getByTestId(highlight[0]).getByText(highlight[1], { exact: true })).toBeVisible()
    }
  })

  test('a tabela de comparação vem do catálogo: limite e nome mudam com o mock', async ({ page }) => {
    const data = await catalog(page)
    data.plans[0].limits.cards_ai = 3
    data.plans[0].limits.mindmap_ai = 0
    data.plans[1].limits.podcast = 9
    data.features.podcast.label = 'episódios de áudio'
    await page.route('**/api/plans', route => route.fulfill({ json: { data } }))
    await gotoApp(page, '/planos')

    const table = page.getByTestId('plan-compare')
    // The Free's quotas are the preview's, once per account (prd-uso-justo §9): "na prévia", never "por mês"
    await expect(table.getByTestId('compare-cards_ai').getByRole('cell').first()).toHaveText(data.preview ? '3 na prévia' : '3 por mês')
    await expect(table.getByTestId('compare-podcast').getByRole('rowheader')).toHaveText('Episódios de áudio')
    await expect(table.getByTestId('compare-podcast').getByRole('cell').nth(1)).toContainText('9 por mês')
    await expect(table.getByTestId('compare-mindmap_ai').getByRole('cell').first()).toHaveText('Não incluído')
    await expect(table.getByTestId('compare-mindmap_ai').getByRole('cell').nth(1)).toHaveText('40 por mês')
  })

  test('catálogo fora do ar: nenhum número e "Tentar de novo" traz os planos', async ({ page }) => {
    let fail = true
    const data = await catalog(page)
    await page.route('**/api/plans', route => fail ? route.fulfill({ status: 500, body: '' }) : route.fulfill({ json: { data } }))
    await gotoApp(page, '/planos')

    await expect(page.getByText('Não conseguimos carregar os planos agora')).toBeVisible()
    await expect(page.getByRole('main').getByText(/R\$/)).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByTestId('plan-pro-price')).toBeVisible()
  })

  test('nenhuma promessa que o produto não cumpre', async ({ page }) => {
    await gotoApp(page, '/planos')
    await page.getByTestId('plan-faq').locator('summary').first().waitFor()
    const text = (await page.getByRole('main').textContent()) ?? ''
    for (const banned of ['offline', 'Servidores no Brasil', '1 clique', 'sem perder nada', 'o que cai mais', 'em segundos']) expect(text).not.toContain(banned)
  })

  test('o esqueleto segura o layout: os planos entram sem pulo', async ({ page }) => {
    const data = await catalog(page)
    await page.route('**/api/plans', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 800))
      await route.fulfill({ json: { data } })
    })
    await page.addInitScript(() => {
      (window as any).__cls = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport)
      await page.goto('/planos')
      await expect(page.getByTestId('plan-pro-price')).toBeVisible()
      await page.waitForTimeout(300)
      expect(await page.evaluate(() => (window as any).__cls), `CLS em ${viewport.width}`).toBeLessThanOrEqual(0.02)
    }
  })

  test('as perguntas abrem pelo teclado', async ({ page }) => {
    await gotoApp(page, '/planos')
    const summary = page.getByTestId('plan-faq').locator('summary').filter({ hasText: 'Posso cancelar quando quiser?' })
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText(`Cancele quando quiser, pelo portal de assinatura. O ${await catalogProName()} continua`)).toBeVisible()
  })

  for (const width of [360, 390, 768, 1440]) {
    test(`sem rolagem horizontal em ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['/planos', '/termos', '/privacidade', '/ajuda', '/ajuda?tab=atalhos']) {
        await gotoApp(page, path)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0)
      }
    })
  }
})

test.describe('/planos logado: o mesmo layout', () => {
  test.describe('Free', () => {
    test.use({ auditUser: 'free' })

    test('sem casca do app e sem erro de hidratação; "Ir para o Hoje" e "Seu plano" no Grátis', async ({ page }) => {
      const hydration = expectNoHydrationMismatch(page)
      await gotoApp(page, '/planos')
      await expect(page.getByRole('link', { name: 'Ir para o Hoje' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Entrar' })).toHaveCount(0)
      await expect(page.getByTestId('plan-free').getByText('Seu plano')).toBeVisible()
      await expect(page.getByTestId('plan-pro').getByRole('button', { name: 'Assinar anual' })).toBeVisible()
      await expect(primaries(page)).toHaveCount(1)
      await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
      hydration.check()
    })

    test('"Ir para o Hoje" volta para o app', async ({ page }) => {
      await gotoApp(page, '/planos')
      await page.getByRole('link', { name: 'Ir para o Hoje' }).click()
      await page.waitForURL('**/hoje')
    })

    test('retorno da Stripe: o toast do ?success=1 aparece depois da hidratação', async ({ page }) => {
      await page.goto('/planos?success=1')
      await expect(page.getByText(`Assinatura ativada! Bem-vindo ao ${await catalogProName()}.`)).toBeVisible()
    })

    test('link de renovação abre o checkout anual sozinho', async ({ page }) => {
      await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Stripe stub</h1>' }))
      let annual = 0
      await page.route('**/api/checkout/annual', (route) => {
        annual++
        return route.fulfill({ json: { checkout_url: 'https://checkout.stripe.com/c/pay/x', session_id: 'x' } })
      })
      await page.goto('/planos?ciclo=anual&renovar=1')
      await page.waitForURL('https://checkout.stripe.com/**')
      expect(annual).toBe(1)
    })
  })

  test.describe('Pro mensal', () => {
    test.use({ auditUser: 'pro' })

    test('"Seu plano", "Gerenciar assinatura" e a troca para o anual', async ({ page }) => {
      await mockSubscription(page, { plan: 'pro', billing: 'monthly', subscription_status: 'active', has_subscription: true })
      let portal = 0
      await page.route('**/api/checkout/portal', (route) => {
        portal++
        return route.fulfill({ status: 500, json: { message: 'x' } })
      })
      await gotoApp(page, '/planos')
      await expect(page.getByTestId('plan-pro').getByText('Seu plano')).toBeVisible()
      await expect(page.getByTestId('plan-manage').getByRole('button', { name: /Mudar para anual e economizar/ })).toBeVisible()
      await page.getByTestId('plan-manage').getByRole('button', { name: 'Gerenciar assinatura' }).click()
      await expect(page.getByRole('alert').getByText('Não foi possível abrir o portal de assinatura. Tente de novo.')).toBeVisible()
      expect(portal).toBe(1)
    })
  })

  test.describe('Pro anual', () => {
    test.use({ auditUser: 'pro' })

    test('fora da janela: vale até, renovação explicada em texto (sem tooltip) e botão desativado', async ({ page }) => {
      await mockSubscription(page, { plan: 'pro', billing: 'annual', has_subscription: false, can_renew_annual: false, plan_expires_at: '2027-09-28T15:05:00-03:00' })
      await gotoApp(page, '/planos')
      await expect(page.getByTestId('annual-valid-until')).toContainText('28/09/2027')
      await expect(page.getByRole('button', { name: 'Renovar', exact: true })).toBeDisabled()
      await expect(page.getByTestId('plan-pro')).toContainText(/A renovação abre \d+ dias antes do fim\./)
    })
  })
})

test.describe('/configuracoes: "Pro · renova em" (GET /me com subscription_renews_at; a API ainda não traz: mock)', () => {
  test.use({ auditUser: 'pro' })

  async function open(page: Page, me: Record<string, unknown>, sub: Record<string, unknown>) {
    await page.route('**/api/me', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      delete body.data.subscription_renews_at
      Object.assign(body.data, { plan: 'pro' }, me)
      await route.fulfill({ response: res, json: body })
    })
    await mockSubscription(page, { plan: 'pro', billing: 'monthly', has_subscription: true, ...sub })
    await gotoApp(page, '/configuracoes#plano')
    return page.getByTestId('plan-summary')
  }

  test('com a data: renova em', async ({ page }) => {
    await expect(await open(page, { subscription_renews_at: '2026-11-28T12:00:00-03:00' }, {})).toHaveText(`${await catalogProName()} · renova em 28/11`)
  })

  test('cancelada (null): termina em', async ({ page }) => {
    await expect(await open(page, { subscription_renews_at: null }, { subscription_ends_at: '2026-12-10T12:00:00-03:00' })).toHaveText(`${await catalogProName()} · termina em 10/12`)
  })

  test('sem o campo: "Pro mensal", sem data inventada', async ({ page }) => {
    await expect(await open(page, {}, {})).toHaveText(`${await catalogProName()} mensal`)
  })
})

test.describe('Páginas públicas', () => {
  test('/termos e /privacidade: um h1, índice que leva à seção e o texto jurídico no lugar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoApp(page, '/termos')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Termos de Uso')
    await expect(page.getByText('[[CNPJ]]')).toBeVisible()
    await page.getByRole('navigation', { name: 'Índice' }).getByRole('link', { name: 'Rescisão' }).click()
    await expect(page).toHaveURL(/#rescisao/)
    await expect(page.getByRole('heading', { name: /^\d+\. Rescisão$/ })).toBeInViewport()
    // The prose styles really apply (a missing legal-prose.css fails in silence)
    expect(await page.locator('.legal-prose ul').first().evaluate(el => getComputedStyle(el).listStyleType)).toBe('disc')
    await gotoApp(page, '/privacidade')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Política de Privacidade')
  })

  test('/ajuda: abas por teclado, ?tab=atalhos abre os atalhos', async ({ page }) => {
    await gotoApp(page, '/ajuda')
    await expect(page.getByRole('heading', { name: 'Como as peças se conectam' })).toBeVisible()
    await page.getByRole('tab', { name: 'Como funciona' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('heading', { name: 'Atalhos de teclado' })).toBeVisible()
    await page.goto('/ajuda?tab=atalhos')
    await expect(page.getByRole('tab', { name: 'Atalhos e comandos' })).toHaveAttribute('aria-selected', 'true')
  })

  test('tema do sistema nas páginas pré-renderizadas: fundo escuro de verdade', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' })
    const page = await ctx.newPage()
    for (const path of ['/planos', '/termos', '/ajuda']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), path).toBe(true)
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), path).toBe('rgb(20, 18, 24)')
    }
    await ctx.close()
  })

  test.describe('logado', () => {
    test.use({ auditUser: 'free' })

    test('/ajuda sem erro de hidratação e com "Ir para o Hoje"', async ({ page }) => {
      const hydration = expectNoHydrationMismatch(page)
      await gotoApp(page, '/ajuda')
      await expect(page.getByRole('link', { name: 'Ir para o Hoje' })).toBeVisible()
      hydration.check()
    })
  })
})

test.describe('axe', () => {
  async function scan(page: Page, label: string) {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${label} ${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
  }

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1440]) {
      test(`anônimo, ${theme}, ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
        for (const path of ['/planos', '/termos', '/privacidade', '/ajuda', '/ajuda?tab=atalhos']) {
          await gotoApp(page, path)
          await scan(page, path)
        }
      })

      test.describe('logado', () => {
        test.use({ auditUser: 'free' })
        const session = (over: object) => ({ session_id: 's', status: 'complete', payment_status: 'unpaid', payment_method: 'pix', pix_qr: { data: 'x', image_url_png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', expires_at: new Date(Date.now() + 1_800_000).toISOString() }, plan_active: false, plan_expires_at: null, ...over })

        test(`${theme}, ${width} px: /planos e os estados do checkout`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 })
          await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
          await gotoApp(page, '/planos')
          await scan(page, '/planos')
          for (const [name, data, status] of [['pix', session({}), 200], ['ativo', session({ payment_status: 'paid', pix_qr: null, plan_active: true, plan_expires_at: '2027-09-28T15:05:00-03:00' }), 200], ['expirado', session({ status: 'expired', pix_qr: null }), 200], ['não encontrado', {}, 404]] as const) {
            await page.unroute('**/api/checkout/sessions/**')
            await page.route('**/api/checkout/sessions/**', route => route.fulfill({ status, json: { data } }))
            await gotoApp(page, '/checkout/sucesso?session_id=s')
            await page.waitForTimeout(800) // the milestone settles (<= 700 ms)
            await scan(page, `checkout ${name}`)
          }
        })
      })
    }
  }
})

test.describe('/checkout/sucesso', () => {
  test.use({ auditUser: 'free' })

  test('Pro ativo: marco com o mascote, data do catálogo e um primário; sem confete', async ({ page }) => {
    await page.route('**/api/checkout/sessions/**', route => route.fulfill({ json: { data: { session_id: 's', status: 'complete', payment_status: 'paid', payment_method: 'pix', pix_qr: null, plan_active: true, plan_expires_at: '2027-09-28T15:05:00-03:00' } } }))
    await gotoApp(page, '/checkout/sucesso?session_id=s')
    const name = await catalogProName()
    await expect(page.getByRole('heading', { name: `Bem-vindo ao ${name}!`, level: 1 })).toBeVisible()
    await expect(page.getByText(`${name} ativo até 28/09/2027`)).toBeVisible()
    await expect(page.locator('.confetti-particle')).toHaveCount(0)
    await expect(primaries(page)).toHaveCount(1)
    await page.getByRole('link', { name: 'Ir para o Hoje' }).click()
    await page.waitForURL('**/hoje')
  })
})

