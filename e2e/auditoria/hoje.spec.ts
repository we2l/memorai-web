import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, tinker, doc, USERS } from './support/fixtures'

/**
 * Hoje v3 (prd-4a-hoje-v3 §9): plano do dia, meta em lotes, prova a qualquer distância, cadernos só raízes e
 * a conta nova com os primeiros passos. Usuários próprios, recriados a cada execução:
 * - e2e-hoje@audit.test: um caderno com uma matéria de 12 cards e uma nota, um episódio pronto (tinker) e
 *   uma prova em 45 dias, para os 4 passos;
 * - e2e-hoje-new@audit.test: conta nova sem nada;
 * - e2e-hoje-goal@audit.test: 1 card revisado hoje e nada pendente (meta cumprida).
 * Nenhuma IA: cards por /ai/accept-cards, episódio gravado no banco, sem mock nas rotas de persistência.
 */

const ROOT = 'TRF Hoje'
const SUBJECT = 'Controle de constitucionalidade'

/** A few samples of silence (fits podcasts.audio_url, 500 chars): the mini-player plays it without network. */
function silentWav(): string {
  const samples = 8
  const b = Buffer.alloc(44 + samples, 0x80)
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples, 4); b.write('WAVE', 8); b.write('fmt ', 12)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24)
  b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(samples, 40)
  return `data:audio/wav;base64,${b.toString('base64')}`
}

/** AAAA-MM-DD in Brasília, `days` from today (the API counts exam days there). */
function spDate(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

interface PlanSeed { rootId: string; subjectId: string; otherRootId: string; noteA: string; noteB: string; podcastId: string }

/** Data of the plan user, created once per run (the user is recreated at the start of each run). */
async function ensurePlanSeed(page: Page): Promise<PlanSeed> {
  const topics = (await apiCall(page, 'GET', '/topics')).data as any[]
  const existing = topics.find(t => t.name === ROOT)
  if (existing) {
    const subject = existing.children.find((c: any) => c.name === SUBJECT)
    const notes = (await apiCall(page, 'GET', `/topics/${subject.id}/notes`)).data as any[]
    const podcasts = (await apiCall(page, 'GET', '/podcasts')).data as any[]
    return {
      rootId: existing.id, subjectId: subject.id, otherRootId: topics.find(t => t.name === 'Inglês Hoje').id,
      noteA: notes.find(n => n.title === 'Apostila A').id, noteB: notes.find(n => n.title === 'Apostila B').id, podcastId: podcasts[0].id,
    }
  }
  const root = (await apiCall(page, 'POST', '/topics', { name: ROOT })).data
  const subject = (await apiCall(page, 'POST', '/topics', { name: SUBJECT, parent_id: root.id })).data
  const other = (await apiCall(page, 'POST', '/topics', { name: 'Inglês Hoje' })).data
  const noteA = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title: 'Apostila A' })).data
  await apiCall(page, 'PUT', `/notes/${noteA.id}`, { content: doc('Controle difuso e concentrado.') })
  const noteB = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title: 'Apostila B' })).data
  await apiCall(page, 'PUT', `/notes/${noteB.id}`, { content: doc('Ação direta de inconstitucionalidade.') })
  await apiCall(page, 'POST', '/ai/accept-cards', {
    topic_id: subject.id,
    cards: Array.from({ length: 12 }, (_, i) => ({ front: `Pergunta ${i}`, back: `Resposta ${i}` })),
  })
  // "Continuar material": A then B opened (B is the last one)
  await apiCall(page, 'POST', `/notes/${noteA.id}/opened`)
  await page.waitForTimeout(1100)
  await apiCall(page, 'POST', `/notes/${noteB.id}/opened`)
  await apiCall(page, 'POST', '/exams', { title: 'Prova TRF', exam_date: spDate(45), topic_ids: [root.id] })

  const out = tinker(`
    $u = App\\Domain\\User\\Models\\User::where('email', '${USERS.hoje.email}')->firstOrFail();
    $p = App\\Domain\\Podcast\\Models\\Podcast::create(['user_id' => $u->id, 'topic_id' => '${root.id}', 'title' => 'Seus erros de Constitucional', 'status' => 'ready', 'audio_url' => '${silentWav()}', 'duration_seconds' => 720, 'content_mode' => 'weak_points']);
    echo 'PODCAST_ID=' . $p->id;
  `)
  const podcastId = out.match(/PODCAST_ID=([0-9a-f-]{36})/)?.[1]
  if (!podcastId) throw new Error(`episódio não criado:\n${out}`)
  return { rootId: root.id, subjectId: subject.id, otherRootId: other.id, noteA: noteA.id, noteB: noteB.id, podcastId }
}

