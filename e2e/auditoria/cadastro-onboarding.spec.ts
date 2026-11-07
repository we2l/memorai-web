import { test, expect, gotoApp, uid, sql, loginState, verifyEmail, USERS, AUDIT_PASSWORD } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Cadastro (validações) → onboarding → primeiro caderno → primeiro card → primeira revisão, pelos 3 passos do
 * prd-4g-conta-onboarding-v3. O caminho do exemplo está em onboarding-v3.spec.ts.
 *
 * Throttle de cadastro: 3/h por IP, compartilhado com quem mais usa a API local. Cada chamada a
 * /api/register deste spec sai com um X-Forwarded-For próprio da execução (a API confia em qualquer
 * proxy — `trustProxies(at: '*')` — o que também é um achado de segurança). São 2 cadastros por execução.
 */
const RUN_IP = `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`

async function isolateRegisterThrottle(page: Page) {
  await page.route('**/api/register', async route => route.continue({ headers: { ...(await route.request().allHeaders()), 'x-forwarded-for': RUN_IP } }))
}

async function fillSignup(page: Page, data: { name: string; email: string; password: string; terms?: boolean }) {
  await page.goto('/criar-conta')
  await page.waitForLoadState('networkidle')
  await page.locator('#name').fill(data.name)
  await page.locator('#email').fill(data.email)
  await page.locator('#password').fill(data.password)
  if (data.terms !== false) await page.locator('#accept_terms').check()
}

const fakeCards = [
  { front: 'O que é fotossíntese?', back: 'Conversão de luz em energia química pelas plantas.' },
  { front: 'Onde ocorre a fotossíntese?', back: 'Nos cloroplastos.' },
  { front: 'Pigmento principal?', back: 'Clorofila.' },
]

/** /ai/generate-cards respondendo como o job pronto (202 + job "done" no próprio POST). */
async function mockGenerate(page: Page, cards = fakeCards, status: 'done' | 'failed' = 'done') {
  const calls: any[] = []
  await page.route('**/api/ai/generate-cards', (route) => {
    calls.push(JSON.parse(route.request().postData() ?? '{}'))
    return route.fulfill({ status: 202, json: { data: { id: '00000000-0000-4000-8000-000000000001', status, result: status === 'done' ? { cards } : null, error: status === 'failed' ? 'A IA não respondeu. Tente de novo.' : null } } })
  })
  return calls
}

