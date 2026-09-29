#!/usr/bin/env node
// Bundle budget gate (prd-performance-frontend RF-11).
// Reads the client build (.output/public/_nuxt + Vite client manifest), computes
// gzip sizes per group and compares against scripts/bundle-budget.json.
// Usage: node scripts/check-bundle-budget.mjs [--root <dir>] [--budget <file>] [--json]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}

const root = resolve(arg('--root', process.cwd()))
const budgetFile = resolve(arg('--budget', join(root, 'scripts/bundle-budget.json')))
const publicDir = join(root, '.output/public')
const nuxtDir = join(publicDir, '_nuxt')

const MANIFEST_CANDIDATES = [
  'node_modules/.cache/nuxt/.nuxt/dist/server/client.manifest.mjs',
  '.nuxt/dist/server/client.manifest.mjs',
]

const KB = 1024
const gzCache = new Map()
function gz(file) {
  if (!gzCache.has(file)) {
    const path = join(nuxtDir, file)
    gzCache.set(file, existsSync(path) ? gzipSync(readFileSync(path)).length : 0)
  }
  return gzCache.get(file)
}

async function loadManifest() {
  const found = MANIFEST_CANDIDATES.map(p => join(root, p)).find(existsSync)
  if (!found) throw new Error(`client manifest não encontrado (${MANIFEST_CANDIDATES.join(', ')}) — rode "npm run build" antes`)
  return (await import(pathToFileURL(found).href)).default
}

// Static import closure (JS files) of a manifest key.
function closure(manifest, key, seen = new Set()) {
  const entry = manifest[key]
  if (!entry || seen.has(key)) return seen
  seen.add(key)
  for (const dep of entry.imports ?? []) closure(manifest, dep, seen)
  return seen
}

const jsFiles = (manifest, keys) =>
  new Set([...keys].map(k => manifest[k]?.file).filter(f => f?.endsWith('.js')))

const sumGz = files => [...files].reduce((acc, f) => acc + gz(f), 0)

function findKey(manifest, src) {
  return Object.keys(manifest).find(k => k === src || k.endsWith(`/${src}`) || manifest[k].src === src)
}

function precacheBytes() {
  const swPath = join(publicDir, 'sw.js')
  if (!existsSync(swPath)) return 0
  const sw = readFileSync(swPath, 'utf8')
  const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map(m => m[1])
  let total = 0
  for (const url of urls) {
    const clean = url.replace(/^\//, '')
    const candidates = [clean, join(clean, 'index.html'), `${clean}.html`]
    if (clean === '') candidates.unshift('index.html')
    const file = candidates.map(c => join(publicDir, c)).find(p => existsSync(p) && statSync(p).isFile())
    if (file) total += statSync(file).size
  }
  return total
}

async function main() {
  const budget = JSON.parse(readFileSync(budgetFile, 'utf8'))
  const manifest = await loadManifest()

  const entryKey = Object.keys(manifest).find(k => manifest[k].isEntry)
  const entryClosure = closure(manifest, entryKey)
  const entryFiles = jsFiles(manifest, entryClosure)

  const rows = []
  const push = (name, actual, limit) => rows.push({ name, actual, limit, ok: actual <= limit })

  // Entry + default layout (static closure)
  const layoutKey = findKey(manifest, 'layouts/default.vue')
  const layoutFiles = jsFiles(manifest, closure(manifest, layoutKey))
  push('entrada+layout (gz)', sumGz(new Set([...entryFiles, ...layoutFiles])), budget.entryLayoutGzKb * KB)

  // Libraries that must not ship with entry+layout (e.g. dompurify — RF-03), detected
  // by a signature string of the minified code: { "dompurify": "SAFE_FOR_TEMPLATES" }
  const eagerFiles = new Set([...entryFiles, ...layoutFiles])
  for (const [lib, signature] of Object.entries(budget.entryLayoutForbidden ?? {})) {
    const hits = [...eagerFiles].filter(f => readFileSync(join(nuxtDir, f), 'utf8').includes(signature)).length
    rows.push({ name: `entrada+layout sem ${lib}`, actual: hits, limit: 0, ok: hits === 0, unit: 'chunks' })
  }

  // Route chunks: the page chunk itself (gate of the PRD) and its static closure
  // minus what the entry already ships (what navigating to the route downloads).
  for (const [route, src] of Object.entries(budget.routes ?? {})) {
    const key = findKey(manifest, src.file)
    if (!key) throw new Error(`rota ${route}: ${src.file} não está no manifest`)
    push(`rota ${route} chunk (gz)`, gz(manifest[key].file), src.gzKb * KB)
    if (src.closureGzKb != null) {
      const files = [...jsFiles(manifest, closure(manifest, key))].filter(f => !entryFiles.has(f))
      push(`rota ${route} + imports estáticos (gz)`, sumGz(files), src.closureGzKb * KB)
    }
  }

  // Largest single chunk
  const allJs = existsSync(nuxtDir) ? readdirSync(nuxtDir).filter(f => f.endsWith('.js')) : []
  const largest = allJs.reduce((best, f) => (gz(f) > best.size ? { file: f, size: gz(f) } : best), { file: '-', size: 0 })
  push(`maior chunk ${largest.file} (gz)`, largest.size, budget.largestChunkGzKb * KB)

  // Service worker precache (raw bytes of precached URLs)
  if (budget.precacheKb != null) push('precache sw.js (raw)', precacheBytes(), budget.precacheKb * KB)

  if (args.includes('--json')) {
    console.log(JSON.stringify(rows))
  }
  else {
    const fmt = n => `${(n / KB).toFixed(1)} KB`
    console.log('| item | atual | budget | ok |')
    console.log('|---|---:|---:|:-:|')
    const show = (r, n) => (r.unit ? `${n} ${r.unit}` : fmt(n))
    for (const r of rows) console.log(`| ${r.name} | ${show(r, r.actual)} | ${show(r, r.limit)} | ${r.ok ? 'sim' : 'NÃO'} |`)
  }

  const failed = rows.filter(r => !r.ok)
  if (failed.length) {
    console.error(`\nBudget estourado em ${failed.length} item(ns). Aumentar budget exige justificativa no PR (RN-F06).`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(2)
})
