#!/usr/bin/env node
/**
 * Production check of the conferred edital pages (prd-paginas-edital-publicas RF-W10). For every page open today:
 *   - GET {API}/public/editais/{id} answers 200 ready, curated.slug = slug and the proposal has the file's sha
 *     (otherwise "Estudar isso no Baigi" would apply another list, or fail);
 *   - the official PDF (source_url) still answers 2xx/3xx;
 *   - with a build in .output/public, every internal link of the prerendered page exists in it.
 * --stale only lists the open pages checked more than 21 days ago (to check again) and never fails.
 *
 * Usage: node scripts/check-editais.mjs [slug ...] [--stale] [--dir content/editais] [--api https://api.baigi.com.br/api]
 * Exit 1 on any failure (the scheduled workflow mails the owner). Read only: GETs and HEADs, no writes.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const STALE_DAYS = 21
const args = process.argv.slice(2)
const flag = name => args.includes(name)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const root = resolve(import.meta.dirname, '..')
const dir = resolve(root, option('--dir', 'content/editais'))
const api = option('--api', process.env.EDITAIS_API || 'https://api.baigi.com.br/api').replace(/\/$/, '')
const only = args.filter((a, i) => !a.startsWith('--') && !['--dir', '--api'].includes(args[i - 1]))

/** Day of São Paulo, AAAA-MM-DD (the same rule as app/utils/editalStatus.ts) */
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
/** Open = no override and the exam (or expires_on) not passed: editalStatus().open */
const isOpen = p => !p.status_override && today <= (p.edital?.prova ?? p.expires_on ?? '0000-00-00')

/** Same canonical JSON as modules/editais/validate.ts and PublicEditalService::proposalSha256 */
export function proposalSha256(proposal) {
  const sort = v => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v
  return createHash('sha256').update(JSON.stringify(sort(proposal)), 'utf8').digest('hex')
}

const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)

async function reachable(url) {
  const opts = { redirect: 'manual', headers: { 'User-Agent': 'baigi-editais-check' }, signal: AbortSignal.timeout(20_000) }
  let res = await fetch(url, { ...opts, method: 'HEAD' })
  // Some official sites refuse HEAD: one byte by GET says the same
  if (res.status === 405 || res.status === 403 || res.status === 501) res = await fetch(url, { ...opts, method: 'GET', headers: { ...opts.headers, Range: 'bytes=0-0' } })
  return res.status
}

/** Routes of the app that open on the client, not prerendered (the same as LINKABLE in modules/blog) */
const APP_ROUTES = /^\/(criar-conta|entrar|comecar(\/(concurso|enem|medicina|oab|ingles|faculdade))?)$/

function builtLinks(slug) {
  const pub = resolve(root, '.output/public')
  const file = join(pub, 'editais', slug, 'index.html')
  if (!existsSync(file)) return null
  const html = readFileSync(file, 'utf8')
  const hrefs = [...new Set([...html.matchAll(/href="(\/[^"#?]*)/g)].map(m => m[1]))].filter(h => !h.startsWith('/_nuxt/') && !/\.\w+$/.test(h))
  return hrefs.filter(h => !APP_ROUTES.test(h) && !existsSync(join(pub, h === '/' ? 'index.html' : `${h.replace(/^\//, '')}/index.html`)))
}

const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).sort() : []
const pages = files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8'))).filter(p => !only.length || only.includes(p.slug))
if (!pages.length) {
  console.log(only.length ? `Nenhuma página com o slug ${only.join(', ')} em ${basename(dir)}.` : 'Nenhum edital conferido: nada a checar.')
  process.exit(only.length ? 1 : 0)
}

const open = pages.filter(isOpen)
const stale = open.filter(p => daysBetween(p.checked_at, today) > STALE_DAYS)
for (const p of stale) console.log(`RECONFERIR ${p.slug}: conferido em ${p.checked_at} (${daysBetween(p.checked_at, today)} dias)`)
if (flag('--stale')) {
  if (!stale.length) console.log(`Nenhuma página aberta com conferência de mais de ${STALE_DAYS} dias.`)
  process.exit(0)
}

let failures = 0
const fail = (slug, msg) => { failures++; console.log(`FALHA ${slug}: ${msg}`) }
for (const p of only.length ? pages : open) {
  try {
    const res = await fetch(`${api}/public/editais/${encodeURIComponent(p.id)}`, { headers: { Accept: 'application/json', 'User-Agent': 'baigi-editais-check' }, signal: AbortSignal.timeout(20_000) })
    if (res.status !== 200) fail(p.slug, `GET /public/editais/${p.id} respondeu ${res.status}`)
    else {
      const body = await res.json()
      const r = body.data ?? body
      if (r.status !== 'ready') fail(p.slug, `a leitura está ${r.status}, não ready`)
      if (r.curated?.slug !== p.slug) fail(p.slug, `curated.slug na API é ${r.curated?.slug ?? 'null'}`)
      if (!r.proposal || proposalSha256(r.proposal) !== p.proposal_sha256) fail(p.slug, 'a lista da API é diferente da do arquivo (proposal_sha256): exporte de novo')
    }
  } catch (e) {
    fail(p.slug, `API fora do ar (${e.message})`)
  }
  try {
    const status = await reachable(p.source_url)
    if (status < 200 || status >= 400) fail(p.slug, `o PDF oficial respondeu ${status}: ${p.source_url}`)
  } catch (e) {
    fail(p.slug, `o PDF oficial não respondeu (${e.message}): ${p.source_url}`)
  }
  const broken = builtLinks(p.slug)
  if (broken?.length) fail(p.slug, `links internos sem página no build: ${broken.join(', ')}`)
  if (!failures) console.log(`ok ${p.slug}`)
}
console.log(`${only.length ? pages.length : open.length} página(s) checada(s), ${failures} falha(s).`)
process.exit(failures ? 1 : 0)