const main = (page: Page) => page.getByRole('main')
const primaries = (page: Page) => main(page).locator('.bg-action.shadow-press')

test.describe('Plano do dia (e2e-hoje)', () => {
  test.use({ auditUser: 'hoje' })

  test('4 passos na ordem fixa, um primário só, prova em 45 dias e meta em lotes', async ({ page }) => {
    await gotoApp(page, '/hoje')
    await ensurePlanSeed(page)
    await gotoApp(page, '/hoje')

    const steps = main(page).getByTestId(/^plan-step-/)
    await expect(steps).toHaveCount(4)
    expect(await steps.evaluateAll(els => els.map(e => e.getAttribute('data-testid')))).toEqual(
      ['plan-step-review', 'plan-step-quiz', 'plan-step-listen', 'plan-step-material'])
    await expect(main(page).getByTestId('plan-step-review')).toContainText(`Revisar 12 cards de ${ROOT}`)
    await expect(main(page).getByTestId('plan-step-quiz')).toContainText(`Questões de ${SUBJECT}`)
    await expect(main(page).getByTestId('plan-step-listen')).toContainText('Ouvir: Seus erros de Constitucional')
    await expect(main(page).getByTestId('plan-step-material')).toContainText('Continuar Apostila B')
    await expect(primaries(page)).toHaveCount(1)
    await expect(main(page).getByTestId('plan-step-review').locator('.shadow-press')).toHaveCount(1)
    await expect(main(page).locator('.bg-tinted')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Bom dia|Boa tarde|Boa noite), Auditoria\. Hoje são uns \d+ minutos\.$/)

    // The exam at 45 days shows (the old Hoje hid anything beyond 14)
    // 44 from 21h in São Paulo: days_remaining is counted in UTC on the API
    await expect(main(page).getByTestId('home-exam')).toContainText(/Prova TRF em 4[45] dias/)
    await expect(main(page).getByTestId('home-exam').getByRole('link', { name: 'Ver provas →' })).toHaveAttribute('href', '/progresso#provas')

    // Goal: 12 cards due, nothing done → 0 of 1 batch, the shape with its text
    await expect(main(page).getByRole('progressbar', { name: 'Meta de hoje: 0 de 1 lote' })).toBeVisible()
    await expect(main(page).getByTestId('home-goal')).toHaveText('0 de 1 lote')

    // Questões opens the quiz sheet with the subject, generating nothing by itself
    await main(page).getByTestId('plan-step-quiz').getByRole('link', { name: 'Fazer' }).click()
    await expect(page).toHaveURL(/\/simulados\?topic_id=/)
    await expect(page.getByRole('dialog', { name: 'Novas questões' })).toBeVisible()
  })

  test('"Revisar N" do plano = /stats.due_today = a sessão que ele abre', async ({ page }) => {
    await gotoApp(page, '/hoje')
    await ensurePlanSeed(page)
    await gotoApp(page, '/hoje')
    const due = (await apiCall(page, 'GET', '/stats')).data.due_today
    const step = main(page).getByTestId('plan-step-review')
    const n = Number((await step.locator('p').first().innerText()).match(/Revisar (\d+)/)?.[1])
    const session = page.waitForResponse(r => r.url().includes('/api/review/session'))
    await step.getByRole('link', { name: 'Começar' }).click()
    const body = await (await session).json()
    test.info().annotations.push({ type: 'evidência', description: `plano=${n} stats=${due} sessão=${body.session_count}` })
    expect(new Set([n, due, body.session_count]).size).toBe(1)
  })

  test('Cadernos mostra só as raízes, com "N hoje" = session_count e barra de domínio', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const seed = await ensurePlanSeed(page)
    await gotoApp(page, '/hoje')
    const roots = ((await apiCall(page, 'GET', '/topics')).data as any[])
    const progress = ((await apiCall(page, 'GET', '/topics/progress')).data as any[])
    const block = main(page).getByTestId('home-notebooks')
    const rows = block.getByRole('link')
    await expect(rows).toHaveCount(roots.length)
    await expect(block).not.toContainText(SUBJECT)
    const trf = block.locator(`a[href="/cadernos/${seed.rootId}"]`)
    const sessionCount = progress.find(p => p.id === seed.rootId).session_count
    await expect(trf).toContainText(`${sessionCount} hoje`)
    await expect(trf.getByRole('progressbar', { name: new RegExp(`^Domínio de ${ROOT}: \\d+%$`) })).toBeVisible()
    await expect(block.locator(`a[href="/cadernos/${seed.otherRootId}"]`)).toContainText('novo')
  })

  test('"Continuar" abre a nota aberta por último; "Ouvir" toca no mini-player sem sair', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const seed = await ensurePlanSeed(page)
    await gotoApp(page, '/hoje')

    await main(page).getByTestId('plan-step-listen').getByRole('button', { name: 'Ouvir' }).click()
    await expect(page).toHaveURL(/\/hoje$/)
    await expect(page.getByText('Seus erros de Constitucional').last()).toBeVisible()

    await main(page).getByTestId('plan-step-material').getByRole('link', { name: 'Continuar' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${seed.subjectId}/material/${seed.noteB}$`))
    await expect(page.getByText('Ação direta de inconstitucionalidade.')).toBeVisible()
  })

  test('carregando: skeleton com aria-busy e sem deslocamento ao chegar (CLS ≤ 0,05)', async ({ page }) => {
    await gotoApp(page, '/hoje')
    await ensurePlanSeed(page)
    await page.addInitScript(() => {
      (window as any).__cls = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    let release!: () => void
    const gate = new Promise<void>(r => (release = r))
    await page.route(/\/api\/stats$/, async (route) => { await gate; await route.fallback() })
    await page.goto('/hoje')
    const busy = main(page).locator('[aria-busy="true"]').first()
    await expect(busy).toBeVisible()
    await expect(main(page).getByTestId('skeleton').first()).toBeVisible()
    release()
    await expect(main(page).getByTestId('plan-step-review')).toBeVisible()
    await page.waitForTimeout(500)
    const cls = await page.evaluate(() => (window as any).__cls as number)
    test.info().annotations.push({ type: 'evidência', description: `CLS do skeleton ao conteúdo: ${cls.toFixed(4)}` })
    expect(cls).toBeLessThanOrEqual(0.05)
  })

  test('erro em /stats: só a saudação e o erro no plano, nunca "Tudo em dia"; "Tentar de novo" recupera', async ({ page }) => {
    let fail = true
    await page.route(/\/api\/stats$/, route => (fail ? route.fulfill({ status: 500, json: { message: 'x' } }) : route.fallback()))
    await gotoApp(page, '/hoje')
    await expect(main(page).getByText('Não foi possível carregar seu plano de hoje')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Bom dia|Boa tarde|Boa noite), Auditoria\.$/)
    await expect(main(page).getByText(/Tudo em dia|Que bom ter você aqui|Primeiros passos/)).toHaveCount(0)
    fail = false
    await main(page).getByRole('alert').getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(main(page).getByText('Não foi possível carregar seu plano de hoje')).toBeHidden()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hoje são uns')
  })
})

test.describe('Conta nova (e2e-hoje-new)', () => {
  test.use({ auditUser: 'hojeNew' })

  test('boas-vindas e primeiros passos clicáveis, com o primário no 1º pendente', async ({ page }) => {
    await gotoApp(page, '/hoje')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Que bom ter você aqui, Auditoria.')
    const checklist = main(page).getByTestId('home-checklist')
    await expect(checklist.getByRole('heading', { name: 'Primeiros passos' })).toBeVisible()
    await expect(main(page).getByTestId('home-plan')).toHaveCount(0)
    await expect(main(page).getByTestId('home-notebooks')).toHaveCount(0)
    await expect(primaries(page)).toHaveCount(1)
    const create = checklist.getByRole('link', { name: 'Criar caderno' })
    await expect(create).toHaveClass(/shadow-press/)
    await create.click()
    // /cadernos?action=new-notebook opens the create dialog (and drops the param)
    await expect(page).toHaveURL(/\/cadernos/)
    await expect(page.getByRole('dialog')).toBeVisible()

    // With a caderno, the next pending step ("Adicionar material") takes the primary and opens "+ Adicionar"
    await apiCall(page, 'POST', '/topics', { name: `Primeiro ${uid()}` })
    await gotoApp(page, '/hoje')
    await expect(checklist.getByText('1 de 5 concluídos')).toBeVisible()
    await expect(primaries(page)).toHaveCount(1)
    await checklist.getByRole('button', { name: 'Adicionar' }).click()
    await expect(page.getByRole('dialog', { name: 'Adicionar' })).toBeVisible()
  })
})

test.describe('Meta cumprida (e2e-hoje-goal)', () => {
  test.use({ auditUser: 'hojeGoal', contextOptions: { reducedMotion: 'reduce' } })

  test('celebra uma vez por dia neste aparelho e sem movimento com reducedMotion', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const topic = (await apiCall(page, 'POST', '/topics', { name: `Meta ${uid()}` })).data
    await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topic.id, cards: [{ front: 'Meta?', back: 'Cumprida' }] })
    const card = (await apiCall(page, 'GET', `/review/session?topic_id=${topic.id}`)).data[0]
    await apiCall(page, 'POST', '/review', { flashcard_id: card.id, rating: 4 })

    await gotoApp(page, '/hoje')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tudo em dia, Auditoria.')
    await expect(main(page).getByTestId('home-goal')).toHaveText('Meta de hoje cumprida')
    const party = main(page).getByRole('status').filter({ hasText: 'Meta cumprida' })
    await expect(party).toBeVisible()
    await expect(party.locator('.animate-celebrate-burst')).toHaveCount(0)
    const animation = await party.locator('.motion-safe\\:animate-celebrate-pop').first().evaluate(el => getComputedStyle(el).animationName)
    expect(animation).toBe('none')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(main(page).getByTestId('home-goal')).toHaveText('Meta de hoje cumprida')
    await expect(main(page).getByRole('status').filter({ hasText: 'Meta cumprida' })).toHaveCount(0)
  })
})

test.describe('Acessibilidade do Hoje (axe, dados reais)', () => {
  for (const user of ['hoje', 'hojeNew'] as const) {
    test.describe(user, () => {
      test.use({ auditUser: user })
      for (const width of [1440, 390]) {
        for (const theme of ['light', 'dark'] as const) {
          test(`${width}px ${theme} sem violações serious/critical`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 })
            if (user === 'hoje') { await gotoApp(page, '/hoje'); await ensurePlanSeed(page) }
            await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
            await gotoApp(page, '/hoje')
            await page.waitForTimeout(400)
            const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
            for (const v of results.violations) console.log(`[axe hoje ${user} ${width} ${theme}] ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)
            expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id} (${v.nodes.length})`)).toEqual([])
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
          })
        }
      }
    })
  }
})
