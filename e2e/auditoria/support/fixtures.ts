import { test as base, expect, type Browser, type Page, type BrowserContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { CONSENT_DECIDED } from '../../helpers'

/**
 * Auditoria E2E (2026-11): own users (`e2e-*@audit.test`), one API login per user per run.
 *
 * - Users are (re)created through `php artisan tinker` in the `baigi-app` container the first
 *   time a worker of this run needs them (marker keyed by the runner pid, so a worker restart
 *   after a failure does not wipe them again).
 * - Login goes straight to the API (csrf-cookie + POST /login), never through the form, and the
 *   storageState is reused by every test of that user: the 5/min login throttle is never hit.
 * - Nothing here calls an AI endpoint. Specs that reach an AI flow mock it with `page.route`.
 */

export const WEB = 'http://localhost:3000'
export const API_ORIGIN = process.env.E2E_API_ORIGIN || 'http://localhost:8037'
export const API = `${API_ORIGIN}/api`
export const AUDIT_PASSWORD = 'Senha-Audit-2026'
const CONTAINER = process.env.E2E_API_CONTAINER || 'baigi-app'

export type UserKey = 'pro' | 'free' | 'quota' | 'unverified' | 'onboarding' | 'onboardingUnverified' | 'empty' | 'session' | 'logout' | 'account' | 'mobile' | 'legacy' | 'scope' | 'nav' | 'hoje' | 'hojeNew' | 'hojeGoal' | 'recorte' | 'hub' | 'material' | 'library' | 'revisao' | 'revisaoEmpty' | 'praticar' | 'praticarFree' | 'progresso' | 'progressoNew' | 'onbText' | 'onbExit' | 'onbExam' | 'onbAnki' | 'onbSample' | 'onbKeyboard' | 'conta' | 'contaPro' | 'parts' | 'organizacao'

type UserSpec = { email: string; plan: 'free' | 'pro'; verified: boolean; onboarded: boolean; reset: true; quota_exhausted?: Record<string, number> }

export const USERS: Record<UserKey, UserSpec> = {
  pro: { email: 'e2e-pro@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  free: { email: 'e2e-free@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  // Free with the monthly cards_ai quota (10) already spent: the API answers 402 before any AI call
  quota: { email: 'e2e-quota@audit.test', plan: 'free', verified: true, onboarded: true, reset: true, quota_exhausted: { cards_ai: 10, agent_chat: 5 } },
  unverified: { email: 'e2e-unverified@audit.test', plan: 'pro', verified: false, onboarded: true, reset: true },
  onboarding: { email: 'e2e-onboarding@audit.test', plan: 'free', verified: true, onboarded: false, reset: true },
  // Fresh e-mail sign-up: onboarding pending and e-mail not confirmed yet (verified mid-test)
  onboardingUnverified: { email: 'e2e-onboarding-unverified@audit.test', plan: 'free', verified: false, onboarded: false, reset: true },
  empty: { email: 'e2e-empty@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  session: { email: 'e2e-session@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  logout: { email: 'e2e-logout@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  account: { email: 'e2e-account@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  mobile: { email: 'e2e-mobile@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Default user of the legacy specs (e2e/*.spec.ts) when E2E_EMAIL points to it (see e2e/README.md)
  legacy: { email: 'e2e-legacy@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Caderno F1 (f1-pontes.spec.ts): its own daily limit of new cards, untouched by the other specs
  scope: { email: 'e2e-scope@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Navegação v3 (navegacao.spec.ts): writes notes through "+ Adicionar" and opens the account menu
  nav: { email: 'e2e-nav@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Hoje v3 (hoje.spec.ts): a plan with the 4 steps, a brand-new account and a goal already met today
  hoje: { email: 'e2e-hoje@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  hojeNew: { email: 'e2e-hoje-new@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  hojeGoal: { email: 'e2e-hoje-goal@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  // Caderno F2 (f2-recorte.spec.ts): a PDF, a note, a quiz and an episode, each one its own session
  recorte: { email: 'e2e-recorte@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Caderno v3 (prd-4b-caderno-v3, e2e/auditoria/caderno-v3.spec.ts)
  hub: { email: 'e2e-hub@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Material e biblioteca v3 (prd-4c-material-v3, material-v3.spec.ts e biblioteca.spec.ts)
  material: { email: 'e2e-material@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  library: { email: 'e2e-library@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Revisão v3 (prd-4d-revisao-v3, revisao-v3.spec.ts): lotes, origem e celebração; e uma conta sem nenhum card
  revisao: { email: 'e2e-revisao@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  revisaoEmpty: { email: 'e2e-revisao-empty@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  // Praticar v3 (prd-4e-praticar-v3, questoes-v3.spec.ts e ouvir-v3.spec.ts): Pro com caderno, simulados e episódios; e um Free
  praticar: { email: 'e2e-praticar@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  praticarFree: { email: 'e2e-praticar-free@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  // Progresso e Provas v3 (prd-4f-progresso-v3, progresso-v3.spec.ts): Pro com provas e revisões; e uma conta nova sem cards
  progresso: { email: 'e2e-progresso@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  progressoNew: { email: 'e2e-progresso-new@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  // Onboarding v3 (prd-4g-conta-onboarding-v3, onboarding-v3.spec.ts): contas sem onboarding e, em quase todas, sem e-mail confirmado
  onbText: { email: 'e2e-onb-text@audit.test', plan: 'free', verified: true, onboarded: false, reset: true },
  onbExit: { email: 'e2e-onb-exit@audit.test', plan: 'free', verified: false, onboarded: false, reset: true },
  onbExam: { email: 'e2e-onb-exam@audit.test', plan: 'free', verified: false, onboarded: false, reset: true },
  onbAnki: { email: 'e2e-onb-anki@audit.test', plan: 'free', verified: false, onboarded: false, reset: true },
  onbSample: { email: 'e2e-onb-sample@audit.test', plan: 'free', verified: false, onboarded: false, reset: true },
  onbKeyboard: { email: 'e2e-onb-keyboard@audit.test', plan: 'free', verified: false, onboarded: false, reset: true },
  // Conta v3 (conta-v3.spec.ts): configurações Free e Pro
  conta: { email: 'e2e-conta@audit.test', plan: 'free', verified: true, onboarded: true, reset: true },
  contaPro: { email: 'e2e-conta-pro@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Material em partes (prd-4c-material-v3 4c-2, partes.spec.ts)
  parts: { email: 'e2e-parts@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
  // Organização do caderno (prd-4b-caderno-v3 4b-2, organizacao.spec.ts): mover, lixeira e Anki
  organizacao: { email: 'e2e-organizacao@audit.test', plan: 'pro', verified: true, onboarded: true, reset: true },
}

const AUTH_DIR = path.join(__dirname, '..', '..', '.auth')
// One id per `playwright test` run (all workers share the runner as parent); override to reuse sessions
const RUN_ID = String(process.env.E2E_AUDIT_RUN_ID || process.ppid)
const STALE_MS = 6 * 3600_000

function ensureAuthDir() {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  const ignore = path.join(AUTH_DIR, '.gitignore')
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n')
  for (const f of fs.readdirSync(AUTH_DIR)) {
    const full = path.join(AUTH_DIR, f)
    if (f !== '.gitignore' && Date.now() - fs.statSync(full).mtimeMs > STALE_MS) fs.rmSync(full, { force: true })
  }
}

/** Runs PHP through tinker inside the API container (local/CI stack only). */
export function tinker(code: string, env: Record<string, string> = {}): string {
  const envArgs = Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`])
  return execFileSync('docker', ['exec', ...envArgs, CONTAINER, 'php', 'artisan', 'tinker', `--execute=${code}`], { encoding: 'utf8', timeout: 60_000 })
}

/** Plain SQL (read-only checks and evidence) on the local Postgres. */
export function sql(query: string): string {
  return execFileSync('docker', ['exec', process.env.E2E_DB_CONTAINER || 'baigi-db', 'psql', '-U', 'baigi', '-d', 'baigi', '-Atc', query], { encoding: 'utf8', timeout: 30_000 }).trim()
}

const sessionFile = (email: string) => path.join(AUTH_DIR, `${email}.run-${RUN_ID}.json`)

function runProvision(specs: object[]): string {
  const php = fs.readFileSync(path.join(__dirname, 'provision.php'), 'utf8').replace(/^<\?php\s*/, '')
  const outText = tinker(php, { E2E_AUDIT_USERS: JSON.stringify(specs), E2E_AUDIT_PASSWORD: AUDIT_PASSWORD })
  if (!outText.includes('E2E_AUDIT_RESULT=')) throw new Error(`provision.php falhou:\n${outText}`)
  return outText
}

/**
 * Marks an audit user's e-mail as verified (stands in for the link in the e-mail). No reset: the
 * user, its data and its session are kept.
 */
export function verifyEmail(spec: { email: string; plan?: 'free' | 'pro'; onboarded?: boolean }) {
  runProvision([{ email: spec.email, plan: spec.plan ?? 'free', onboarded: spec.onboarded ?? false, verified: true }])
}
const provisionedMarker = (email: string) => path.join(AUTH_DIR, `${email}.run-${RUN_ID}.provisioned`)

/** (Re)creates the user once per run, lazily: only users a run actually needs are touched. */
function provision(key: UserKey) {
  ensureAuthDir()
  const spec = USERS[key]
  if (fs.existsSync(provisionedMarker(spec.email))) return
  fs.writeFileSync(provisionedMarker(spec.email), runProvision([spec]))
}

const apiHeaders = (xsrf?: string) => ({
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  Origin: WEB,
  Referer: `${WEB}/`,
  ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
})

async function xsrfOf(context: BrowserContext) {
  const c = (await context.cookies(API_ORIGIN)).find(k => k.name === 'XSRF-TOKEN')
  return c ? decodeURIComponent(c.value) : undefined
}

/**
 * Sanctum SPA login straight on the API (csrf-cookie + POST /login), saved as a storageState file.
 * Reused for the whole run: one login per user per run, far below the 5/min throttle.
 */
export async function apiLoginState(browser: Browser, email: string, password: string, file: string, baseState: any = CONSENT_DECIDED): Promise<string> {
  const context = await browser.newContext({ baseURL: WEB, storageState: baseState })
  try {
    await context.request.get(`${API_ORIGIN}/sanctum/csrf-cookie`, { headers: apiHeaders() })
    const res = await context.request.post(`${API}/login`, { headers: apiHeaders(await xsrfOf(context)), data: { email, password } })
    if (res.status() !== 200) throw new Error(`login API ${email}: ${res.status()} ${await res.text()}`)
    // Front-end hint cookie (stores/auth.ts) so the client calls /me on boot
    await context.addCookies([{ name: 'baigi_logged_in', value: '1', domain: 'localhost', path: '/', sameSite: 'Lax' }])
    await context.storageState({ path: file })
  } finally {
    await context.close()
  }
  return file
}

/** storageState path for an audit user (provisioned + logged in once per run). */
export async function loginState(browser: Browser, key: UserKey, { fresh = false } = {}): Promise<string> {
  provision(key)
  const file = sessionFile(USERS[key].email)
  if (!fresh && fs.existsSync(file)) return file
  return apiLoginState(browser, USERS[key].email, AUDIT_PASSWORD, file)
}

/** Legacy helpers (e2e/helpers.ts): same cache for any e-mail; audit users are provisioned first. */
export async function cachedLoginState(browser: Browser, email: string, password: string, baseState: any = CONSENT_DECIDED): Promise<string> {
  const key = (Object.keys(USERS) as UserKey[]).find(k => USERS[k].email === email)
  if (key) return loginState(browser, key)
  ensureAuthDir()
  const file = sessionFile(email)
  if (fs.existsSync(file)) return file
  return apiLoginState(browser, email, password, file, baseState)
}

export function forgetSession(email: string) {
  fs.rmSync(sessionFile(email), { force: true })
}

/** Authenticated request helper (same session as the page): seeds data without the UI. */
export async function apiCall(page: Page, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: unknown) {
  const res = await page.context().request.fetch(`${API}${url}`, { method, headers: apiHeaders(await xsrfOf(page.context())), data })
  const body = await res.json().catch(() => null)
  if (!res.ok()) throw new Error(`${method} ${url} → ${res.status()} ${JSON.stringify(body)}`)
  return body
}

/** TipTap doc from plain paragraphs (note bodies). */
export const doc = (...paragraphs: string[]) => ({ type: 'doc', content: paragraphs.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) })

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Every request to these URL fragments is blocked and recorded (AI must never run for real). */
export async function forbidAi(page: Page) {
  const hits: string[] = []
  const AI = /\/api\/(ai\/generate-cards|chat$|podcasts$|quizzes$|notes\/[^/]+\/mindmap\/generate|topics\/[^/]+\/mindmap\/generate|topics\/[^/]+\/notes\/[^/]+\/improve|documents\/[^/]+\/(generate|regenerate)|flashcards\/from-image|topics\/from-document|ai\/organize-import)/
  await page.route(url => AI.test(url.pathname), async (route) => {
    if (route.request().method() === 'GET') return route.fallback()
    hits.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
    await route.fulfill({ status: 599, contentType: 'application/json', body: JSON.stringify({ message: 'bloqueado pelo teste (IA real proibida)' }) })
  })
  return hits
}

/**
 * Lets an AI POST reach the real API only to prove that a gate (402 quota / 403 unverified) answers
 * BEFORE any AI work. Precondition is checked first; a 2xx answer is recorded as a leak and the queued
 * AiJob rows of that user are deleted right away (the queued job then dies on ModelNotFound, no AI call).
 */
export async function realGate(page: Page, pattern: RegExp, userKey: UserKey, precondition: () => boolean) {
  const seen: { status: number; body: any }[] = []
  await page.route(url => pattern.test(url.pathname), async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    if (!precondition()) return route.fulfill({ status: 599, json: { message: 'pré-condição do gate falhou: chamada real não enviada' } })
    const res = await route.fetch()
    const body = await res.json().catch(() => null)
    seen.push({ status: res.status(), body })
    if (res.status() < 400) sql(`delete from ai_jobs where user_id = (select id from users where email='${USERS[userKey].email}')`)
    await route.fulfill({ response: res })
  })
  return seen
}

type Fixtures = { auditUser: UserKey | null; aiGuard: string[] }

export const test = base.extend<Fixtures>({
  auditUser: [null, { option: true }],
  storageState: async ({ auditUser, browser }, use) => {
    await use(auditUser ? await loginState(browser, auditUser) : CONSENT_DECIDED as any)
  },
  // Safety net in every audit test: real AI POSTs are cut at the browser (registered first,
  // so a spec's own page.route mocks — registered later — take precedence).
  aiGuard: [async ({ page }, use) => {
    const hits = await forbidAi(page)
    await use(hits)
  }, { auto: true }],
})

export { expect }

/** Page boot: wait until the client knows the user (sidebar/bottom nav rendered). */
export async function gotoApp(page: Page, url: string) {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  expect(new URL(page.url()).pathname, `sessão perdida ao abrir ${url}`).not.toBe('/entrar')
}
