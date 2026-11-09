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

  const SHOTS = process.env.BLOG_SHOTS
  test('telas para conferência visual', async ({ page }) => {
    test.skip(!SHOTS, 'BLOG_SHOTS=pasta para gravar')
    test.setTimeout(120_000)
    for (const path of ['/blog', '/blog/curva-do-esquecimento', '/blog/como-revisar-lei-seca-inss', '/blog/alternativa-ao-anki', '/ferramentas/calculadora-do-esquecimento', '/ferramentas/plano-ate-a-prova', '/quem-faz']) {
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
