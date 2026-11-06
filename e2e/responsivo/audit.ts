import fs from 'node:fs'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect, gotoApp, apiCall, tinker, uid, USERS, cachedLoginState } from '../auditoria/support/fixtures'
import { ensurePraticarSeed, fakeAudio, seedQuiz } from '../auditoria/support/seed-praticar'
import { ensureMaterialSeed } from '../auditoria/support/seed-material'
import { ensureProgressoSeed } from '../auditoria/support/seed-progresso'
import { inspect, type ResponsiveReport } from './checks'

/**
 * Auditoria de responsividade (prd-responsividade RF-1): cada aparelho de devices.ts × cada tela, com captura
 * e as checagens de checks.ts gravadas em JSON. Fora do testMatch padrão (não roda em `npx playwright test`).
 *
 * Precisa da API local e do build do web; contas @audit.test (provisionadas pelos fixtures) e o seed pesado
 * perf@audit.test (memorai-api/scripts/perf/seed-caderno-pesado.php). Nenhuma chamada de IA (aiGuard dos fixtures).
 *
 *   NUXT_PUBLIC_API_BASE=http://localhost:8037/api npm run build && PORT=3000 node .output/server/index.mjs
 *   RESP_OUT=/caminho/saida npx playwright test -c e2e/responsivo/audit.config.ts [--project=iphone-se]
 *   node e2e/responsivo/summary.mjs /caminho/saida > resumo.md
 *
 * Porta diferente da 3000 (outro build ocupando): RESP_BASE_URL=http://localhost:3020 (ver audit.config.ts).
 */
const OUT = process.env.RESP_OUT || path.join(__dirname, '..', '..', 'responsivo-output')

type Entry = { name: string; report: ResponsiveReport }

function recorder(info: TestInfo) {
  const dir = path.join(OUT, info.project.name)
  fs.mkdirSync(dir, { recursive: true })
  const entries: Entry[] = []
  const file = path.join(dir, `${info.title.replace(/\W+/g, '-')}.json`)
  const save = () => fs.writeFileSync(file, JSON.stringify({ device: info.project.name, entries }, null, 1))
  return {
    /** Captura (tela inteira ou só a viewport) e checagens do estado atual */
    async shot(page: Page, name: string, opts: { full?: boolean } = {}) {
      await page.evaluate(() => document.fonts?.ready).catch(() => {})
      await page.waitForTimeout(350)
      // Dialogs open: the page behind is locked, measuring the end of its scroll means nothing
      const dialogOpen = await page.locator('[role=dialog][aria-modal=true], [role=alertdialog]').filter({ visible: true }).count()
      entries.push({ name, report: await inspect(page, { coverage: dialogOpen === 0 }) })
      save()
      // The whole page by growing the viewport, not fullPage: Chromium's full-page capture drops the device emulation
      // (pointer: coarse) until the next navigation, and the next state of the same page would measure without it
      const vp = page.viewportSize()!
      const tall = opts.full ? await page.evaluate(() => document.documentElement.scrollHeight) : vp.height
      if (tall > vp.height) await page.setViewportSize({ width: vp.width, height: Math.min(tall, 8000) })
      await page.screenshot({ path: path.join(dir, `${name}.png`), animations: 'disabled', caret: 'hide' })
      if (tall > vp.height) await page.setViewportSize(vp)
    },
    save,
  }
}

async function open(page: Page, url: string) {
  await gotoApp(page, url)
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(400)
}

const dialog = (page: Page) => page.locator('[role=dialog][aria-modal=true], [role=alertdialog]').filter({ visible: true }).last()

test.describe.configure({ timeout: 600_000 })

test('publicas', async ({ page }, info) => {
  const rec = recorder(info)
  // A first visit: no consent cookie, the landing shows its thin bar
  await page.context().clearCookies()
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await rec.shot(page, 'landing-topo-cookies')
  await page.getByTestId('consent-reject').click()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4))
  await page.waitForTimeout(600)
  await rec.shot(page, 'landing-meio-barra')
  await rec.shot(page, 'landing-inteira', { full: true })
  for (const m of ['prova', 'esqueci', 'faculdade', 'ingles']) {
    await page.goto(`/?m=${m}`)
    await page.waitForLoadState('networkidle')
    await rec.shot(page, `landing-m-${m}`)
  }
  for (const [name, url] of [['planos', '/planos'], ['entrar', '/entrar'], ['criar-conta', '/criar-conta'], ['esqueci-senha', '/esqueci-senha'], ['termos', '/termos']] as const) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await rec.shot(page, name, { full: true })
  }
})

