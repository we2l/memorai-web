import { test, expect, gotoApp, apiCall, uid, loginState, forgetSession, API, WEB, USERS, AUDIT_PASSWORD, SESSION_COOKIE } from './support/fixtures'
import type { Page, BrowserContext } from '@playwright/test'

/**
 * Logout e sessão expirada no meio do uso (401 → /entrar?redirect=… sem perder o que foi digitado?).
 * Usuários próprios: e2e-logout (sessão descartada pelo logout) e e2e-session (sessão "expirada").
 */

async function me(context: BrowserContext) {
  return context.request.get(`${API}/me`, { headers: { Accept: 'application/json', Origin: WEB, Referer: `${WEB}/` } })
}

/**
 * Simula a sessão expirada/revogada: some o cookie de sessão e o "lembrar de mim" (o login da API
 * sempre usa remember=true, então só o cookie de sessão não basta — o recaller reautentica).
 */
async function expireSession(context: BrowserContext) {
  await context.clearCookies({ name: SESSION_COOKIE })
  await context.clearCookies({ name: /^remember_web_/ })
}

async function loginViaForm(page: Page, email: string) {
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(AUDIT_PASSWORD)
  await page.locator('button[type="submit"]').click()
}

/** "Sair" lives in the account menu of the TopNav (navegação v3; it was the sidebar footer). */
async function signOut(page: import('@playwright/test').Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
}

test.describe('Logout', () => {
  test('"Sair" encerra a sessão no servidor e rotas privadas voltam para /entrar', async ({ browser }) => {
    const state = await loginState(browser, 'logout', { fresh: true })
    const context = await browser.newContext({ storageState: state })
    const page = await context.newPage()
    try {
      await gotoApp(page, '/progresso')
      await signOut(page)
      await page.waitForURL('**/entrar**')
      expect((await me(context)).status()).toBe(401)

      // Voltar no histórico não mostra a tela privada: o logout recarrega no lugar dela (utils/accountState.ts)
      await page.goBack()
      expect(page.url()).not.toContain('/progresso')
      await page.goto('/hoje')
      await page.waitForURL('**/entrar?redirect=**')
      expect(new URL(page.url()).searchParams.get('redirect')).toBe('/hoje')
    } finally {
      await context.close()
      forgetSession(USERS.logout.email) // sessão morta: o próximo uso refaz o login
    }
  })

  test('logout sem rede: a sessão não pode continuar válida neste navegador', async ({ browser }) => {
    const state = await loginState(browser, 'logout', { fresh: true })
    const context = await browser.newContext({ storageState: state })
    const page = await context.newPage()
    try {
      await gotoApp(page, '/hoje')
      await page.route('**/api/logout', route => route.abort('internetdisconnected'))
      await signOut(page)
      await page.waitForURL('**/entrar**', { timeout: 10_000 })
      await page.unroute('**/api/logout')
      // A pessoa seguinte neste navegador abre uma rota privada
      await page.goto('/hoje')
      await page.waitForLoadState('networkidle')
      const meStatus = (await me(context)).status()
      test.info().annotations.push({ type: 'evidência', description: `após logout offline: URL=${page.url()} GET /me=${meStatus}` })
      // The cookie is HttpOnly: the boot finishes the logout that had no network (utils/pendingLogout.ts)
      expect(new URL(page.url()).pathname, 'logout offline deixou a conta acessível').toBe('/entrar')
    } finally {
      await context.close()
      forgetSession(USERS.logout.email)
    }
  })
})

test.describe('Sessão expirada no meio do uso', () => {
  test.use({ auditUser: 'session' })

  test('401 numa ação leva a /entrar com redirect e, após entrar, volta para a mesma tela', async ({ page, context }) => {
    await gotoApp(page, '/hoje')
    const t = await apiCall(page, 'POST', '/topics', { name: `Sessão ${uid()}` })
    await gotoApp(page, `/cadernos/${t.data.id}/cards`)
    await expireSession(context)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await page.waitForURL('**/entrar?redirect=**', { timeout: 10_000 }).catch(() => {})
    if (!page.url().includes('/entrar')) {
      // Abrir o modal não chama a API: força a chamada salvando
      const dialog = page.getByRole('dialog', { name: /^(Novo|Editar) card$/ })
      await dialog.locator('.ProseMirror').nth(0).click()
      await page.keyboard.type('Pergunta digitada antes do 401')
      await dialog.locator('.ProseMirror').nth(1).click()
      await page.keyboard.type('Resposta digitada')
      await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
      await page.waitForURL('**/entrar?redirect=**')
    }
    const redirect = new URL(page.url()).searchParams.get('redirect')
    expect(redirect).toContain(`/cadernos/${t.data.id}/cards`)

    await page.waitForLoadState('networkidle')
    await loginViaForm(page, USERS.session.email)
    await page.waitForURL(u => u.pathname === `/cadernos/${t.data.id}/cards`, { timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 1, name: 'Todos os cards' })).toBeVisible()
  })

  test('texto da nota digitado quando a sessão expira não se perde', async ({ page, context }) => {
    await gotoApp(page, '/hoje')
    const t = await apiCall(page, 'POST', '/topics', { name: `Rascunho ${uid()}` })
    const n = await apiCall(page, 'POST', `/topics/${t.data.id}/notes`, { title: 'Nota longa', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Início.' }] }] } })
    // The notes list has no content (prd-performance-caderno): the saved text is read from the note itself
    const noteText = async () => JSON.stringify((await apiCall(page, 'GET', `/notes/${n.data.id}`)).data.content)
    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.getByTestId('material-row').filter({ hasText: 'Nota longa' }).getByTestId('material-title').click()
    const editor = page.locator('.ProseMirror').first()
    await expect(editor).toContainText('Início.')

    await expireSession(context)
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' Parágrafo importante.') // < 50 chars: sem job de embedding
    // Autosave → 401 → plugin manda para /entrar
    await page.waitForURL('**/entrar?redirect=**', { timeout: 10_000 })
    await page.waitForLoadState('networkidle')
    await loginViaForm(page, USERS.session.email)
    await page.waitForURL(u => u.pathname === `/cadernos/${t.data.id}/material/${n.data.id}`, { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    expect(await noteText()).not.toContain('Parágrafo importante')

    // A volta para a rota do material reabre a nota, que oferece o rascunho local (nunca aplicado sem a escolha da pessoa)
    const offer = page.getByRole('status').filter({ hasText: /Você tem alterações não salvas de \d{2}:\d{2}\./ })
    await expect(offer).toBeVisible()
    await expect(page.locator('.ProseMirror').first()).not.toContainText('Parágrafo importante')
    const saved = page.waitForResponse(r => r.request().method() === 'PUT' && /\/api\/notes\//.test(r.url()))
    await offer.getByRole('button', { name: 'Restaurar' }).click()
    await expect(page.locator('.ProseMirror').first()).toContainText('Início. Parágrafo importante.')
    expect((await saved).status()).toBe(200)
    await expect(offer).toBeHidden()
    await expect.poll(noteText).toContain('Parágrafo importante')
  })
})