/** /comecar até a opção "Colar um texto" do passo 2. */
async function toTextPath(page: Page, mode = 'Outro') {
  await gotoApp(page, '/comecar')
  await page.getByRole('radio', { name: mode }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('radio', { name: 'Colar um texto' }).check()
}

test.describe('Cadastro', () => {
  test('validação do servidor: e-mail duplicado aparece no campo', async ({ page, browser }) => {
    await loginState(browser, 'free') // garante que o e-mail duplicado existe nesta execução
    await isolateRegisterThrottle(page)
    await fillSignup(page, { name: 'Dup', email: USERS.free.email, password: AUDIT_PASSWORD })
    // e-mail do usuário Free da auditoria já existe (criado pelo provisionamento)
    const res = page.waitForResponse(r => r.url().endsWith('/api/register'))
    await page.getByRole('button', { name: 'Criar conta' }).click()
    const r = await res
    test.skip(r.status() === 429, 'ambiente: throttle de cadastro (3/h por IP) esgotado')
    expect(r.status()).toBe(422)
    await expect(page.locator('#email-error')).toBeVisible()
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#email-error')).not.toHaveText(/validation\.|The .* field/i)
    expect(new URL(page.url()).pathname).toBe('/criar-conta')
  })

  test('senha fraca: o cliente avisa antes de gastar uma tentativa', async ({ page }) => {
    let calls = 0
    await page.route('**/api/register', (r) => { calls++; return r.fulfill({ status: 422, json: { message: 'x', errors: {} } }) })
    await fillSignup(page, { name: 'Fraca', email: `e2e-fraca-${uid()}@audit.test`, password: '123' })
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.locator('#password-error')).toContainText('pelo menos 8 caracteres')
    await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toBe(0)
  })

  test('cadastro feliz → onboarding (pular) → primeiro caderno → primeiro card → primeira revisão', async ({ page }) => {
    test.setTimeout(90_000)
    await isolateRegisterThrottle(page)
    const email = `e2e-signup-${uid()}@audit.test`
    await fillSignup(page, { name: 'Novo Aluno', email, password: AUDIT_PASSWORD })
    const res = page.waitForResponse(r => r.url().endsWith('/api/register'))
    await page.getByRole('button', { name: 'Criar conta' }).click()
    const r = await res
    test.skip(r.status() === 429, 'ambiente: throttle de cadastro (3/h por IP) esgotado')
    expect(r.status()).toBe(201)

    // Onboarding pendente → /comecar, com o aviso de verificação do e-mail recém-cadastrado
    await page.waitForURL('**/comecar')
    await expect(page.getByRole('heading', { name: 'Como você vai estudar?' })).toBeVisible()
    await page.getByRole('radio', { name: 'Outro' }).check()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Vamos criar seus primeiros cards' })).toBeVisible()
    await expect(page.getByTestId('verify-email-line')).toContainText(email)
    await page.getByTestId('content-skip').click()
    await page.waitForURL('**/hoje')
    expect(sql(`select onboarding_completed_at is not null from users where email='${email}'`)).toBe('t')

    // Primeiro caderno
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Cadernos' }).click()
    await page.getByRole('button', { name: 'Criar caderno' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Novo caderno' })
    await createDialog.getByRole('textbox', { name: 'Nome do caderno' }).fill('Biologia')
    await createDialog.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByTestId('scope-header').getByRole('heading', { level: 1 })).toHaveText('Biologia')

    // Primeiro card: o caderno vazio oferece criar à mão (abre a biblioteca com o formulário)
    await page.getByTestId('empty-card').click()
    const dialog = page.getByRole('dialog', { name: /^(Novo|Editar) card$/ })
    await dialog.locator('.ProseMirror').nth(0).click()
    await page.keyboard.type('Organela da fotossíntese?')
    await dialog.locator('.ProseMirror').nth(1).click()
    await page.keyboard.type('Cloroplasto')
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status').getByText('Card criado!')).toBeVisible()

    // Primeira revisão
    // Revisar mora em Praticar (navegação v3)
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Praticar' }).click()
    await page.getByRole('link', { name: 'Revisar agora' }).click()
    await expect(page.getByTestId('review-card')).toContainText('Organela da fotossíntese?')
    // Obs.: aqui o Espaço não vira o card — o foco ficou no link "Revisar agora" e o atalho
    // ignora Espaço com foco em <a> (useReviewShortcuts). Vira com clique.
    await page.getByTestId('review-card').click()
    await expect(page.getByTestId('review-answer')).toContainText('Cloroplasto')
    const rated = page.waitForResponse(r => r.url().endsWith('/api/review') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /^Bom/ }).click()
    expect((await rated).status()).toBeLessThan(300)
    expect(Number(sql(`select count(*) from reviews r join users u on u.id=r.user_id where u.email='${email}'`))).toBe(1)
  })
})

test.describe('Onboarding com IA (mockada)', () => {
  test.use({ auditUser: 'onboarding' })

  test('nome do caderno curto bloqueia antes de chamar a API', async ({ page }) => {
    let topicPosts = 0
    await page.route('**/api/topics', (r) => { if (r.request().method() === 'POST') topicPosts++; return r.fallback() })
    await toTextPath(page)
    await page.locator('#material').fill('Texto qualquer')
    await page.locator('#notebook-name').fill('A')
    await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
    await expect(page.getByText('Dê um nome ao caderno (pelo menos 2 caracteres).')).toBeVisible()
    expect(topicPosts).toBe(0)
  })

  test('falha da IA: mensagem e continua no passo do material (nenhum caderno vazio sobra)', async ({ page }) => {
    await mockGenerate(page, [], 'failed')
    await toTextPath(page)
    await page.locator('#material').fill('Fotossíntese: luz vira energia.')
    await page.locator('#notebook-name').fill('Bio Onboarding')
    await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'A IA não respondeu. Tente de novo.' })).toBeVisible()
    await expect(page.locator('#material')).toHaveValue(/Fotossíntese/)

    // 0 cards → orientação, nada de "0 cards prontos"
    await page.unroute('**/api/ai/generate-cards')
    await mockGenerate(page, [])
    await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
    await expect(page.getByText(/Não conseguimos criar cards com esse texto/)).toBeVisible()
    // Cada tentativa que falha apaga o caderno que criou
    await expect.poll(() => sql(`select count(*) from topics t join users u on u.id=t.user_id where u.email='${USERS.onboarding.email}' and t.name='Bio Onboarding'`)).toBe('0')
  })

  test('caminho feliz: material → cards prontos → começar revisão → primeira avaliação', async ({ page }) => {
    const calls = await mockGenerate(page)
    await toTextPath(page, 'Faculdade')
    await page.locator('#material').fill('Fotossíntese ocorre nos cloroplastos.')
    await page.locator('#notebook-name').fill('Bio Onboarding')
    const accepted = page.waitForResponse(r => r.url().endsWith('/api/ai/accept-cards'))
    await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
    // accept-cards contra a API real, com o topic_id de topo que o AcceptCardsRequest exige
    const res = await accepted
    expect(res.status(), 'POST /ai/accept-cards do onboarding').toBe(201)
    expect(res.request().postDataJSON()).toMatchObject({ topic_id: expect.any(String), note_id: expect.any(String), cards: expect.any(Array) })
    expect(calls[calls.length - 1]).toMatchObject({ source: 'notes', topic_id: expect.any(String), note_id: expect.any(String) })

    // Os cards existem: o onboarding está concluído e a primeira revisão é o passo 3
    await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
    expect(sql(`select onboarding_completed_at is not null from users where email='${USERS.onboarding.email}'`)).toBe('t')
    await expect(page.getByTestId('review-card')).toContainText(/fotossíntese|Pigmento/i)
    await page.keyboard.press('Space')
    await page.keyboard.press('3')
    await expect.poll(() => Number(sql(`select count(*) from reviews r join users u on u.id=r.user_id where u.email='${USERS.onboarding.email}'`))).toBe(1)
  })

})