test.describe('onboarding', () => {
  test.use({ auditUser: 'onboarding' })
  test('comecar', async ({ page }, info) => {
    const rec = recorder(info)
    await open(page, '/comecar')
    await rec.shot(page, 'comecar-1', { full: true })
    await page.getByRole('radio').first().check()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Vamos criar seus primeiros cards' })).toBeVisible()
    await rec.shot(page, 'comecar-2', { full: true })
  })
})

test.describe('praticar', () => {
  test.use({ auditUser: 'praticar' })
  test('app', async ({ page }, info) => {
    const rec = recorder(info)
    await fakeAudio(page)
    await gotoApp(page, '/hoje')
    const seed = await ensurePraticarSeed(page)
    for (const [name, url] of [
      ['hoje', '/hoje'], ['cadernos-lista', '/cadernos'], ['caderno-hub', `/cadernos/${seed.rootId}`], ['biblioteca', `/cadernos/${seed.rootId}/cards`],
      ['praticar', '/praticar'], ['simulados', '/simulados'], ['simulado-resultado', `/simulados/${seed.quizId}/resultado`],
      ['ouvir', '/podcasts'], ['configuracoes', '/configuracoes'], ['lixeira', '/cadernos/lixeira'],
    ] as const) {
      await open(page, url)
      await rec.shot(page, name, { full: true })
      if (name === 'hoje' || name === 'caderno-hub') await rec.shot(page, `${name}-dobra`)
    }

    // ConfigSheet of the simulado
    await open(page, `/simulados?topic_id=${seed.ctrlId}`)
    await expect(dialog(page)).toBeVisible()
    await rec.shot(page, 'simulado-config')
    await page.getByRole('tab', { name: 'Simulado' }).click().catch(() => {})
    await rec.shot(page, 'simulado-config-prova')

    // Answering (Treino): the question and the correction
    const quizId = seedQuiz('praticar', seed.ctrlId, `Bateria responsivo ${uid()}`, [[seed.ctrlId, true], [seed.ctrlId, true], [seed.ctrlId, true]], { status: 'in_progress' })
    await open(page, `/simulados/${quizId}`)
    await rec.shot(page, 'simulado-respondendo')
    await page.getByRole('radio').nth(1).check({ force: true }).catch(async () => { await page.keyboard.press('2') })
    await page.waitForTimeout(200)
    await rec.shot(page, 'simulado-escolhida')
    await page.keyboard.press('Enter')
    await page.getByTestId('quiz-feedback').waitFor({ timeout: 5000 }).catch(() => {})
    await rec.shot(page, 'simulado-correcao', { full: true })

    // GenerateSheet (Ouvir)
    await open(page, '/podcasts')
    await page.getByTestId('podcast-generate').click()
    await expect(dialog(page)).toBeVisible()
    await rec.shot(page, 'generate-sheet')

    // Player: expanded (sheet on the phone, column on the tablet), then the mini-player over the BottomNav
    await open(page, '/podcasts')
    await page.getByTestId(`episode-${seed.dailyId}`).getByTestId('episode-open').click()
    await page.waitForTimeout(600)
    await rec.shot(page, 'player-expandido')
    if (await dialog(page).count()) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    const nav = page.locator('nav[aria-label="Navegação mobile"]')
    if (await nav.isVisible()) await nav.getByRole('link', { name: 'Hoje' }).click()
    else await page.getByRole('link', { name: 'Hoje' }).first().click()
    await page.waitForURL('**/hoje')
    await page.waitForLoadState('networkidle')
    await rec.shot(page, 'mini-player-hoje')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await rec.shot(page, 'mini-player-hoje-fim')
    // AddSheet from the hub (the scope is set)
    await open(page, `/cadernos/${seed.rootId}`)
    await page.getByRole('button', { name: 'Adicionar' }).first().click()
    await expect(dialog(page)).toBeVisible()
    await rec.shot(page, 'add-sheet')

    // ⋯ of the caderno, then Excluir
    await open(page, `/cadernos/${seed.rootId}`)
    const root = (await apiCall(page, 'GET', `/topics/${seed.rootId}/summary`)).data
    await page.getByRole('button', { name: `Mais ações de ${root.topic?.name ?? root.name}` }).first().click()
    await page.waitForTimeout(300)
    await rec.shot(page, 'caderno-menu')
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await rec.shot(page, 'excluir')

    // Search (the phone opens it from the header button) and the chat from "Perguntar…"
    await open(page, '/hoje')
    const searchButton = page.getByRole('button', { name: 'Buscar' }).filter({ visible: true }).first()
    if (await searchButton.count()) await searchButton.click()
    else await page.keyboard.press('Control+k')
    await page.getByRole('combobox').fill('controle')
    await page.waitForTimeout(700)
    await rec.shot(page, 'busca')
    await page.getByRole('combobox').fill('o que é controle difuso')
    await page.getByRole('option', { name: /Perguntar/ }).first().click()
    await expect(page.getByRole('dialog', { name: 'Tira-dúvidas' })).toBeVisible()
    await rec.shot(page, 'chat')
  })
})

