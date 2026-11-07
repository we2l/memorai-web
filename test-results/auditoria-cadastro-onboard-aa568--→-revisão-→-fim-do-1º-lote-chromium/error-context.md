# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auditoria/cadastro-onboarding.spec.ts >> Onboarding de quem não confirmou o e-mail >> aviso com Reenviar e Já confirmei → verificação → gera (IA mockada) → accept real → revisão → fim do 1º lote
- Location: e2e/auditoria/cadastro-onboarding.spec.ts:193:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('status').filter({ hasText: 'Confirme seu e-mail para usar a IA' })
Expected substring: "e2e-onboarding-unverified@audit.test"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('status').filter({ hasText: 'Confirme seu e-mail para usar a IA' })

```

```yaml
- banner:
  - 'link "Baigi: ir para o início"':
    - /url: /
    - img "Baigi"
    - text: BAIGI.
- main:
  - progressbar "Passo 2 de 3"
  - heading "Vamos criar seus primeiros cards" [level=1]
  - paragraph: Escolha de onde vem o conteúdo. Em menos de 1 minuto você faz sua primeira revisão.
  - group "De onde vem o conteúdo":
    - text: De onde vem o conteúdo
    - radio "Usar um material de exemplo"
    - text: Usar um material de exemplo Curva do esquecimento e repetição espaçada · 3 páginas. Bom para conhecer o Baigi sem gastar nada.
    - radio "Enviar meu PDF ou apostila"
    - text: Enviar meu PDF ou apostila Vira nota e cards em segundo plano; você acompanha no caderno.
    - radio "Colar um texto" [checked]
    - text: Colar um texto Resumo, lei seca, anotação de aula.
    - radio "Trazer do Anki"
    - text: Trazer do Anki Seus baralhos e o histórico de revisão vêm junto.
  - status:
    - paragraph: "Confirme seu e-mail para usar a prévia grátis da IA: enviamos um link para e2e-onboarding-unverified@audit.test."
    - button "Reenviar e-mail"
    - button "Já confirmei"
  - text: Nome do caderno
  - textbox "Nome do caderno":
    - /placeholder: "Ex.: Direito Constitucional"
  - text: Seu texto
  - textbox "Seu texto":
    - /placeholder: Cole aqui um resumo, anotação de aula ou trecho de apostila.
  - paragraph: 0 de 5.000 caracteres
  - button "Gerar cards do texto" [disabled]
  - button "Voltar"
  - paragraph:
    - text: Prefere olhar primeiro?
    - button "Explorar o app sem cards"
  - complementary "Prévia de um card":
    - paragraph: O que mostra a curva do esquecimento de Ebbinghaus?
    - paragraph: Que o esquecimento é rápido logo depois de aprender e fica cada vez mais lento com o tempo.
    - paragraph: "Um card do exemplo: Curva do esquecimento e repetição espaçada"
    - paragraph: Depois da primeira revisão, o Baigi monta o seu plano do dia.
- contentinfo:
  - link "Termos":
    - /url: /termos
  - link "Privacidade":
    - /url: /privacidade