test.describe('Onboarding de quem não confirmou o e-mail', () => {
  test.use({ auditUser: 'onboardingUnverified' })

  test('aviso com Reenviar e Já confirmei → verificação → gera (IA mockada) → accept real → revisão → fim do 1º lote', async ({ page }) => {
    test.setTimeout(90_000)
    // O reenvio real só registraria log (MAIL_MAILER=log), mas gasta o throttle de verificação compartilhado
    const resends: string[] = []
    await page.route('**/api/email/verification-notification', (r) => { resends.push(r.request().method()); return r.fulfill({ status: 202, json: { message: 'ok' } }) })
    const calls = await mockGenerate(page)
    await toTextPath(page)
    const notice = page.getByRole('status').filter({ hasText: /Confirme seu e-mail para usar (a prévia grátis d)?a IA/ })
    await expect(notice).toContainText(USERS.onboardingUnverified.email)

    await page.locator('#material').fill('Fotossíntese ocorre nos cloroplastos.')
    await page.locator('#notebook-name').fill('Bio Verificação')
    const transform = page.getByRole('button', { name: 'Gerar cards do texto' })
    // Ações de IA bloqueadas com o motivo (o aviso), nunca o 403 cru
    await expect(transform).toBeDisabled()
    await expect(transform).toHaveAttribute('aria-describedby', 'verify-email-notice')

    // Reenviar: fica em espera (throttle) depois de enviar
    await notice.getByRole('button', { name: 'Reenviar e-mail' }).click()
    await expect(notice.getByRole('button', { name: /^Reenviar em \d+s$/ })).toBeDisabled()
    expect(resends).toEqual(['POST'])

    // "Já confirmei" antes de confirmar: continua bloqueado
    await notice.getByRole('button', { name: 'Já confirmei' }).click()
    await expect(page.getByText('Ainda não recebemos a confirmação. Abra o link do e-mail e tente de novo.')).toBeVisible()
    await expect(transform).toBeDisabled()

    // Confirma (no lugar do link do e-mail) e "Já confirmei" relê o /me sem recarregar a página
    verifyEmail(USERS.onboardingUnverified)
    await notice.getByRole('button', { name: 'Já confirmei' }).click()
    await expect(notice).toBeHidden()
    await expect(transform).toBeEnabled()

    const accepted = page.waitForResponse(r => r.url().endsWith('/api/ai/accept-cards'))
    await transform.click()
    const res = await accepted
    expect(res.status(), 'POST /ai/accept-cards (API real)').toBe(201)
    expect(res.request().postDataJSON()).toMatchObject({ topic_id: expect.any(String) })
    expect(calls).toHaveLength(1)

    // Primeira revisão até o fim do lote
    await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
    for (let i = 0; i < 3; i++) {
      await expect(page.getByRole('button', { name: 'Card: toque ou Espaço para ver a resposta' })).toBeVisible()
      await page.keyboard.press('Space')
      await expect(page.getByTestId('review-answer')).toBeVisible()
      await page.keyboard.press('4')
    }
    await expect(page.getByTestId('onboarding-end')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('onboarding-tomorrow')).toContainText('Amanhã')
    expect(Number(sql(`select count(*) from reviews r join users u on u.id=r.user_id where u.email='${USERS.onboardingUnverified.email}'`))).toBe(3)
  })
})
