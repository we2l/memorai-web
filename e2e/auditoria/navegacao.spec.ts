import { test, expect, gotoApp, apiCall, uid } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Navegação v3 (prd-navegacao-v3, tasks 8.2): TopNav com 4 lugares, menu da conta, "+ Adicionar", busca
 * global e mini-player na casca.
 * - Todo destino antigo da sidebar e do "Mais" tem caminho no mapa novo (Module Design §4.1).
 * - O item ativo segue a seção da rota (/revisar, /simulados e /podcasts → Praticar; /provas → Progresso).
 * - Ctrl+K acha um caderno de qualquer tela; "+ Adicionar" grava no caderno aberto; o áudio continua ao navegar.
 * Usuário próprio (e2e-nav@audit.test). Nenhuma IA: o podcast é um mock com um WAV silencioso.
 */
test.use({ auditUser: 'nav', viewport: { width: 1280, height: 800 } })

const top = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' })
const banner = (page: Page) => page.getByRole('banner')

async function openAccount(page: Page) {
  await banner(page).getByRole('button', { name: 'Menu da conta' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
}

async function place(page: Page, name: 'Hoje' | 'Cadernos' | 'Praticar' | 'Progresso') {
  await top(page).getByRole('link', { name }).click()
}

/** PCM 8 bit mono, silent: plays in headless Chromium (no proprietary codec). */
function silentWav(seconds = 30, rate = 8000) {
  const n = seconds * rate
  const buf = Buffer.alloc(44 + n)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate, 28)
  buf.writeUInt16LE(1, 32)
  buf.writeUInt16LE(8, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n, 40)
  buf.fill(128, 44)
  return buf
}

test.describe('Navegação v3 — mapa de destinos', () => {
  test('todo destino antigo da sidebar e do "Mais" é alcançável pelo mapa novo', async ({ page }) => {
    test.setTimeout(120_000)
    const from = async () => gotoApp(page, '/hoje')
    const steps: [string, () => Promise<void>, RegExp][] = [
      ['Sidebar "Hoje" → TopNav Hoje', async () => { await gotoApp(page, '/progresso'); await place(page, 'Hoje') }, /\/hoje$/],
      ['Sidebar "Cadernos" → TopNav Cadernos', async () => { await from(); await place(page, 'Cadernos') }, /\/cadernos/],
      ['Sidebar/aba "Revisão" → Praticar › Revisar', async () => { await from(); await place(page, 'Praticar'); await page.getByRole('link', { name: /5 minutos/ }).click() }, /\/revisar\?mode=blitz/],
      ['Sidebar "Progresso" → TopNav Progresso', async () => { await from(); await place(page, 'Progresso') }, /\/progresso$/],
      ['Sidebar/"Mais" "Simulados" → Praticar › Questões', async () => { await from(); await place(page, 'Praticar'); await page.getByRole('link', { name: /Questões e simulados/ }).click() }, /\/simulados/],
      ['Sidebar/"Mais" "Provas" → Progresso › Provas', async () => { await from(); await place(page, 'Progresso'); await page.getByTestId('progress-exams').waitFor() }, /\/progresso$/],
      ['Sidebar/"Mais" "Podcasts" → Praticar › Ouvir', async () => { await from(); await place(page, 'Praticar'); await page.getByRole('link', { name: /Todos os episódios/ }).click() }, /\/podcasts/],
      ['Sidebar/"Mais" "Configurações" → conta › Conta e segurança', async () => { await from(); await openAccount(page); await page.getByRole('menuitem', { name: 'Conta e segurança' }).click() }, /\/configuracoes#seguranca/],
      ['Sidebar/"Mais" "Ajuda" → conta › Ajuda e atalhos', async () => { await from(); await openAccount(page); await page.getByRole('menuitem', { name: /Ajuda e atalhos/ }).click() }, /\/ajuda\?tab=atalhos/],
      ['PlanBadge "Meu plano" → conta › plano › Meu plano', async () => {
        await from()
        await openAccount(page)
        await page.getByRole('menuitem', { name: /Plano Pro|Pro ·|Pro mensal/ }).click()
        await page.waitForURL('**/configuracoes**')
        await page.getByRole('main').locator('a[href="/planos"]').first().click()
      }, /\/planos$/],
      ['"Mais" Termos/Privacidade → conta › Exportar meus dados', async () => { await from(); await openAccount(page); await page.getByRole('menuitem', { name: 'Exportar meus dados' }).click() }, /\/configuracoes#dados/],
      ['"Novo › Importar Anki" → + Adicionar › Importar do Anki', async () => {
        await from()
        await banner(page).getByRole('button', { name: 'Adicionar' }).click()
        // With cadernos it is one of the 5 options; with none, the link next to "Criar caderno"
        const sheet = page.getByRole('dialog', { name: 'Adicionar' })
        await sheet.getByRole('button', { name: /Importar do Anki/ }).or(sheet.getByRole('link', { name: 'Importar do Anki' })).click()
      }, /\/importar$/],
    ]
    for (const [label, go, url] of steps) {
      await test.step(label, async () => {
        await go()
        await expect(page).toHaveURL(url)
      })
    }

    await test.step('"Ajuda" abre direto nos atalhos (Alt+N e ? registrados)', async () => {
      await gotoApp(page, '/ajuda?tab=atalhos')
      await expect(page.getByRole('heading', { name: 'Atalhos de teclado' })).toBeVisible()
      await expect(page.getByText('Nota em branco (no caderno aberto ou no último usado)')).toBeVisible()
    })

    await test.step('Termos e Privacidade continuam a um clique em /configuracoes#dados', async () => {
      await gotoApp(page, '/configuracoes#dados')
      await expect(page.locator('#dados a[href="/privacidade"]')).toBeVisible()
      await expect(page.locator('#dados a[href="/termos"]')).toBeVisible()
    })

    await test.step('"Modo escuro" da sidebar → conta › Aparência (Sistema/Claro/Escuro)', async () => {
      await gotoApp(page, '/hoje')
      await openAccount(page)
      await expect(page.getByRole('group', { name: 'Aparência' }).getByRole('menuitemradio')).toHaveText(['Sistema', 'Claro', 'Escuro'])
      await page.getByRole('menuitemradio', { name: 'Escuro' }).click()
      await expect(page.locator('html')).toHaveClass(/dark/)
      await openAccount(page)
      await expect(page.getByRole('menuitemradio', { name: 'Escuro' })).toHaveAttribute('aria-checked', 'true')
      await page.getByRole('menuitemradio', { name: 'Claro' }).click()
      await expect(page.locator('html')).not.toHaveClass(/dark/)
      await openAccount(page)
      await page.getByRole('menuitemradio', { name: 'Sistema' }).click()
    })

    await test.step('"Sair" está no menu da conta (o logout em si: sessao.spec.ts)', async () => {
      await openAccount(page)
      await expect(page.getByRole('menuitem', { name: 'Sair' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('menu')).toBeHidden()
      await expect(banner(page).getByRole('button', { name: 'Menu da conta' })).toBeFocused()
    })
  })

  test('sem menu lateral, sem "Mais" e sem botões flutuantes; o grafo global saiu (?view=graph → /cadernos)', async ({ page }) => {
    await gotoApp(page, '/cadernos?view=graph')
    await expect(page).toHaveURL(/\/cadernos(?!.*view=graph)/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Mais$/ })).toHaveCount(0)
    await expect(page.locator('button[aria-label^="Anotar rapidamente"], button[aria-label="Tirar dúvida"], button[aria-label="Perguntar sobre o caderno"]')).toHaveCount(0)
    await expect(page.getByText('Grafo de cadernos')).toHaveCount(0)
  })
})

test.describe('Navegação v3 — item ativo', () => {
  const ACTIVE: [string, string | null][] = [
    ['/hoje', 'Hoje'],
    ['/cadernos', 'Cadernos'],
    ['/importar', 'Cadernos'],
    ['/praticar', 'Praticar'],
    ['/simulados', 'Praticar'],
    ['/podcasts', 'Praticar'],
    ['/progresso', 'Progresso'],
    ['/provas', 'Progresso'],
    ['/configuracoes', null],
    ['/ajuda', null],
  ]

  test('a seção da rota acende um lugar só (TopNav)', async ({ page }) => {
    for (const [path, name] of ACTIVE) {
      await gotoApp(page, path)
      const current = top(page).locator('a[aria-current="page"]')
      if (name) await expect(current, path).toHaveText(name)
      else await expect(current, path).toHaveCount(0)
    }
  })

  test('/revisar é rota de foco: a casca some (sem TopNav nem mini-player sobre o CTA)', async ({ page }) => {
    await gotoApp(page, '/revisar')
    await expect(top(page)).toBeHidden()
    await expect(page.getByRole('region', { name: 'Tocando agora' })).toHaveCount(0)
  })

  test('celular: 4 abas e o ativo (simulados → Praticar, provas → Progresso)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const bottom = page.locator('nav[aria-label="Navegação mobile"]')
    for (const [path, name] of [['/simulados', 'Praticar'], ['/provas', 'Progresso'], ['/hoje', 'Hoje']] as const) {
      await gotoApp(page, path)
      await expect(bottom.getByRole('link')).toHaveText(['Hoje', 'Cadernos', 'Praticar', 'Progresso'])
      await expect(bottom.locator('a[aria-current="page"]'), path).toHaveText(name)
    }
    await expect(top(page)).toBeHidden()
  })
})

test.describe('Navegação v3 — busca e "+ Adicionar"', () => {
  test('Ctrl+K acha um caderno de qualquer tela (a árvore carrega ao abrir)', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const name = `Busca ${uid()}`
    const topic = (await apiCall(page, 'POST', '/topics', { name })).data
    for (const path of ['/progresso', '/praticar', '/configuracoes']) {
      await test.step(path, async () => {
        await gotoApp(page, path)
        await page.keyboard.press('Control+k')
        const dialog = page.getByRole('dialog', { name: 'Buscar' })
        await expect(dialog).toBeVisible()
        await dialog.getByRole('combobox').fill(name.slice(0, 12))
        await expect(dialog.getByRole('option', { name: new RegExp(name) })).toBeVisible()
        await dialog.getByRole('combobox').fill(name)
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(new RegExp(`/cadernos/${topic.id}$`))
      })
    }
  })

  test('"Perguntar…" da busca abre o tira-dúvidas com a pergunta pronta, sem chamar a IA', async ({ page, aiGuard }) => {
    await gotoApp(page, '/hoje')
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox').fill('o que é controle difuso')
    await page.getByRole('option', { name: /Perguntar: “o que é controle difuso”/ }).click()
    const chat = page.getByRole('dialog', { name: 'Tira-dúvidas' })
    await expect(chat).toBeVisible()
    await expect(chat.getByRole('textbox', { name: 'Sua dúvida' })).toHaveValue('o que é controle difuso')
    expect(aiGuard).toEqual([])
  })

  test('"+ Adicionar" grava no caderno aberto (Colar texto e Nota em branco)', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const root = (await apiCall(page, 'POST', '/topics', { name: `Adicionar ${uid()}` })).data
    const other = (await apiCall(page, 'POST', '/topics', { name: `Outro ${uid()}` })).data
    await gotoApp(page, `/cadernos/${root.id}`)

    await banner(page).getByRole('button', { name: 'Adicionar' }).click()
    const sheet = page.getByRole('dialog', { name: 'Adicionar' })
    await expect(sheet.getByLabel('Gravar em')).toHaveValue(root.id)
    await expect(sheet.getByRole('button')).toContainText(['PDF', 'Colar texto', 'Foto', 'Nota em branco', 'Importar do Anki'])
    await sheet.getByRole('button', { name: /Colar texto/ }).click()
    await page.getByRole('dialog', { name: 'Colar texto' }).getByLabel('Texto').fill('Controle difuso\nQualquer juiz declara no caso concreto.')
    const posted = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/api/topics/${root.id}/notes`))
    await page.getByRole('button', { name: 'Salvar nota' }).click()
    expect((await posted).status()).toBe(201)
    const notes = (await apiCall(page, 'GET', `/topics/${root.id}/notes`)).data as { title: string }[]
    expect(notes.map(n => n.title)).toContain('Controle difuso')
    expect(((await apiCall(page, 'GET', `/topics/${other.id}/notes`)).data as unknown[]).length).toBe(0)

    // Alt+N: nota em branco no mesmo caderno, com o editor aberto
    const blank = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/api/topics/${root.id}/notes`))
    // The sheet gave the focus back to "Adicionar" (not a field): the shortcut goes through
    await page.keyboard.press('Alt+n')
    expect((await blank).status()).toBe(201)
    await expect(page.locator('.ProseMirror').first()).toBeVisible()

    // Fora de um caderno: o último usado é o padrão
    await gotoApp(page, '/progresso')
    await banner(page).getByRole('button', { name: 'Adicionar' }).click()
    await expect(page.getByRole('dialog', { name: 'Adicionar' }).getByLabel('Gravar em')).toHaveValue(root.id)
  })
})

