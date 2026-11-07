# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-cookie.spec.ts >> esqueci minha senha mostra a mensagem genérica
- Location: e2e/auth-cookie.spec.ts:89:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic:
    - status
    - alert
  - generic [ref=e3]:
    - banner [ref=e4]:
      - 'link "Baigi: ir para o início" [ref=e5] [cursor=pointer]':
        - /url: /
        - generic [ref=e6]:
          - img "Baigi" [ref=e8]
          - generic [ref=e9]: BAIGI.
    - main [ref=e10]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - heading "Esqueci a senha" [level=1] [ref=e14]
          - paragraph [ref=e15]: Enviamos um link para você criar uma nova.
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]: E-mail
            - textbox "E-mail" [ref=e20]
          - button "Enviar link" [ref=e21] [cursor=pointer]
        - paragraph [ref=e22]:
          - link "Voltar para entrar" [ref=e23] [cursor=pointer]:
            - /url: /entrar
    - contentinfo [ref=e24]:
      - link "Termos" [ref=e25] [cursor=pointer]:
        - /url: /termos
      - text: ·
      - link "Privacidade" [ref=e26] [cursor=pointer]:
        - /url: /privacidade
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { login } from './helpers'
  3   | 
  4   | // Sanctum SPA (ADR-020). Pre-conditions: API on localhost:8037 (docker compose up),
  5   | // `nuxt dev` on localhost:3000 and `php artisan db:seed --class=E2eSeeder`.
  6   | const API = process.env.E2E_API_ORIGIN || 'http://localhost:8037'
  7   | const UNVERIFIED = { email: 'unverified@e2e.test', password: process.env.E2E_PASSWORD || 'password' }
  8   | 
  9   | test.describe('páginas públicas pré-renderizadas', () => {
  10  |   test.use({ javaScriptEnabled: false })
  11  | 
  12  |   test('landing renderiza sem JavaScript', async ({ page }) => {
  13  |     await page.goto('/')
  14  |     await expect(page.locator('h1').first()).toBeVisible()
  15  |   })
  16  | })
  17  | 
  18  | test('rota privada sem sessão redireciona para /entrar', async ({ page }) => {
  19  |   await page.goto('/hoje')
  20  |   await page.waitForURL('**/entrar?redirect=**')
  21  |   expect(new URL(page.url()).searchParams.get('redirect')).toBe('/hoje')
  22  | })
  23  | 
  24  | test.describe('sessão por cookie', () => {
  25  |   test('login cria cookie HttpOnly e nenhum token legível', async ({ page, context }) => {
  26  |     await login(page)
  27  | 
  28  |     const cookies = await context.cookies()
  29  |     const session = cookies.find(c => c.name === 'baigi-session')
  30  |     expect(session?.httpOnly).toBe(true)
  31  |     expect(cookies.some(c => c.name === 'auth_token')).toBe(false)
  32  | 
  33  |     const jsCookies = await page.evaluate(() => document.cookie)
  34  |     expect(jsCookies).not.toContain('baigi-session')
  35  |   })
  36  | 
  37  |   test('logado em /: vai para /hoje antes da landing, sem aviso de hidratação', async ({ page }) => {
  38  |     await login(page)
  39  |     const errors: string[] = []
  40  |     page.on('console', (m) => { if (/Hydration/i.test(m.text())) errors.push(m.text()) })
  41  |     await page.goto('/')
  42  |     await page.waitForURL('**/hoje')
  43  |     await page.waitForLoadState('networkidle')
  44  |     expect(errors).toEqual([])
  45  |   })
  46  | 
  47  |   test('recarregar /hoje mantém a sessão', async ({ page }) => {
  48  |     await login(page)
  49  |     await page.reload()
  50  |     await page.waitForLoadState('networkidle')
  51  |     expect(new URL(page.url()).pathname).toBe('/hoje')
  52  |   })
  53  | 
  54  |   test('XSRF ausente ou inválido é renovado e a ação mutante funciona', async ({ page, context }) => {
  55  |     await login(page)
  56  | 
  57  |     // Harmless mutation through the app's own $api (same client the screens use)
  58  |     const mutate = () => page.evaluate(async () => {
  59  |       const app = (document.querySelector('#__nuxt') as any).__vue_app__
  60  |       const res = await app.config.globalProperties.$api('/onboarding/learning-mode', {
  61  |         method: 'POST',
  62  |         body: { learning_mode: 'general' },
  63  |       })
  64  |       return res.message as string
  65  |     })
  66  | 
  67  |     await context.clearCookies({ name: 'XSRF-TOKEN' })
  68  |     expect(await mutate()).toBe('Modo de estudo salvo.')
  69  | 
  70  |     // Stale token → API answers 419 → $api renews the cookie and retries once
  71  |     await context.addCookies([{ name: 'XSRF-TOKEN', value: 'invalido', domain: 'localhost', path: '/' }])
  72  |     expect(await mutate()).toBe('Modo de estudo salvo.')
  73  |   })
  74  | 
  75  |   test('logout encerra a sessão no servidor', async ({ page }) => {
  76  |     await login(page)
  77  |     await page.goto('/configuracoes')
  78  |     await page.getByRole('button', { name: 'Menu da conta' }).first().click()
  79  |     await page.getByRole('menuitem', { name: 'Sair' }).click()
  80  |     await page.waitForURL('**/entrar**')
  81  | 
  82  |     const me = await page.request.get(`${API}/api/me`, {
  83  |       headers: { Accept: 'application/json', Origin: 'http://localhost:3000', Referer: 'http://localhost:3000/' },
  84  |     })
  85  |     expect(me.status()).toBe(401)
  86  |   })
  87  | })
  88  | 
  89  | test('esqueci minha senha mostra a mensagem genérica', async ({ page }) => {
  90  |   await page.goto('/esqueci-senha')
> 91  |   await page.waitForLoadState('networkidle')
      |              ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
  92  |   const email = `ninguem-${Date.now()}@e2e.test` // unique: 3 requests / 15 min per e-mail
  93  |   await page.locator('#email').fill(email)
  94  |   await page.getByRole('button', { name: 'Enviar link' }).click()
  95  |   await expect(page.getByTestId('forgot-sent')).toContainText(`Se houver uma conta com ${email}, enviamos um link`)
  96  | })
  97  | 
  98  | test.describe('usuário não verificado', () => {
  99  |   test.use({ viewport: { width: 375, height: 812 } })
  100 | 
  101 |   test('banner de verificação legível no mobile', async ({ page }) => {
  102 |     await page.goto('/entrar')
  103 |     await page.waitForLoadState('networkidle')
  104 |     await page.locator('#email').fill(UNVERIFIED.email)
  105 |     await page.locator('#password').fill(UNVERIFIED.password)
  106 |     await page.locator('button[type="submit"]').click()
  107 |     await page.waitForURL('**/hoje', { timeout: 15000 })
  108 | 
  109 |     const banner = page.getByRole('status').filter({ hasText: 'Confirme seu e-mail' })
  110 |     await expect(banner).toBeVisible()
  111 |     await expect(banner.getByRole('button', { name: 'Reenviar e-mail' })).toBeVisible()
  112 |     const box = await banner.boundingBox()
  113 |     expect(box!.width).toBeLessThanOrEqual(375)
  114 |   })
  115 | })
  116 | 
```