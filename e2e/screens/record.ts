import fs from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import { CONSENT_DECIDED, login } from '../helpers'
import { SCREENS, VIEWPORTS, API_URL, NO_MOTION_CSS, initScript, variantsOf, type Fixture } from './screens'

/**
 * Grava e2e/screens/api.har (+ fixture.json) contra a API local, para o replay do
 * e2e/screens.spec.ts no CI. Rodar com o build servido em :3000 apontando para a API local:
 *   E2E_EMAIL=caderno-shots@test.local E2E_PASSWORD=... npx playwright test -c e2e/screens/record.config.ts
 */

const DIR = path.join(__dirname)
const HAR = path.join(DIR, 'api.har')
const BASE_URL = process.env.SCREENS_BASE_URL || 'http://localhost:3000'
const API_BASE = process.env.SCREENS_API_BASE || 'http://localhost:8037/api'
const TOPIC = process.env.SCREENS_TOPIC || 'Direito Constitucional'
const EMPTY_TOPIC = process.env.SCREENS_EMPTY_TOPIC || 'Português'
const NOTE = process.env.SCREENS_NOTE || 'CF88 - Título II' // prefixo do título

const SECRET_HEADERS = new Set(['cookie', 'set-cookie', 'x-xsrf-token', 'authorization'])
const SECRET_URL = /\/(login|logout|register|password|forgot-password|reset-password|user\/password)\b/i

test.setTimeout(10 * 60_000)

test('grava HAR das telas', async ({ browser }) => {
  // A: login pela UI (uma vez — throttle 5/min) e descoberta dos ids da fixture
  const ctxA = await browser.newContext({ baseURL: BASE_URL, storageState: CONSENT_DECIDED })
  const pageA = await ctxA.newPage()
  await login(pageA)
  const ids = await pageA.evaluate(async ({ api, topic, empty, note }) => {
    const get = async (p: string) => {
      const r = await fetch(api + p, { credentials: 'include', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
      if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`)
      return (await r.json()).data
    }
    const flat: any[] = []
    const walk = (list: any[]) => list.forEach((t) => { flat.push(t); walk(t.children ?? []) })
    walk(await get('/topics'))
    const byName = (n: string) => flat.find(t => t.name === n)?.id
    const topicId = byName(topic)
    const notes = await get(`/topics/${topicId}/notes`)
    const n = (notes as any[]).find(x => String(x.title).startsWith(note))
    return { topicId, emptyTopicId: byName(empty), noteId: n?.id, noteTitle: n?.title }
  }, { api: API_BASE, topic: TOPIC, empty: EMPTY_TOPIC, note: NOTE })
  if (!ids.topicId || !ids.emptyTopicId || !ids.noteId || !ids.noteTitle) throw new Error(`fixture incompleta: ${JSON.stringify(ids)}`)
  const state = await ctxA.storageState()
  await ctxA.close()

  const fx: Fixture = { recordedAt: new Date().toISOString(), ...ids }
  const parts: string[] = []

  // B: sessão reaproveitada (sem request de login no HAR), um contexto por viewport
  for (const tag of ['desktop', 'mobile'] as const) {
    const part = path.join(DIR, `.api-${tag}.har`)
    parts.push(part)
    const ctx = await browser.newContext({
      ...VIEWPORTS[tag],
      baseURL: BASE_URL,
      storageState: state,
      reducedMotion: 'reduce',
      recordHar: { path: part, urlFilter: API_URL, content: 'embed' },
    })
    // Nada de escrita na API durante a gravação
    await ctx.route(API_URL, (route) => {
      const m = route.request().method()
      if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue()
      console.warn(`[record] bloqueado ${m} ${route.request().url()}`)
      return route.abort()
    })
    for (const s of SCREENS.filter(x => !x.anonymous)) {
      for (const v of variantsOf(s).filter(x => x.tag === tag)) {
        const page = await ctx.newPage()
        await page.addInitScript(initScript(v.theme, NO_MOTION_CSS))
        await s.run(page, fx, v)
        console.log(`[record] ${s.name} ${tag} ${v.theme}`)
        await page.close()
      }
    }
    await ctx.close()
  }

  // Merge + sanitize: sem cookies, tokens, login/senha nem escritas
  const merged = JSON.parse(fs.readFileSync(parts[0]!, 'utf8'))
  const entries = parts.flatMap(p => JSON.parse(fs.readFileSync(p, 'utf8')).log.entries)
  const clean = (hs: any[]) => hs.filter(h => !SECRET_HEADERS.has(String(h.name).toLowerCase()))
  const seen = new Set<string>()
  merged.log.entries = entries
    .filter((e: any) => e.request.method === 'GET' && !SECRET_URL.test(e.request.url) && e.response.status > 0)
    // Uma resposta por URL (a primeira): HAR menor e replay determinístico mesmo com polling
    .filter((e: any) => !seen.has(e.request.url) && !!seen.add(e.request.url))
    .map((e: any) => {
      e.request.headers = clean(e.request.headers)
      e.request.cookies = []
      e.response.headers = clean(e.response.headers)
      e.response.cookies = []
      delete e.request.postData
      return e
    })
  merged.log.pages = []
  merged.log.comment = `baigi screens ${fx.recordedAt}`
  const out = JSON.stringify(merged, null, 1)
  const password = process.env.E2E_PASSWORD
  if (password && out.includes(password)) throw new Error('senha encontrada no HAR')
  if (/xsrf-token=|laravel_session=|baigi_session=/i.test(out)) throw new Error('cookie de sessão encontrado no HAR')
  fs.writeFileSync(HAR, out + '\n')
  fs.writeFileSync(path.join(DIR, 'fixture.json'), JSON.stringify(fx, null, 2) + '\n')
  parts.forEach(p => fs.rmSync(p, { force: true }))
  console.log(`[record] ${merged.log.entries.length} entradas, ${(out.length / 1024).toFixed(0)} KiB → ${HAR}`)
})
