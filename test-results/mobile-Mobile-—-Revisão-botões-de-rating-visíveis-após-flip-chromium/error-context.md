# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.ts >> Mobile — Revisão >> botões de rating visíveis após flip
- Location: e2e/mobile.spec.ts:61:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/hoje" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic:
    - status
    - alert
  - generic [ref=e5]:
    - generic [ref=e7]:
      - img "Baigi" [ref=e9]
      - generic [ref=e10]: BAIGI.
    - paragraph [ref=e11]: Volte para o seu estudo
    - paragraph [ref=e12]: Revise no tempo certo e pare de esquecer
    - button "Entrar com Google (1 clique)" [ref=e13] [cursor=pointer]
    - generic [ref=e20]: ou entre com e-mail
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]: E-mail
        - textbox "E-mail" [ref=e27]:
          - /placeholder: seu@email.com
          - text: verified@e2e.test
      - generic [ref=e28]:
        - generic [ref=e29]: Senha
        - textbox "Senha" [ref=e30]:
          - /placeholder: ••••••••
          - text: password
        - link "Esqueci minha senha" [ref=e32] [cursor=pointer]:
          - /url: /esqueci-senha
      - button "Entrar" [ref=e33] [cursor=pointer]
      - alert [ref=e34]: Muitas tentativas. Aguarde 1 minuto e tente novamente.
    - paragraph [ref=e35]:
      - text: Não tem conta?
      - link "Criar conta" [ref=e36] [cursor=pointer]:
        - /url: /criar-conta
```

# Test source

```ts
  1  | import { type Page } from '@playwright/test'
  2  | 
  3  | const TEST_USER = {
  4  |   email: process.env.E2E_EMAIL || 'weslleyadesousa@gmail.com',
  5  |   password: process.env.E2E_PASSWORD || 'password',
  6  | }
  7  | 
  8  | export async function login(page: Page) {
  9  |   await page.goto('/entrar')
  10 |   // /entrar is prerendered: wait for hydration before submitting (else native submit)
  11 |   await page.waitForLoadState('networkidle')
  12 | 
  13 |   // Ensure fields are visible (scroll if needed on mobile)
  14 |   const emailInput = page.locator('#email')
  15 |   await emailInput.scrollIntoViewIfNeeded()
  16 |   await emailInput.fill(TEST_USER.email)
  17 | 
  18 |   const passwordInput = page.locator('#password')
  19 |   await passwordInput.scrollIntoViewIfNeeded()
  20 |   await passwordInput.fill(TEST_USER.password)
  21 | 
  22 |   const submitBtn = page.locator('button[type="submit"]')
  23 |   await submitBtn.scrollIntoViewIfNeeded()
  24 |   await submitBtn.click()
  25 | 
> 26 |   await page.waitForURL('**/hoje', { timeout: 15000 })
     |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  27 | }
  28 | 
```