test.describe('Navegação v3 — mini-player', () => {
  test('o áudio continua tocando ao passar pelos 4 lugares', async ({ page }) => {
    test.setTimeout(60_000)
    const podcast = {
      id: '00000000-0000-4000-8000-0000000000aa',
      title: 'Seus erros de ontem',
      status: 'ready',
      audio_url: 'http://localhost:3000/e2e-audio/silence.wav',
      duration_seconds: 30,
      topic_id: null,
      topic_name: 'E2E',
      created_at: new Date().toISOString(),
    }
    await page.route('**/e2e-audio/silence.wav', route => route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() }))
    await page.route(url => url.pathname === '/api/podcasts', route => (route.request().method() === 'GET'
      ? route.fulfill({ json: { data: [podcast], meta: { current_page: 1, last_page: 1, total: 1 } } })
      : route.fallback()))

    await gotoApp(page, '/praticar')
    await page.getByRole('button', { name: 'Ouvir agora' }).click()
    const mini = page.getByRole('region', { name: 'Tocando agora' })
    await expect(mini).toContainText('Seus erros de ontem')
    await expect(mini.getByRole('button', { name: 'Pausar' })).toBeVisible()

    const seconds = async () => {
      const m = (await mini.textContent())?.match(/(\d+):(\d{2}) de/)
      return m ? Number(m[1]) * 60 + Number(m[2]) : -1
    }
    await expect.poll(seconds, { timeout: 10_000 }).toBeGreaterThanOrEqual(1)
    let last = await seconds()
    for (const name of ['Hoje', 'Cadernos', 'Progresso', 'Praticar'] as const) {
      await place(page, name)
      await expect(top(page).locator('a[aria-current="page"]')).toHaveText(name)
      await expect(mini).toBeVisible()
      await expect(mini.getByRole('button', { name: 'Pausar' })).toBeVisible()
      await expect.poll(seconds, { timeout: 10_000, message: `o áudio parou em ${name}` }).toBeGreaterThan(last)
      last = await seconds()
    }

    // No desktop flutua no canto inferior direito, fora da TopNav
    const box = (await mini.boundingBox())!
    expect(box.x + box.width).toBeGreaterThan(1280 - 40)
    expect(box.y).toBeGreaterThan(800 / 2)

    await mini.getByRole('button', { name: 'Fechar player' }).click()
    await expect(mini).toBeHidden()
  })
})
