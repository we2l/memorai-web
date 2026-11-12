import { expect, test } from '@playwright/test'

// prd-blog-seo RF-T1, RF-T2, RF-B9: the free tools and the quiz work on the prerendered pages, with no API.
// BLOG_SHOTS=dir also saves the screens at 390 and 1440 px, light and dark (visual check of the PR).

test.describe('blog e ferramentas', () => {
  test('calculadora do esquecimento recalcula e leva ao mini-lote', async ({ page }) => {
    await page.goto('/ferramentas/calculadora-do-esquecimento')
    const percent = page.getByTestId('tool-forgetting-percent')
    await expect(percent).toHaveText('77%')
    await page.locator('#forgetting-days').fill('30')
    await expect(percent).toHaveText('67%')
    await page.locator('#forgetting-times').selectOption('3')
    await expect(percent).not.toHaveText('67%')
    await expect(page.getByTestId('tool-forgetting-cta')).toHaveAttribute('href', /^\/comecar\?utm_source=blog/)
  })

  test('plano até a prova: data e volume mudam os números; data passada pede outra', async ({ page }) => {
    await page.goto('/ferramentas/plano-ate-a-prova?area=concurso')
    await expect(page.getByTestId('tool-plan-new')).toHaveText('7')
    await page.locator('#plan-cards').fill('3000')
    await expect(page.getByTestId('tool-plan-new')).toHaveText('35')
    await page.locator('#plan-date').fill('2000-01-01')
    await expect(page.getByText('Escolha uma data a partir de amanhã')).toBeVisible()
    await expect(page.getByTestId('tool-plan-cta')).toHaveAttribute('href', /^\/comecar\/concurso\?/)
  })

  test('quiz do artigo: resposta depois da tentativa e chamada da área', async ({ page }) => {
    await page.goto('/blog/como-revisar-lei-seca-inss')
    const quiz = page.getByTestId('blog-quiz')
    await quiz.scrollIntoViewIfNeeded()
    // The first card by mouse, the others by keyboard (Espaço shows, 2 = Lembrei, 1 = Não lembrei)
    await quiz.getByTestId('blog-quiz-reveal').click()
    await expect(quiz.getByTestId('blog-quiz-answer')).toBeVisible()
    await quiz.getByTestId('rate-3').click()
    // The review's answer band, compact in the article (prd-visual-e2 Fase 2b): a hit goes on in 1.2 s
    const band = quiz.getByTestId('review-feedback')
    await expect(band).toHaveAttribute('data-kind', 'ok')
    await expect(band).toHaveAttribute('data-compact', 'true')
    await expect(band).toContainText('Volta em 2 dias.')
    await expect(band).toHaveCount(0, { timeout: 3000 })
    while (await quiz.getByTestId('blog-quiz-reveal').isVisible()) {
      await quiz.getByTestId('blog-quiz-card').focus()
      await page.keyboard.press('Space')
      await expect(quiz.getByTestId('blog-quiz-answer')).toBeVisible()
      await page.keyboard.press('1')
      // A miss waits for "Continuar" (Enter); no "Por quê?" without an account
      await expect(band).toHaveAttribute('data-kind', 'again')
      await expect(band.getByTestId('review-why')).toHaveCount(0)
      await page.keyboard.press('Enter')
      await expect(band).toHaveCount(0)
    }
    await expect(quiz.getByTestId('blog-quiz-result')).toContainText('Você lembrou 1 de')
    await expect(quiz.getByTestId('ui-arc')).toHaveAttribute('data-got', '1')
    await expect(quiz.getByTestId('blog-quiz-cta')).toHaveAttribute('href', /^\/comecar\/concurso\?.*utm_content=como-revisar-lei-seca-inss-quiz/)
  })

  // prd-blog-v2: the card that turns (keyboard), the contents beside the text from 1024 px, the thin cookie bar, the
  // brand as the author and the filter of the index
  test('artigo v2: card que vira pelo teclado, sumário lateral marca a seção, barra fina de cookies e autor Baigi', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    // No decision yet: the consent banner shows (the default storage state has one)
    await page.context().clearCookies()
    await page.goto('/blog/tj-sp-escrevente-lei-seca-vunesp')
    const consent = page.getByTestId('consent-banner')
    await expect(consent).toBeVisible()
    expect((await consent.boundingBox())!.height).toBeLessThan(90)
    await expect(page.getByTestId('blog-byline')).toContainText('Por Baigi')
    await expect(page.getByTestId('blog-byline').getByRole('link', { name: 'Baigi' })).toHaveAttribute('href', '/blog/sobre')
    await expect(page.getByTestId('blog-cover')).toContainText('16')

    const card = page.getByTestId('blog-example-card')
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByTestId('blog-example-answer')).toBeHidden()
    await card.focus()
    await page.keyboard.press('Space')
    await expect(card.getByTestId('blog-example-answer')).toBeVisible()
    await page.keyboard.press('2')
    const band = card.getByTestId('review-feedback')
    await expect(band).toHaveAttribute('data-kind', 'ok')
    await expect(band).toHaveAttribute('data-compact', 'true')
    await page.keyboard.press('Enter')
    await expect(band).toHaveCount(0)
    await expect(card).toHaveAttribute('data-state', 'done')

    const toc = page.getByTestId('blog-toc')
    await expect(toc).toBeVisible()
    await toc.getByRole('link', { name: 'Perguntas frequentes' }).click()
    await expect(toc.locator('a[aria-current="location"]')).toHaveText('Perguntas frequentes')
  })

  test('índice v2: destaque, filtro por categoria na URL e o link Sobre', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByTestId('blog-featured')).toBeVisible()
    await page.getByTestId('blog-filter-oab').click()
    await expect(page).toHaveURL(/#oab$/)
    await expect(page.getByTestId('blog-featured')).toHaveCount(0)
    await expect(page.getByTestId('blog-grid').locator('article')).toHaveCount(2)
    await page.getByTestId('blog-filter-all').click()
    await expect(page.getByTestId('blog-featured')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Como eles são feitos' })).toHaveAttribute('href', '/blog/sobre')
  })

  const SHOTS = process.env.BLOG_SHOTS
  test('telas para conferência visual', async ({ page }) => {
    test.skip(!SHOTS, 'BLOG_SHOTS=pasta para gravar')
    test.setTimeout(120_000)
    for (const path of ['/blog', '/blog/sobre', '/blog/caderno-de-erros-digital', '/blog/tj-sp-escrevente-lei-seca-vunesp', '/blog/curva-do-esquecimento', '/blog/como-revisar-lei-seca-inss', '/blog/alternativa-ao-anki', '/ferramentas/calculadora-do-esquecimento', '/ferramentas/plano-ate-a-prova', '/quem-faz']) {
      for (const width of [390, 768, 1024, 1280, 1440]) {
        for (const theme of ['light', 'dark']) {
          await page.setViewportSize({ width, height: 900 })
          await page.addInitScript(t => localStorage.setItem('color-mode', t), theme)
          await page.goto(path)
          await page.waitForLoadState('networkidle')
          const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
          expect(scroll, `${path} ${width} sem rolagem lateral`).toBeLessThanOrEqual(0)
          await page.screenshot({ path: `${SHOTS}/${path.replace(/\//g, '_')}-${width}-${theme}.png`, fullPage: true })
        }
      }
    }
  })
})