- status
- alert
```

# Test source

```ts
  101 |     await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Cadernos' }).click()
  102 |     await page.getByRole('button', { name: 'Criar caderno' }).click()
  103 |     const createDialog = page.getByRole('dialog', { name: 'Novo caderno' })
  104 |     await createDialog.getByRole('textbox', { name: 'Nome do caderno' }).fill('Biologia')
  105 |     await createDialog.getByRole('button', { name: 'Criar' }).click()
  106 |     await expect(page.getByTestId('scope-header').getByRole('heading', { level: 1 })).toHaveText('Biologia')
  107 | 
  108 |     // Primeiro card: o caderno vazio oferece criar à mão (abre a biblioteca com o formulário)
  109 |     await page.getByTestId('empty-card').click()
  110 |     const dialog = page.getByRole('dialog', { name: /^(Novo|Editar) card$/ })
  111 |     await dialog.locator('.ProseMirror').nth(0).click()
  112 |     await page.keyboard.type('Organela da fotossíntese?')
  113 |     await dialog.locator('.ProseMirror').nth(1).click()
  114 |     await page.keyboard.type('Cloroplasto')
  115 |     await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
  116 |     await expect(page.getByRole('status').getByText('Card criado!')).toBeVisible()
  117 | 
  118 |     // Primeira revisão
  119 |     // Revisar mora em Praticar (navegação v3)
  120 |     await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Praticar' }).click()
  121 |     await page.getByRole('link', { name: 'Revisar agora' }).click()
  122 |     await expect(page.getByTestId('review-card')).toContainText('Organela da fotossíntese?')
  123 |     // Obs.: aqui o Espaço não vira o card — o foco ficou no link "Revisar agora" e o atalho
  124 |     // ignora Espaço com foco em <a> (useReviewShortcuts). Vira com clique.
  125 |     await page.getByTestId('review-card').click()
  126 |     await expect(page.getByTestId('review-answer')).toContainText('Cloroplasto')
  127 |     const rated = page.waitForResponse(r => r.url().endsWith('/api/review') && r.request().method() === 'POST')
  128 |     await page.getByRole('button', { name: /^Bom/ }).click()
  129 |     expect((await rated).status()).toBeLessThan(300)
  130 |     expect(Number(sql(`select count(*) from reviews r join users u on u.id=r.user_id where u.email='${email}'`))).toBe(1)
  131 |   })
  132 | })
  133 | 
  134 | test.describe('Onboarding com IA (mockada)', () => {
  135 |   test.use({ auditUser: 'onboarding' })
  136 | 
  137 |   test('nome do caderno curto bloqueia antes de chamar a API', async ({ page }) => {
  138 |     let topicPosts = 0
  139 |     await page.route('**/api/topics', (r) => { if (r.request().method() === 'POST') topicPosts++; return r.fallback() })
  140 |     await toTextPath(page)
  141 |     await page.locator('#material').fill('Texto qualquer')
  142 |     await page.locator('#notebook-name').fill('A')
  143 |     await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
  144 |     await expect(page.getByText('Dê um nome ao caderno (pelo menos 2 caracteres).')).toBeVisible()
  145 |     expect(topicPosts).toBe(0)
  146 |   })
  147 | 
  148 |   test('falha da IA: mensagem e continua no passo do material (nenhum caderno vazio sobra)', async ({ page }) => {
  149 |     await mockGenerate(page, [], 'failed')
  150 |     await toTextPath(page)
  151 |     await page.locator('#material').fill('Fotossíntese: luz vira energia.')
  152 |     await page.locator('#notebook-name').fill('Bio Onboarding')
  153 |     await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
  154 |     await expect(page.getByRole('alert').filter({ hasText: 'A IA não respondeu. Tente de novo.' })).toBeVisible()
  155 |     await expect(page.locator('#material')).toHaveValue(/Fotossíntese/)
  156 | 
  157 |     // 0 cards → orientação, nada de "0 cards prontos"
  158 |     await page.unroute('**/api/ai/generate-cards')
  159 |     await mockGenerate(page, [])
  160 |     await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
  161 |     await expect(page.getByText(/Não conseguimos criar cards com esse texto/)).toBeVisible()
  162 |     // Cada tentativa que falha apaga o caderno que criou
  163 |     await expect.poll(() => sql(`select count(*) from topics t join users u on u.id=t.user_id where u.email='${USERS.onboarding.email}' and t.name='Bio Onboarding'`)).toBe('0')
  164 |   })
  165 | 
  166 |   test('caminho feliz: material → cards prontos → começar revisão → primeira avaliação', async ({ page }) => {
  167 |     const calls = await mockGenerate(page)
  168 |     await toTextPath(page, 'Faculdade')
  169 |     await page.locator('#material').fill('Fotossíntese ocorre nos cloroplastos.')
  170 |     await page.locator('#notebook-name').fill('Bio Onboarding')
  171 |     const accepted = page.waitForResponse(r => r.url().endsWith('/api/ai/accept-cards'))
  172 |     await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
  173 |     // accept-cards contra a API real, com o topic_id de topo que o AcceptCardsRequest exige
  174 |     const res = await accepted
  175 |     expect(res.status(), 'POST /ai/accept-cards do onboarding').toBe(201)
  176 |     expect(res.request().postDataJSON()).toMatchObject({ topic_id: expect.any(String), note_id: expect.any(String), cards: expect.any(Array) })
  177 |     expect(calls[calls.length - 1]).toMatchObject({ source: 'notes', topic_id: expect.any(String), note_id: expect.any(String) })
  178 | 
  179 |     // Os cards existem: o onboarding está concluído e a primeira revisão é o passo 3
  180 |     await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
  181 |     expect(sql(`select onboarding_completed_at is not null from users where email='${USERS.onboarding.email}'`)).toBe('t')
  182 |     await expect(page.getByTestId('review-card')).toContainText(/fotossíntese|Pigmento/i)
  183 |     await page.keyboard.press('Space')
  184 |     await page.keyboard.press('3')
  185 |     await expect.poll(() => Number(sql(`select count(*) from reviews r join users u on u.id=r.user_id where u.email='${USERS.onboarding.email}'`))).toBe(1)
  186 |   })
  187 | 
  188 | })
  189 | 
  190 | test.describe('Onboarding de quem não confirmou o e-mail', () => {
  191 |   test.use({ auditUser: 'onboardingUnverified' })
  192 | 
  193 |   test('aviso com Reenviar e Já confirmei → verificação → gera (IA mockada) → accept real → revisão → fim do 1º lote', async ({ page }) => {
  194 |     test.setTimeout(90_000)
  195 |     // O reenvio real só registraria log (MAIL_MAILER=log), mas gasta o throttle de verificação compartilhado
  196 |     const resends: string[] = []
  197 |     await page.route('**/api/email/verification-notification', (r) => { resends.push(r.request().method()); return r.fulfill({ status: 202, json: { message: 'ok' } }) })
  198 |     const calls = await mockGenerate(page)
  199 |     await toTextPath(page)
  200 |     const notice = page.getByRole('status').filter({ hasText: 'Confirme seu e-mail para usar a IA' })
> 201 |     await expect(notice).toContainText(USERS.onboardingUnverified.email)
      |                          ^ Error: expect(locator).toContainText(expected) failed
  202 | 
  203 |     await page.locator('#material').fill('Fotossíntese ocorre nos cloroplastos.')
  204 |     await page.locator('#notebook-name').fill('Bio Verificação')
  205 |     const transform = page.getByRole('button', { name: 'Gerar cards do texto' })
  206 |     // Ações de IA bloqueadas com o motivo (o aviso), nunca o 403 cru
  207 |     await expect(transform).toBeDisabled()
  208 |     await expect(transform).toHaveAttribute('aria-describedby', 'verify-email-notice')
  209 | 
  210 |     // Reenviar: fica em espera (throttle) depois de enviar
  211 |     await notice.getByRole('button', { name: 'Reenviar e-mail' }).click()
  212 |     await expect(notice.getByRole('button', { name: /^Reenviar em \d+s$/ })).toBeDisabled()
  213 |     expect(resends).toEqual(['POST'])
  214 | 
  215 |     // "Já confirmei" antes de confirmar: continua bloqueado
  216 |     await notice.getByRole('button', { name: 'Já confirmei' }).click()
  217 |     await expect(page.getByText('Ainda não recebemos a confirmação. Abra o link do e-mail e tente de novo.')).toBeVisible()
  218 |     await expect(transform).toBeDisabled()
  219 | 
  220 |     // Confirma (no lugar do link do e-mail) e "Já confirmei" relê o /me sem recarregar a página
  221 |     verifyEmail(USERS.onboardingUnverified)
  222 |     await notice.getByRole('button', { name: 'Já confirmei' }).click()
  223 |     await expect(notice).toBeHidden()
  224 |     await expect(transform).toBeEnabled()
  225 | 
  226 |     const accepted = page.waitForResponse(r => r.url().endsWith('/api/ai/accept-cards'))
  227 |     await transform.click()
  228 |     const res = await accepted
  229 |     expect(res.status(), 'POST /ai/accept-cards (API real)').toBe(201)
  230 |     expect(res.request().postDataJSON()).toMatchObject({ topic_id: expect.any(String) })
  231 |     expect(calls).toHaveLength(1)
  232 | 
  233 |     // Primeira revisão até o fim do lote
  234 |     await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
  235 |     for (let i = 0; i < 3; i++) {
  236 |       await expect(page.getByRole('button', { name: 'Card: toque ou Espaço para ver a resposta' })).toBeVisible()
  237 |       await page.keyboard.press('Space')
  238 |       await expect(page.getByTestId('review-answer')).toBeVisible()
  239 |       await page.keyboard.press('4')
  240 |     }
  241 |     await expect(page.getByTestId('onboarding-end')).toBeVisible({ timeout: 10_000 })
  242 |     await expect(page.getByTestId('onboarding-tomorrow')).toContainText('Amanhã')
  243 |     expect(Number(sql(`select count(*) from reviews r join users u on u.id=r.user_id where u.email='${USERS.onboardingUnverified.email}'`))).toBe(3)
  244 |   })
  245 | })
  246 | 
```