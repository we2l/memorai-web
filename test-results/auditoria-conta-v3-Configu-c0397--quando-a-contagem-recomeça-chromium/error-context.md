# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auditoria/conta-v3.spec.ts >> Configurações (Free) >> uso de IA: rótulos exatos do catálogo e quando a contagem recomeça
- Location: e2e/auditoria/conta-v3.spec.ts:94:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByTestId('usage-row')
Expected: 7
Received: 8
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByTestId('usage-row')
    14 × locator resolved to 8 elements
       - unexpected value "8"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - link "Baigi, ir para Hoje" [ref=e6] [cursor=pointer]:
          - /url: /hoje
          - generic [ref=e7]:
            - img "Baigi" [ref=e9]
            - generic [ref=e10]: BAIGI.
        - navigation "Navegação principal" [ref=e11]:
          - list [ref=e12]:
            - listitem [ref=e13]:
              - link "Hoje" [ref=e14] [cursor=pointer]:
                - /url: /hoje
            - listitem [ref=e15]:
              - link "Cadernos" [ref=e16] [cursor=pointer]:
                - /url: /cadernos
            - listitem [ref=e17]:
              - link "Praticar" [ref=e18] [cursor=pointer]:
                - /url: /praticar
            - listitem [ref=e19]:
              - link "Progresso" [ref=e20] [cursor=pointer]:
                - /url: /progresso
        - generic [ref=e21]:
          - button "Adicionar" [ref=e22] [cursor=pointer]
          - button "Buscar · Ctrl K" [ref=e24] [cursor=pointer]
          - button "Menu da conta" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: CN
    - main [ref=e32]:
      - generic [ref=e33]:
        - heading "Configurações" [level=1] [ref=e34]
        - generic [ref=e35]:
          - navigation "Configurações" [ref=e36]:
            - list [ref=e37]:
              - listitem [ref=e38]:
                - link "Conta e segurança" [ref=e39] [cursor=pointer]:
                  - /url: "#conta"
              - listitem [ref=e42]:
                - link "Plano e uso de IA" [ref=e43] [cursor=pointer]:
                  - /url: "#plano"
              - listitem [ref=e46]:
                - link "Estudo e lembretes" [ref=e47] [cursor=pointer]:
                  - /url: "#estudo"
              - listitem [ref=e50]:
                - link "Aparência" [ref=e51] [cursor=pointer]:
                  - /url: "#aparencia"
              - listitem [ref=e54]:
                - link "Seus dados" [ref=e55] [cursor=pointer]:
                  - /url: "#dados"
          - generic [ref=e58]:
            - region [ref=e59]:
              - heading "Conta e segurança" [level=2] [ref=e62]
              - generic [ref=e63]:
                - generic [ref=e64]:
                  - generic [ref=e65]:
                    - generic [ref=e66]: Nome
                    - textbox "Nome" [ref=e68]: Conta Nova
                  - status [ref=e69]
                - generic [ref=e70]:
                  - paragraph [ref=e71]: E-mail
                  - paragraph [ref=e72]:
                    - text: e2e-conta@audit.test
                    - generic [ref=e73]: Confirmado
                - generic [ref=e74]:
                  - heading "Trocar senha" [level=3] [ref=e75]
                  - generic [ref=e76]:
                    - generic [ref=e77]:
                      - generic [ref=e78]: Senha atual
                      - textbox "Senha atual" [ref=e80]
                    - generic [ref=e81]:
                      - generic [ref=e82]: Nova senha
                      - textbox "Nova senha" [ref=e84]
                      - paragraph [ref=e85]: Pelo menos 8 caracteres
                    - generic [ref=e86]:
                      - generic [ref=e87]: Confirmar nova senha
                      - textbox "Confirmar nova senha" [ref=e89]
                    - generic [ref=e90]:
                      - checkbox "Mostrar senhas" [ref=e92] [cursor=pointer]
                      - generic [ref=e93]: Mostrar senhas
                    - button "Trocar senha" [disabled] [ref=e96]
            - region [ref=e97]:
              - heading "Plano e uso de IA" [level=2] [ref=e100]
              - generic [ref=e101]:
                - generic [ref=e102]:
                  - generic [ref=e103]:
                    - link "Grátis Ver planos" [ref=e104] [cursor=pointer]:
                      - /url: /planos
                      - generic [ref=e105]: Grátis
                      - generic [ref=e106]: Ver planos
                    - generic [ref=e107]: Sem cobrança, com uma prévia grátis da IA.
                  - link "Conhecer o Intensivo" [ref=e109] [cursor=pointer]:
                    - /url: /planos
                - generic [ref=e110]:
                  - heading "Prévia grátis da IA, uma vez por conta" [level=3] [ref=e112]
                  - list [ref=e113]:
                    - listitem [ref=e114]:
                      - generic [ref=e115]: Gerações de cards com IA
                      - 'progressbar "Gerações de cards com IA: 0 de 10 na prévia" [ref=e117]'
                      - generic [ref=e118]: 0 de 10
                    - listitem [ref=e119]:
                      - generic [ref=e120]: Perguntas ao tira-dúvidas
                      - 'progressbar "Perguntas ao tira-dúvidas: 0 de 10 na prévia" [ref=e122]'
                      - generic [ref=e123]: 0 de 10
                    - listitem [ref=e124]:
                      - generic [ref=e125]: PDFs transformados em nota
                      - 'progressbar "PDFs transformados em nota: 0 de 1 na prévia" [ref=e127]'
                      - generic [ref=e128]: 0 de 1
                    - listitem [ref=e129]:
                      - generic [ref=e130]: Simulados com IA
                      - 'progressbar "Simulados com IA: 0 de 1 na prévia" [ref=e132]'
                      - generic [ref=e133]: 0 de 1
                    - listitem [ref=e134]:
                      - generic [ref=e135]: Melhorias de nota com IA
                      - 'progressbar "Melhorias de nota com IA: 0 de 1 na prévia" [ref=e137]'
                      - generic [ref=e138]: 0 de 1
                    - listitem [ref=e139]:
                      - generic [ref=e140]: Podcasts
                      - 'progressbar "Podcasts: 0 de 1 na prévia" [ref=e142]'
                      - generic [ref=e143]: 0 de 1
                    - listitem [ref=e144]:
                      - generic [ref=e145]: Mapas mentais com IA
                      - 'progressbar "Mapas mentais com IA: 0 de 1 na prévia" [ref=e147]'
                      - generic [ref=e148]: 0 de 1
                    - listitem [ref=e149]:
                      - generic [ref=e150]: Páginas de PDF lidas pela IA
                      - 'progressbar "Páginas de PDF lidas pela IA: 0 de 50 na prévia" [ref=e152]'
                      - generic [ref=e153]: 0 de 50
            - region [ref=e154]:
              - heading "Estudo e lembretes" [level=2] [ref=e157]
              - generic [ref=e158]:
                - group "Meta diária" [ref=e160]:
                  - paragraph [ref=e162]: Um lote = 20 cards. O Hoje e o fim de cada lote mostram quanto falta.
                  - generic [ref=e163]:
                    - generic [ref=e164] [cursor=pointer]:
                      - radio "1 lote" [ref=e165]
                      - generic [ref=e166]:
                        - generic [ref=e167]: 1 lote
                        - generic [ref=e168]: ~5 min
                    - generic [ref=e169] [cursor=pointer]:
                      - radio "2 lotes" [checked] [ref=e170]
                      - generic [ref=e171]:
                        - generic [ref=e172]: 2 lotes
                        - generic [ref=e173]: ~10 min
                    - generic [ref=e174] [cursor=pointer]:
                      - radio "3 lotes" [ref=e175]
                      - generic [ref=e176]:
                        - generic [ref=e177]: 3 lotes
                        - generic [ref=e178]: ~15 min · padrão
                    - generic [ref=e179] [cursor=pointer]:
                      - radio "4 lotes" [ref=e180]
                      - generic [ref=e181]:
                        - generic [ref=e182]: 4 lotes
                        - generic [ref=e183]: ~20 min
                    - generic [ref=e184] [cursor=pointer]:
                      - radio "5 lotes" [ref=e185]
                      - generic [ref=e186]:
                        - generic [ref=e187]: 5 lotes
                        - generic [ref=e188]: ~25 min
                    - generic [ref=e189] [cursor=pointer]:
                      - radio "6 lotes" [ref=e190]
                      - generic [ref=e191]:
                        - generic [ref=e192]: 6 lotes
                        - generic [ref=e193]: ~30 min
                - generic [ref=e194]:
                  - heading "Lembrete diário" [level=3] [ref=e195]
                  - generic [ref=e197]:
                    - generic [ref=e198]:
                      - generic [ref=e199]:
                        - generic [ref=e200] [cursor=pointer]: E-mails de estudo
                        - generic [ref=e201]: Um e-mail por dia, só quando houver cards para revisar e você ainda não tiver estudado. Horário de Brasília.
                      - switch "E-mails de estudo" [checked] [ref=e202] [cursor=pointer]
                    - generic [ref=e204]:
                      - generic [ref=e205]: Horário
                      - combobox "Horário" [ref=e207] [cursor=pointer]:
                        - option "06:00"
                        - option "07:00"
                        - option "08:00"
                        - option "09:00"
                        - option "10:00"
                        - option "11:00"
                        - option "12:00"
                        - option "13:00"
                        - option "14:00"
                        - option "15:00"
                        - option "16:00"
                        - option "17:00"
                        - option "18:00"
                        - option "19:00" [selected]
                        - option "20:00"
                        - option "21:00"
                        - option "22:00"
                - generic [ref=e208]:
                  - generic [ref=e210]:
                    - generic [ref=e211]: Modo de estudo padrão
                    - combobox "Modo de estudo padrão" [ref=e213] [cursor=pointer]:
                      - option "Concurso ou OAB"
                      - option "Faculdade"
                      - option "Idiomas"
                      - option "Técnico"
                      - option "Profissional"
                      - option "Outro" [selected]
                  - generic [ref=e215]:
                    - generic [ref=e216]: Cards novos por dia
                    - combobox "Cards novos por dia" [ref=e218] [cursor=pointer]:
                      - option "20 (padrão)"
                      - option "5"
                      - option "10"
                      - option "30"
                      - option "50"
                      - option "100" [selected]
                  - generic [ref=e220]:
                    - generic [ref=e221]: Revisões por dia
                    - combobox "Revisões por dia" [ref=e223] [cursor=pointer]:
                      - option "Sem limite" [selected]
                      - option "30"
                      - option "50"
                      - option "100"
                      - option "200"
                      - option "500"
                  - status [ref=e224]
                - generic [ref=e225]:
                  - group "Quanto você quer lembrar" [ref=e226]:
                    - paragraph [ref=e228]: Mais revisões por dia ↔ menos revisões. Vale para todos os seus cadernos.
                    - generic [ref=e229]:
                      - generic [ref=e230] [cursor=pointer]:
                        - radio "Menos revisões" [ref=e231]
                        - generic [ref=e232]:
                          - generic [ref=e233]: Menos revisões
                          - generic [ref=e234]: Lembrar 85% · menos cards por dia
                      - generic [ref=e235] [cursor=pointer]:
                        - radio "Equilibrado" [checked] [ref=e236]
                        - generic [ref=e237]:
                          - generic [ref=e238]: Equilibrado
                          - generic [ref=e239]: Lembrar 90% · recomendado
                      - generic [ref=e240] [cursor=pointer]:
                        - radio "Mais revisões" [ref=e241]
                        - generic [ref=e242]:
                          - generic [ref=e243]: Mais revisões
                          - generic [ref=e244]: Lembrar 95% · mais cards por dia
                  - group "Diário de erros" [ref=e245]:
                    - paragraph [ref=e247]: Quando você marca "De novo", podemos perguntar o motivo.
                    - generic [ref=e248]:
                      - generic [ref=e249] [cursor=pointer]:
                        - radio "Sempre" [ref=e250]
                        - generic [ref=e251]:
                          - generic [ref=e252]: Sempre
                          - generic [ref=e253]: A cada "De novo"
                      - generic [ref=e254] [cursor=pointer]:
                        - radio "Às vezes" [checked] [ref=e255]
                        - generic [ref=e256]:
                          - generic [ref=e257]: Às vezes
                          - generic [ref=e258]: No 1º erro e a cada 3 · recomendado
                      - generic [ref=e259] [cursor=pointer]:
                        - radio "Nunca" [ref=e260]
                        - generic [ref=e261]:
                          - generic [ref=e262]: Nunca
                          - generic [ref=e263]: Não perguntar
                - generic [ref=e264]:
                  - generic [ref=e265]:
                    - generic [ref=e266]:
                      - generic [ref=e267]: Episódio da manhã
                      - generic [ref=e268]: "No Intensivo: um episódio curto dos seus erros de ontem, pronto às 7h."
                    - switch "Episódio da manhã" [disabled] [ref=e269]
                  - link "No Intensivo" [ref=e271] [cursor=pointer]:
                    - /url: /planos
            - region [ref=e272]:
              - heading "Aparência" [level=2] [ref=e275]
              - group "Tema" [ref=e276]:
                - generic [ref=e278]:
                  - generic [ref=e279] [cursor=pointer]:
                    - radio "Sistema" [checked] [ref=e280]
                    - generic [ref=e281]:
                      - generic [ref=e282]: Sistema
                      - generic [ref=e283]: Segue o aparelho
                  - generic [ref=e284] [cursor=pointer]:
                    - radio "Claro" [ref=e285]
                    - generic [ref=e286]: Claro
                  - generic [ref=e288] [cursor=pointer]:
                    - radio "Escuro" [ref=e289]
                    - generic [ref=e290]: Escuro
            - region [ref=e292]:
              - heading "Seus dados" [level=2] [ref=e295]
              - generic [ref=e296]:
                - generic [ref=e297]:
                  - paragraph [ref=e298]: Um arquivo .zip com seu perfil, cadernos e notas, cards, revisões, provas, simulados e assinatura.
                  - button "Exportar meus dados" [ref=e299] [cursor=pointer]
                - generic [ref=e301]:
                  - generic [ref=e302]:
                    - generic [ref=e303] [cursor=pointer]: Estatísticas de uso anônimas
                    - generic [ref=e304]: Eventos de uso sem seu nome ou e-mail (PostHog), para melhorar o Baigi. Desligar interrompe a coleta na hora.
                  - switch "Estatísticas de uso anônimas" [ref=e305] [cursor=pointer]
                - paragraph [ref=e307]:
                  - text: Saiba como tratamos seus dados na
                  - link "Política de Privacidade" [ref=e308] [cursor=pointer]:
                    - /url: /privacidade
                  - text: e nos
                  - link "Termos de Uso" [ref=e309] [cursor=pointer]:
                    - /url: /termos
                  - text: .
                - generic [ref=e310]:
                  - heading "Excluir conta" [level=3] [ref=e311]
                  - paragraph [ref=e312]: Apaga todos os seus dados de forma permanente.
                  - button "Excluir conta" [ref=e313] [cursor=pointer]
  - generic:
    - status
    - alert
