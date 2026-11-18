#!/usr/bin/env node
/**
 * Read-only Search Console report for baigi.com.br (Search Console API, no dependencies: the JWT is signed with node:crypto).
 *   node scripts/gsc-report.mjs sites             properties the key can read
 *   node scripts/gsc-report.mjs report [dias=28]  total, per day, per page and per query (recent data included)
 *   node scripts/gsc-report.mjs inspect URL...    whether each URL is indexed and when it was last crawled
 * The key is a service account with "Restrita" permission on the property. It lives OUTSIDE the repo:
 * GSC_KEY (default ~/.config/baigi/gsc.json). GSC_SITE overrides the property (default sc-domain:baigi.com.br).
 * Readings are recorded in docs/produto/seo-blog.md §3b (outside the repo).
 */
import { existsSync, readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
import { homedir } from 'node:os'

const KEY = process.env.GSC_KEY || `${homedir()}/.config/baigi/gsc.json`
if (!existsSync(KEY)) { console.error(`Chave do Search Console não encontrada em ${KEY} (GSC_KEY)`); process.exit(1) }
const key = JSON.parse(readFileSync(KEY, 'utf8'))
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')

async function token() {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: key.token_uri, iat: now, exp: now + 3600 })}`
  const sig = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url')
  const res = await fetch(key.token_uri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }) })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  return (await res.json()).access_token
}

const [cmd = 'sites', ...args] = process.argv.slice(2)
const t = await token()
const api = async (path, body) => {
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`)
  return JSON.parse(text)
}

if (cmd === 'sites') console.log(JSON.stringify(await api('sites'), null, 2))

const SITE = encodeURIComponent(process.env.GSC_SITE || 'sc-domain:baigi.com.br')
const day = d => d.toISOString().slice(0, 10)
const fmt = r => `${String(r.impressions).padStart(5)} imp ${String(r.clicks).padStart(3)} cl  pos ${r.position.toFixed(1).padStart(5)}`

if (cmd === 'report') {
  const days = Number(args[0] || 28)
  const end = new Date(); end.setDate(end.getDate() - 1)
  const start = new Date(end); start.setDate(start.getDate() - days + 1)
  const q = dims => api(`sites/${SITE}/searchAnalytics/query`, { startDate: day(start), endDate: day(end), dimensions: dims, rowLimit: 50, dataState: 'all' })
  const [tot, date, page, query] = await Promise.all([q([]), q(['date']), q(['page']), q(['query'])])
  console.log(`Janela ${day(start)} a ${day(end)} (dados recentes incluídos)`)
  console.log('TOTAL', tot.rows ? fmt(tot.rows[0]) : 'sem dados')
  console.log('\nPOR DIA'); for (const r of date.rows || []) console.log(r.keys[0], fmt(r))
  console.log('\nPOR PÁGINA'); for (const r of page.rows || []) console.log(fmt(r), r.keys[0].replace('https://baigi.com.br', ''))
  console.log('\nPOR BUSCA'); for (const r of query.rows || []) console.log(fmt(r), r.keys[0].replace(/\s+/g, ' ').slice(0, 110))
}

if (cmd === 'inspect') {
  for (const url of args) {
    const r = await api('../../v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl: decodeURIComponent(SITE) })
    const s = r.inspectionResult?.indexStatusResult || {}
    console.log(url.replace('https://baigi.com.br', ''), '|', s.verdict, '|', s.coverageState, '| rastreada:', s.lastCrawlTime || '-')
  }
}