test.describe('material', () => {
  test.use({ auditUser: 'material' })
  test('material', async ({ page }, info) => {
    const rec = recorder(info)
    await gotoApp(page, '/hoje')
    const seed = await ensureMaterialSeed(page)
    await open(page, `/cadernos/${seed.subjectId}/material/${seed.pdfNoteId}`)
    await rec.shot(page, 'material-pdf-leitor')
    await rec.shot(page, 'material-pdf-leitor-inteiro', { full: true })
    // Sumário and Cards of the reader bar (sheets below 1024 px)
    for (const label of ['Sumário', 'Cards']) {
      const b = page.getByRole('button', { name: new RegExp(`^${label}`) }).filter({ visible: true }).first()
      if (await b.count()) {
        await b.click()
        await page.waitForTimeout(400)
        await rec.shot(page, `material-${label === 'Sumário' ? 'sumario' : 'cards'}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
    await open(page, `/cadernos/${seed.subjectId}/material/${seed.manualNoteId}`)
    await rec.shot(page, 'material-nota-editor')
    await page.locator('.ProseMirror').first().click()
    await page.waitForTimeout(300)
    await rec.shot(page, 'material-nota-editando')
    // Mover (⋯ of a material row)
    const note = (await apiCall(page, 'GET', `/notes/${seed.manualNoteId}`)).data
    await open(page, `/cadernos/${seed.rootId}`)
    await rec.shot(page, 'caderno-hub-material', { full: true })
    await page.getByRole('button', { name: `Mais ações de ${note.title}` }).first().click()
    await page.getByRole('menuitem', { name: 'Mover para…' }).click()
    await expect(dialog(page)).toBeVisible()
    await rec.shot(page, 'mover')
  })
})

test.describe('progresso', () => {
  test.use({ auditUser: 'progresso' })
  test('progresso', async ({ page }, info) => {
    const rec = recorder(info)
    await gotoApp(page, '/hoje')
    await ensureProgressoSeed(page)
    await open(page, '/progresso')
    await rec.shot(page, 'progresso', { full: true })
    await open(page, '/progresso?nova_prova=1#provas')
    await expect(dialog(page)).toBeVisible()
    await rec.shot(page, 'prova-dialog')
  })
})

test.describe('revisao', () => {
  test.use({ auditUser: 'revisao' })
  test('revisao', async ({ page }, info) => {
    const rec = recorder(info)
    await gotoApp(page, '/hoje')
    const php = (code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS.revisao.email}')->firstOrFail(); ${code}`)
    await apiCall(page, 'PUT', '/settings', { error_diary_mode: 'never', session_time_limit: null })
    const t = (await apiCall(page, 'POST', '/topics', { name: `Revisão responsiva ${uid()}` })).data
    await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.id, cards: Array.from({ length: 22 }, (_, i) => ({ front: `Qual é a capital do estado número ${i + 1} da lista de estados brasileiros?`, back: `Resposta ${i + 1}: uma explicação de duas linhas para ver a quebra no celular pequeno.` })) })
    php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->where('topic_id', '${t.id}')->update(['state' => 'review', 'due' => now()->subDay(), 'last_review' => now()->subDays(4), 'reps' => 2, 'stability' => 4, 'difficulty' => 5, 'scheduled_days' => 3]); echo 'ok';`)
    await open(page, `/revisar?topic_id=${t.id}`)
    const rate = async () => {
      await expect(page.getByTestId('review-show')).toBeVisible()
      await page.keyboard.press('Space')
      await expect(page.getByTestId('review-ratings')).toBeVisible()
      await page.keyboard.press('3')
    }
    for (let i = 0; i < 3; i++) await rate()
    await expect(page.getByTestId('review-show')).toBeVisible()
    await rec.shot(page, 'revisar-pergunta')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('review-ratings')).toBeVisible()
    await rec.shot(page, 'revisar-resposta')
    await page.keyboard.press('3')
    for (let i = 0; i < 16; i++) await rate()
    await expect(page.getByTestId('review-batch-end')).toBeVisible()
    await page.waitForTimeout(900)
    await rec.shot(page, 'revisar-fim-lote')
    await page.getByTestId('batch-next').click()
    for (let i = 0; i < 2; i++) await rate()
    await expect(page.getByTestId('review-session-end')).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(900)
    await rec.shot(page, 'revisar-fim-sessao', { full: true })
  })
})

test.describe('pesado', () => {
  // Seed de volume (scripts/perf/seed-caderno-pesado.php): ~5.700 cards e ~330 notas
  test('pesado', async ({ page, browser }, info) => {
    const exists = await fetch(`${process.env.E2E_API_ORIGIN || 'http://localhost:8037'}/api/plans`).then(() => true).catch(() => false)
    test.skip(!exists, 'API fora do ar')
    const state = await cachedLoginState(browser, 'perf@audit.test', 'password').catch(() => null)
    test.skip(!state, 'sem perf@audit.test (rode o seed pesado)')
    await page.context().addCookies(JSON.parse(fs.readFileSync(state!, 'utf8')).cookies)
    const rec = recorder(info)
    await open(page, '/cadernos')
    await rec.shot(page, 'pesado-cadernos', { full: true })
    const roots = (await apiCall(page, 'GET', '/topics/progress')).data as { id: string; parent_id: string | null; flashcards_count?: number }[]
    const big = roots.filter(r => !r.parent_id).sort((a, b) => (b.flashcards_count ?? 0) - (a.flashcards_count ?? 0))[0]
    if (big) {
      await open(page, `/cadernos/${big.id}`)
      await rec.shot(page, 'pesado-hub')
      await open(page, `/cadernos/${big.id}/cards`)
      await rec.shot(page, 'pesado-biblioteca')
    }
  })
})

test.describe('area segura', () => {
  // iPhone com entalhe: o CDP simula env(safe-area-inset-*) (o Chromium não tem entalhe). RESP_SAFE=0 mostra o
  // "antes" (sem viewport-fit=cover o iOS devolve 0). A faixa vermelha marca a zona da barra de gestos e do entalhe.
  test.use({ auditUser: 'praticar' })
  test('area-segura', async ({ page }, info) => {
    test.skip(!['iphone-13', 'iphone-13-paisagem'].includes(info.project.name), 'só nos iPhones com entalhe')
    const landscape = info.project.name.endsWith('paisagem')
    const insets = landscape ? { top: 0, bottom: 21, left: 47, right: 47 } : { top: 0, bottom: 34, left: 0, right: 0 }
    if (process.env.RESP_SAFE !== '0') {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setSafeAreaInsetsOverride' as any, { insets } as any)
    }
    const rec = recorder(info)
    await fakeAudio(page)
    await gotoApp(page, '/hoje')
    const seed = await ensurePraticarSeed(page)
    const mark = () => page.evaluate((i) => {
      document.getElementById('resp-safe')?.remove()
      const box = document.createElement('div')
      box.id = 'resp-safe'
      box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647'
      const band = (css: string) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;background:rgba(220,0,0,.28);${css}`; box.appendChild(d) }
      band(`left:0;right:0;bottom:0;height:${i.bottom}px`)
      if (i.left) band(`left:0;top:0;bottom:0;width:${i.left}px`)
      if (i.right) band(`right:0;top:0;bottom:0;width:${i.right}px`)
      document.body.appendChild(box)
    }, insets)
    for (const [name, url] of [['seguro-hoje', '/hoje'], ['seguro-hub', `/cadernos/${seed.rootId}`]] as const) {
      await open(page, url)
      await mark()
      await rec.shot(page, name)
    }
    await open(page, '/podcasts')
    await page.getByTestId(`episode-${seed.dailyId}`).getByTestId('episode-open').click()
    await page.waitForTimeout(500)
    if (await dialog(page).count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
    await page.locator('nav[aria-label="Navegação mobile"]').getByRole('link', { name: 'Hoje' }).click()
    await page.waitForURL('**/hoje')
    await page.waitForLoadState('networkidle')
    await mark()
    await rec.shot(page, 'seguro-mini-player')
  })
})