```

# Test source

```ts
  1   | import AxeBuilder from '@axe-core/playwright'
  2   | import { test, expect, gotoApp, apiCall, sql, USERS, API, WEB, catalogProName } from './support/fixtures'
  3   | import type { Page } from '@playwright/test'
  4   | 
  5   | /**
  6   |  * Conta e auth v3 (prd-4g-conta-onboarding-v3 §9): as seções são os itens do menu da conta, a meta do dia muda o
  7   |  * Hoje, âncoras antigas, rótulos do catálogo, login/cadastro/senha no v4, 404 em português, axe nos dois temas.
  8   |  */
  9   | async function axe(page: Page, label: string) {
  10  |   const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  11  |   const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))
  12  |   expect(serious.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), `axe ${label}`).toEqual([])
  13  | }
  14  | 
  15  | /** Cada combinação de tema e largura do PRD (claro e escuro, 390 e 1440 px). */
  16  | async function axeEverywhere(page: Page, url: string, ready: () => Promise<void>) {
  17  |   for (const theme of ['light', 'dark'] as const) {
  18  |     for (const width of [390, 1440]) {
  19  |       await page.setViewportSize({ width, height: 900 })
  20  |       await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* intencional: sem storage */ } }, theme)
  21  |       await page.goto(url)
  22  |       await page.waitForLoadState('networkidle')
  23  |       await ready()
  24  |       await axe(page, `${url} ${theme} ${width}`)
  25  |     }
  26  |   }
  27  | }
  28  | 
  29  | const SECTIONS = ['Conta e segurança', 'Plano e uso de IA', 'Estudo e lembretes', 'Aparência', 'Seus dados']
  30  | 
  31  | test.describe('Configurações (Free)', () => {
  32  |   test.use({ auditUser: 'conta' })
  33  | 
  34  |   test('5 seções com os nomes do menu; cada item do menu rola até a sua', async ({ page }) => {
  35  |     await page.setViewportSize({ width: 1440, height: 900 })
  36  |     await gotoApp(page, '/configuracoes')
  37  |     await expect(page.locator('main h1, h1')).toHaveCount(1)
  38  |     await expect(page.getByRole('heading', { level: 2 })).toHaveText(SECTIONS)
  39  |     const nav = page.getByRole('navigation', { name: 'Configurações' })
  40  |     await expect(nav.getByRole('link')).toHaveText(SECTIONS)
  41  | 
  42  |     for (const [item, id] of [['Conta e segurança', 'conta'], ['Estudo e lembretes', 'estudo'], ['Uso de IA no mês', 'plano'], ['Exportar meus dados', 'dados']] as const) {
  43  |       await page.getByRole('button', { name: 'Menu da conta' }).first().click()
  44  |       await page.getByRole('menuitem', { name: item }).click()
  45  |       await expect(page).toHaveURL(new RegExp(`/configuracoes#${id}$`))
  46  |       await expect(page.locator(`#${id}`)).toBeInViewport()
  47  |     }
  48  | 
  49  |     // Item ativo acompanha a rolagem
  50  |     await page.locator('#aparencia').scrollIntoViewIfNeeded()
  51  |     await page.evaluate(() => document.getElementById('aparencia')!.scrollIntoView())
  52  |     await expect(nav.getByRole('link', { name: 'Aparência' })).toHaveAttribute('aria-current', 'page')
  53  |   })
  54  | 
  55  |   test('primário só o "Conhecer o Pro"; nome salva sozinho com "Salvo"', async ({ page }) => {
  56  |     await gotoApp(page, '/configuracoes')
  57  |     await expect(page.locator('main .bg-action.text-on-action, .bg-action.text-on-action').filter({ visible: true })).toHaveCount(1)
  58  |     await expect(page.getByRole('link', { name: `Conhecer o ${await catalogProName()}` })).toHaveAttribute('href', '/planos')
  59  |     await page.locator('#profile-name').fill('Conta Nova')
  60  |     await page.locator('#profile-name').blur()
  61  |     await expect(page.getByTestId('name-saved')).toHaveText('Salvo')
  62  |     expect(sql(`select name from users where email='${USERS.conta.email}'`)).toBe('Conta Nova')
  63  |   })
  64  | 
  65  |   test('a meta diária muda o Hoje e o /stats', async ({ page }) => {
  66  |     // Hoje com cards para que a meta tenha o que mostrar: 45 cards dão mais de 2 lotes, sem o teto de 20 novos
  67  |     await apiCall(page, 'PUT', '/settings', { daily_new_cards_limit: 100 })
  68  |     const topic = (await apiCall(page, 'POST', '/topics', { name: 'Meta' })).data.id
  69  |     for (let i = 0; i < 45; i++) await apiCall(page, 'POST', '/flashcards', { topic_id: topic, front: `F${i}`, back: `V${i}` })
  70  | 
  71  |     await gotoApp(page, '/configuracoes#estudo')
  72  |     const goal = page.getByTestId('daily-goal')
  73  |     await expect(goal.getByRole('radio')).toHaveCount(6)
  74  |     await expect(goal.getByRole('radio', { name: '3 lotes' })).toBeChecked()
  75  |     const saved = page.waitForResponse(r => r.url().endsWith('/api/settings') && r.request().method() === 'PUT')
  76  |     await goal.getByRole('radio', { name: '2 lotes' }).check()
  77  |     expect((await saved).request().postDataJSON()).toEqual({ daily_goal_batches: 2 })
  78  |     await expect(page.getByText('Meta salva')).toBeVisible()
  79  |     expect(sql(`select daily_goal_batches from users where email='${USERS.conta.email}'`)).toBe('2')
  80  |     expect((await apiCall(page, 'GET', '/stats')).data.goal.target_batches).toBe(2)
  81  | 
  82  |     await gotoApp(page, '/hoje')
  83  |     await expect(page.getByText(/de 2 lotes/).first()).toBeVisible()
  84  |   })
  85  | 
  86  |   test('âncoras antigas vão para a seção nova', async ({ page }) => {
  87  |     await gotoApp(page, '/configuracoes#lembretes')
  88  |     await expect(page).toHaveURL(/\/configuracoes#estudo$/)
  89  |     await expect(page.locator('#estudo')).toBeInViewport()
  90  |     await gotoApp(page, '/configuracoes#uso')
  91  |     await expect(page).toHaveURL(/\/configuracoes#plano$/)
  92  |   })
  93  | 
  94  |   test('uso de IA: rótulos exatos do catálogo e quando a contagem recomeça', async ({ page }) => {
  95  |     const plans = (await (await page.context().request.get(`${API}/plans`, { headers: { Accept: 'application/json', Origin: WEB } })).json()).data
  96  |     const expected = Object.values(plans.features as Record<string, { label: string }>).map(f => f.label.charAt(0).toUpperCase() + f.label.slice(1))
  97  |     await gotoApp(page, '/configuracoes#plano')
  98  |     const rows = page.getByTestId('usage-row')
> 99  |     await expect(rows).toHaveCount(expected.length)
      |                        ^ Error: expect(locator).toHaveCount(expected) failed
  100 |     for (let i = 0; i < expected.length; i++) await expect(rows.nth(i)).toContainText(expected[i]!)
  101 |     await expect(page.getByText('Revisão em áudio')).toHaveCount(0)
  102 |     await expect(page.getByTestId('usage-renews')).toHaveText(/^a contagem recomeça em 01\/\d\d$/)
  103 |   })
  104 | 
  105 |   test('axe nas configurações: claro e escuro, 390 e 1440', async ({ page }) => {
  106 |     test.setTimeout(120_000)
  107 |     await axeEverywhere(page, '/configuracoes', async () => { await expect(page.getByTestId('daily-goal')).toBeVisible() })
  108 |   })
  109 | })
  110 | 
  111 | test.describe('Configurações (Pro)', () => {
  112 |   test.use({ auditUser: 'contaPro' })
  113 | 
  114 |   test('nenhum primário para Pro', async ({ page }) => {
  115 |     await gotoApp(page, '/configuracoes')
  116 |     await expect(page.getByTestId('daily-goal')).toBeVisible()
  117 |     await expect(page.locator('.bg-action.text-on-action').filter({ visible: true })).toHaveCount(0)
  118 |   })
  119 | })
  120 | 
  121 | test.describe('Auth', () => {
  122 |   test('/entrar: h1, 1 primário, mostrar senha com aria-pressed e o foco no campo', async ({ page }) => {
  123 |     await page.goto('/entrar')
  124 |     await page.waitForLoadState('networkidle')
  125 |     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar no Baigi')
  126 |     await expect(page.locator('.bg-action.text-on-action').filter({ visible: true })).toHaveCount(1)
  127 |     await expect(page.getByTestId('google-button')).toContainText('Continuar com Google')
  128 |     const input = page.locator('#password')
  129 |     await input.fill('segredo-123')
  130 |     await input.focus()
  131 |     const toggle = page.getByTestId('password-toggle')
  132 |     await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  133 |     await toggle.click()
  134 |     await expect(input).toHaveAttribute('type', 'text')
  135 |     await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  136 |     await expect(input).toBeFocused()
  137 |   })
  138 | 
  139 |   test('/entrar: throttle com o tempo do Retry-After, credenciais sem dizer qual, link expirado', async ({ page }) => {
  140 |     await page.route('**/api/login', r => r.fulfill({ status: 429, headers: { 'Retry-After': '42', 'Access-Control-Expose-Headers': 'Retry-After', 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'Too Many Attempts.' } }))
  141 |     await page.goto('/entrar?verificacao=expirada')
  142 |     await page.waitForLoadState('networkidle')
  143 |     await expect(page.getByTestId('entrar-notice')).toHaveText('O link de confirmação expirou. Entre para receber outro.')
  144 |     await page.locator('#email').fill('alguem@audit.test')
  145 |     await page.locator('#password').fill('qualquer-coisa')
  146 |     await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  147 |     await expect(page.getByTestId('entrar-error')).toHaveText('Muitas tentativas. Tente de novo em 42 segundos.')
  148 | 
  149 |     await page.unroute('**/api/login')
  150 |     await page.route('**/api/login', r => r.fulfill({ status: 422, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'x', errors: { email: ['As credenciais informadas estão incorretas.'] } } }))
  151 |     await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  152 |     await expect(page.getByTestId('entrar-error')).toHaveText('E-mail ou senha incorretos.')
  153 |   })
  154 | 
  155 |   test('/criar-conta: sem confirmar senha, dica em texto, aceite dos Termos e throttle', async ({ page }) => {
  156 |     let body: Record<string, unknown> = {}
  157 |     await page.route('**/api/register', (r) => {
  158 |       body = r.request().postDataJSON()
  159 |       return r.fulfill({ status: 429, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'x' } })
  160 |     })
  161 |     await page.goto('/criar-conta')
  162 |     await page.waitForLoadState('networkidle')
  163 |     await expect(page.locator('#password_confirmation')).toHaveCount(0)
  164 |     await page.locator('#name').fill('Nome')
  165 |     await page.locator('#email').fill('novo@audit.test')
  166 |     await page.locator('#password').fill('abc')
  167 |     await expect(page.getByText('Faltam 5 caracteres.')).toBeVisible()
  168 |     await page.locator('#password').fill('abcdefgh1234')
  169 |     await expect(page.getByText('Senha forte.')).toBeVisible()
  170 |     await page.getByRole('button', { name: 'Criar conta' }).click()
  171 |     await expect(page.locator('#accept-terms-error')).toBeVisible()
  172 |     await page.locator('#accept_terms').check()
  173 |     await page.getByRole('button', { name: 'Criar conta' }).click()
  174 |     await expect(page.getByTestId('signup-error')).toHaveText('Muitas contas criadas daqui. Tente de novo mais tarde.')
  175 |     expect(body).not.toHaveProperty('password_confirmation')
  176 |   })
  177 | 
  178 |   test('/esqueci-senha não revela a conta; /redefinir-senha com link ruim oferece outro', async ({ page }) => {
  179 |     await page.route('**/api/forgot-password', r => r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'ok' } }))
  180 |     await page.goto('/esqueci-senha')
  181 |     await page.waitForLoadState('networkidle')
  182 |     await page.locator('#email').fill('alguem@audit.test')
  183 |     await page.getByRole('button', { name: 'Enviar link' }).click()
  184 |     await expect(page.getByTestId('forgot-sent')).toContainText('Se houver uma conta com alguem@audit.test, enviamos um link (vale por 60 min).')
  185 | 
  186 |     await page.goto('/redefinir-senha')
  187 |     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Este link expirou')
  188 |     await expect(page.getByTestId('reset-ask-again')).toHaveAttribute('href', '/esqueci-senha')
  189 | 
  190 |     await page.route('**/api/reset-password', r => r.fulfill({ status: 422, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'x', errors: { email: ['token'] } } }))
  191 |     await page.goto('/redefinir-senha?token=abc&email=alguem%40audit.test')
  192 |     await page.waitForLoadState('networkidle')
  193 |     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Criar nova senha')
  194 |     await page.locator('#password').fill('NovaSenha-123')
  195 |     await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  196 |     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Este link expirou')
  197 | 
  198 |     // Link bom: volta para /entrar com o aviso (navegação no cliente, a query já vem no setup)
  199 |     await page.unroute('**/api/reset-password')
```