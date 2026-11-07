# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auditoria/onboarding-v3.spec.ts >> Sem confirmar o e-mail >> texto mostra Reenviar e Já confirmei; o exemplo continua liberado; sair no meio vai ao Hoje com o checklist
- Location: e2e/auditoria/onboarding-v3.spec.ts:107:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#verify-email-notice')
Expected substring: "Confirme seu e-mail para usar a IA"
Received string:    " Confirme seu e-mail para usar a prévia grátis da IA: enviamos um link para e2e-onb-exit@audit.test. "
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#verify-email-notice')
    14 × locator resolved to <p id="verify-email-notice" class="text-label text-fg-strong font-medium flex-1">…</p>
       - unexpected value " Confirme seu e-mail para usar a prévia grátis da IA: enviamos um link para e2e-onb-exit@audit.test. "

```

```yaml
- paragraph: "Confirme seu e-mail para usar a prévia grátis da IA: enviamos um link para e2e-onb-exit@audit.test."
```

# Test source

```ts
  19  |   await page.getByRole('button', { name: 'Continuar' }).click()
  20  |   await expect(page.getByRole('heading', { name: 'Vamos criar seus primeiros cards' })).toBeVisible()
  21  | }
  22  | 
  23  | /** Avalia os N cards pelo teclado: o 1º com "De novo", os outros com "Bom" (com ou sem o sumiço da fila). */
  24  | async function rateAll(page: Page, n: number, firstRating = '3') {
  25  |   for (let i = 0; i < n; i++) {
  26  |     await expect(page.getByTestId('review-card')).toBeVisible()
  27  |     await expect(page.getByTestId('review-batch')).toContainText(`card ${i + 1} de ${n}`)
  28  |     await page.keyboard.press('Space')
  29  |     await expect(page.getByTestId('review-answer')).toBeVisible()
  30  |     await page.keyboard.press(i === 0 ? firstRating : '3')
  31  |   }
  32  | }
  33  | 
  34  | const cardsOf = (key: UserKey) => sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${USERS[key].email}'`)
  35  | 
  36  | test.describe('Cadastro por e-mail até o 1º lote', () => {
  37  |   test('exemplo → 1º lote → celebração → Hoje, sem IA e sem confirmar o e-mail; ativação gravada uma vez', async ({ page }) => {
  38  |     test.setTimeout(120_000)
  39  |     await isolateRegisterThrottle(page)
  40  |     const aiCalls: string[] = []
  41  |     const apiCalls: string[] = []
  42  |     page.on('request', (r) => {
  43  |       const url = new URL(r.url())
  44  |       if (!url.pathname.startsWith('/api/')) return
  45  |       if (AI_ROUTE.test(url.pathname) && r.method() === 'POST') aiCalls.push(url.pathname)
  46  |       apiCalls.push(`${r.method()} ${url.pathname}`)
  47  |     })
  48  |     const email = `e2e-v3-${uid()}@audit.test`
  49  |     await page.goto('/criar-conta')
  50  |     await page.waitForLoadState('networkidle')
  51  |     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Criar sua conta')
  52  |     await expect(page.locator('#password_confirmation')).toHaveCount(0)
  53  |     await page.locator('#name').fill('Aluno Novo')
  54  |     await page.locator('#email').fill(email)
  55  |     await page.locator('#password').fill(AUDIT_PASSWORD)
  56  |     await page.locator('#accept_terms').check()
  57  | 
  58  |     const started = Date.now()
  59  |     let clicks = 0
  60  |     const res = page.waitForResponse(r => r.url().endsWith('/api/register'))
  61  |     await page.getByRole('button', { name: 'Criar conta' }).click(); clicks++
  62  |     const r = await res
  63  |     test.skip(r.status() === 429, 'ambiente: throttle de cadastro (3/h por IP) esgotado')
  64  |     expect(r.status()).toBe(201)
  65  | 
  66  |     await page.waitForURL('**/comecar')
  67  |     await page.getByRole('radio', { name: 'Concurso ou OAB' }).check(); clicks++
  68  |     await page.getByRole('button', { name: 'Continuar' }).click(); clicks++
  69  |     await page.getByRole('button', { name: 'Criar 8 cards e revisar' }).click(); clicks++
  70  | 
  71  |     await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
  72  |     await expect(page.getByTestId('review-card')).toBeVisible()
  73  |     const toFirstCard = Date.now() - started
  74  |     test.info().annotations.push({ type: 'medição', description: `1º card: ${clicks} cliques, ${toFirstCard} ms` })
  75  |     expect(clicks, 'cliques até o 1º card').toBeLessThanOrEqual(5)
  76  |     expect(toFirstCard, 'tempo até o 1º card').toBeLessThan(15_000)
  77  | 
  78  |     await expect(page.getByTestId('review-onboarding')).toContainText('Passo 3 de 3')
  79  |     // Passo 3 sem a casca: sem o aviso de e-mail ocupando a altura da revisão e sem IA à vista
  80  |     await expect(page.locator('#verify-email-notice')).toHaveCount(0)
  81  |     await expect(page.getByTestId('review-show')).toBeInViewport()
  82  |     // O 1º com "De novo" na hora: o diário de erros não interrompe o 1º lote, mesmo com a tecla antes do /settings
  83  |     await rateAll(page, 8, '1')
  84  | 
  85  |     const end = page.getByTestId('onboarding-end')
  86  |     await expect(end).toBeVisible({ timeout: 15_000 })
  87  |     await expect(end.getByRole('heading', { level: 1 })).toHaveText('Primeiro lote concluído!')
  88  |     await expect(end.getByTestId('onboarding-remembered')).toHaveText('Você lembrou 7 de 8.')
  89  |     await expect(end.getByTestId('onboarding-tomorrow')).toContainText('Amanhã')
  90  |     await expect(end.getByTestId('onboarding-reminder')).toContainText('19h')
  91  | 
  92  |     await expect.poll(() => sql(`select first_batch_at is not null from users where email='${email}'`)).toBe('t')
  93  |     expect(apiCalls.filter(c => c === 'POST /api/onboarding/first-batch')).toHaveLength(1)
  94  |     expect(aiCalls, 'nenhuma rota de IA no caminho do exemplo').toEqual([])
  95  |     expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${email}' and f.source_note_id is not null`)).toBe('8')
  96  |     expect(sql(`select email_verified_at is null from users where email='${email}'`)).toBe('t')
  97  | 
  98  |     await end.getByRole('link', { name: 'Ir para o Hoje' }).click()
  99  |     await page.waitForURL('**/hoje')
  100 |     await expect(page.getByTestId('sample-tag').first()).toHaveText('Exemplo')
  101 |   })
  102 | })
  103 | 
  104 | test.describe('Sem confirmar o e-mail', () => {
  105 |   test.use({ auditUser: 'onbExit' })
  106 | 
  107 |   test('texto mostra Reenviar e Já confirmei; o exemplo continua liberado; sair no meio vai ao Hoje com o checklist', async ({ page }) => {
  108 |     await page.route('**/api/email/verification-notification', r => r.fulfill({ status: 202, json: { message: 'ok' } }))
  109 |     // Os textos legais abrem mesmo antes de concluir (não voltam para /comecar)
  110 |     await gotoApp(page, '/termos')
  111 |     expect(new URL(page.url()).pathname).toBe('/termos')
  112 |     await gotoApp(page, '/comecar')
  113 |     await chooseMode(page, 'Outro')
  114 | 
  115 |     await expect(page.getByTestId('verify-email-line')).toContainText('Confirme seu e-mail quando puder')
  116 |     await expect(page.getByRole('radio', { name: 'Usar um material de exemplo' })).toBeChecked()
  117 |     await page.getByRole('radio', { name: 'Colar um texto' }).check()
  118 |     const notice = page.locator('#verify-email-notice')
> 119 |     await expect(notice).toContainText('Confirme seu e-mail para usar a IA')
      |                          ^ Error: expect(locator).toContainText(expected) failed
  120 |     await expect(page.getByRole('button', { name: 'Reenviar e-mail' })).toBeVisible()
  121 |     await expect(page.getByRole('button', { name: 'Já confirmei' })).toBeVisible()
  122 |     await expect(page.getByTestId('content-primary')).toBeDisabled()
  123 | 
  124 |     await page.getByRole('radio', { name: 'Usar um material de exemplo' }).check()
  125 |     await expect(notice).toHaveCount(0)
  126 |     await page.getByRole('button', { name: 'Criar 8 cards e revisar' }).click()
  127 |     await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
  128 |     await expect(page.getByTestId('review-card')).toBeVisible()
  129 |     expect(cardsOf('onbExit')).toBe('8')
  130 | 
  131 |     // Sair no meio: o onboarding já acabou, então o Hoje abre (e não volta para /comecar)
  132 |     await page.getByTestId('review-exit').click()
  133 |     await page.waitForURL('**/hoje')
  134 |     await expect(page.getByTestId('home-checklist')).toBeVisible()
  135 |     // O assistente não reabre: "Voltar" não criaria outro caderno nem gastaria cota
  136 |     await page.goto('/comecar')
  137 |     await page.waitForURL('**/hoje')
  138 |     expect(sql(`select first_batch_at is null from users where email='${USERS.onbExit.email}'`)).toBe('t')
  139 |   })
  140 | })
  141 | 
  142 | test.describe('Texto com o e-mail confirmado', () => {
  143 |   test.use({ auditUser: 'onbText' })
  144 | 
  145 |   test('IA mockada na geração: gera, grava pela API real e revisa o recorte da nota', async ({ page }) => {
  146 |     test.setTimeout(90_000)
  147 |     const cards = [
  148 |       { front: 'O que é fotossíntese?', back: 'Luz vira energia química.' },
  149 |       { front: 'Onde ocorre?', back: 'Nos cloroplastos.' },
  150 |     ]
  151 |     await page.route('**/api/ai/generate-cards', r => r.fulfill({ status: 202, json: { data: { id: '00000000-0000-4000-8000-000000000002', status: 'done', result: { cards }, error: null } } }))
  152 |     await gotoApp(page, '/comecar')
  153 |     await chooseMode(page, 'Faculdade')
  154 |     await expect(page.getByTestId('verify-email-line')).toHaveCount(0)
  155 |     await page.getByRole('radio', { name: 'Colar um texto' }).check()
  156 |     await page.locator('#material').fill('Fotossíntese ocorre nos cloroplastos.')
  157 |     await expect(page.locator('#notebook-name')).toHaveValue(/Fotossíntese/)
  158 |     // Fechar o onboarding falha uma vez: os cards já existem, então só isso é refeito
  159 |     let failures = 1
  160 |     await page.route('**/api/onboarding/complete', (r) => {
  161 |       if (failures-- > 0) return r.fulfill({ status: 500, json: { message: 'erro' } })
  162 |       return r.continue()
  163 |     })
  164 |     await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
  165 |     const retry = page.getByTestId('processing-retry')
  166 |     await expect(retry).toBeVisible()
  167 |     await expect(page.getByTestId('processing-state')).toContainText('Seu material está salvo')
  168 |     expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${USERS.onbText.email}'`)).toBe('2')
  169 |     await retry.click()
  170 |     await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
  171 |     await rateAll(page, 2)
  172 |     await expect(page.getByTestId('onboarding-end')).toBeVisible({ timeout: 15_000 })
  173 |     expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${USERS.onbText.email}' and f.source_note_id is not null`)).toBe('2')
  174 |     await expect.poll(() => sql(`select first_batch_at is not null from users where email='${USERS.onbText.email}'`)).toBe('t')
  175 |   })
  176 | })
  177 | 
  178 | test.describe('Prova opcional', () => {
  179 |   test.use({ auditUser: 'onbExam' })
  180 | 
  181 |   test('modo concurso: a data vira uma prova no caderno de exemplo, só depois dos cards', async ({ page }) => {
  182 |     await gotoApp(page, '/comecar')
  183 |     await page.getByRole('radio', { name: 'Concurso ou OAB' }).check()
  184 |     const date = page.getByLabel(/Quando é a sua prova/)
  185 |     await expect(date).toBeVisible()
  186 |     // Data que a API recusaria: avisa aqui, em vez de sumir em silêncio depois dos cards
  187 |     await date.fill('2020-01-01')
  188 |     await page.getByRole('button', { name: 'Continuar' }).click()
  189 |     await expect(page.getByText('Escolha uma data a partir de amanhã.')).toBeVisible()
  190 |     await date.fill('2031-03-10')
  191 |     expect(sql(`select count(*) from exams e join users u on u.id=e.user_id where u.email='${USERS.onbExam.email}'`)).toBe('0')
  192 |     await page.getByRole('button', { name: 'Continuar' }).click()
  193 |     await expect(page.getByTestId('content-step')).toContainText('Princípios fundamentais da Constituição')
  194 |     const created = page.waitForResponse(r => r.url().endsWith('/api/exams') && r.request().method() === 'POST')
  195 |     await page.getByRole('button', { name: 'Criar 8 cards e revisar' }).click()
  196 |     expect((await created).status()).toBe(201)
  197 |     await expect.poll(() => sql(`select count(*) from exams e join users u on u.id=e.user_id where u.email='${USERS.onbExam.email}' and e.exam_date='2031-03-10'`)).toBe('1')
  198 |     await expect(page.getByTestId('review-card')).toBeVisible()
  199 |   })
  200 | })
  201 | 
  202 | test.describe('Anki sem confirmar o e-mail', () => {
  203 |   test.use({ auditUser: 'onbAnki' })
  204 | 
  205 |   test('"Trazer do Anki" abre o import e conclui o onboarding', async ({ page }) => {
  206 |     await gotoApp(page, '/comecar')
  207 |     await chooseMode(page, 'Idiomas')
  208 |     await page.getByRole('radio', { name: 'Trazer do Anki' }).check()
  209 |     await expect(page.getByTestId('content-primary')).toBeEnabled()
  210 |     await page.getByRole('button', { name: 'Importar do Anki' }).click()
  211 |     await page.waitForURL('**/importar')
  212 |     expect(sql(`select onboarding_completed_at is not null from users where email='${USERS.onbAnki.email}'`)).toBe('t')
  213 |   })
  214 | })
  215 | 
  216 | test.describe('Caderno de exemplo', () => {
  217 |   test.use({ auditUser: 'onbSample' })
  218 | 
  219 |   test('selo "Exemplo" na lista, no Hoje e no caderno; "Apagar o exemplo" remove', async ({ page }) => {
```