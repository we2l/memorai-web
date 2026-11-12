// Share image of each article (og:image, twitter:image and the Article JSON-LD): 1200×675 (16:9) JPEG in
// public/blog/capas/<slug>.jpg. Google asks for a large image that is not generic for Discover; one image for the
// whole blog was generic. The images are committed: the Vercel build has no browser, and the blog module fails the
// build when an article has none (modules/blog/index.ts).
// Usage (after writing or editing an article; needs Playwright's Chromium and the Inter font installed):
//   node scripts/blog-capas.mjs            -> only the articles without an image
//   node scripts/blog-capas.mjs --todas    -> all of them again (title, category or cover changed)
//   node scripts/blog-capas.mjs <slug>...  -> just these
// Look: the article header (category with dot, context, H1) beside the cover number in Fraunces, the dolphin, and
// the address; light background, one violet accent (ADR-027/035).
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = path.join(root, 'content/blog')
const outDir = path.join(root, 'public/blog/capas')
const asset = rel => pathToFileURL(path.join(root, rel)).href

// The same labels as modules/blog/types.ts BLOG_CATEGORIES (a test compares them)
export const CATEGORY_LABELS = {
  metodo: 'Método de estudo',
  concurso: 'Concurso',
  enem: 'ENEM e vestibular',
  oab: 'OAB',
  medicina: 'Medicina',
  idiomas: 'Idiomas',
  comparacao: 'Comparações',
}

/** The flat `key: value` front matter of the blog (the same format modules/blog/markdown.ts reads) */
function frontMatter(source, file) {
  const m = source.match(/^---\n([\s\S]*?)\n---/)
  if (!m) throw new Error(`${file}: sem front matter`)
  const data = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i < 1) continue
    let value = line.slice(i + 1).trim()
    if (/^".*"$/.test(value)) value = value.slice(1, -1)
    data[line.slice(0, i).trim()] = value
  }
  return data
}

const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function html(a) {
  const cover = a.cover ? JSON.parse(a.cover) : null
  const kicker = [CATEGORY_LABELS[a.category] ?? a.category, a.context].filter(Boolean).join(' · ')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Bricolage'; src: url('${asset('public/landing/bricolage-700.woff2')}') format('woff2'); font-weight: 700; }
@font-face { font-family: 'Baigi Num'; src: url('${asset('app/assets/fonts/baigi-num-600.woff2')}') format('woff2'); font-weight: 600;
  unicode-range: U+0020, U+0025, U+002B, U+002C, U+002E, U+0030-0039, U+00BA, U+2212; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 675px; overflow: hidden; background: #FBFAFD; color: #14121A; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.wrap { position: relative; width: 1200px; height: 675px; padding: 72px 80px; display: flex; gap: 56px; }
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.kicker { display: flex; align-items: center; gap: 14px; font: 600 26px 'Inter'; color: #5B5866; }
.kicker i { width: 14px; height: 14px; border-radius: 50%; background: #6F3FF5; flex: none; }
h1 { margin-top: 32px; font: 700 58px/1.08 'Bricolage'; letter-spacing: -.01em; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
.brand { margin-top: auto; font: 700 30px 'Bricolage'; }
.brand b { color: #6F3FF5; font-weight: 700; }
.side { width: 340px; flex: none; display: flex; flex-direction: column; justify-content: space-between; align-items: stretch; }
.cover { background: #F1ECFF; border-radius: 32px; padding: 36px 32px; }
.cover .v { font: 600 88px/1 'Baigi Num', 'Inter'; letter-spacing: -.02em; color: #14121A; white-space: nowrap; }
.cover .v.long { font-size: 64px; }
.cover .l { margin-top: 16px; font: 500 24px/1.3 'Inter'; color: #5B5866; }
.mascot { align-self: flex-end; width: 210px; }
.side.no-cover { justify-content: center; }
.side.no-cover .mascot { width: 300px; align-self: center; }
</style></head><body><div class="wrap">
  <div class="main">
    <div class="kicker"><i></i><span>${escape(kicker)}</span></div>
    <h1>${escape(a.title)}</h1>
    <div class="brand">baigi.com.br<b>/blog</b></div>
  </div>
  <div class="side${cover ? '' : ' no-cover'}">
    ${cover ? `<div class="cover"><div class="v${cover.value.length > 6 ? ' long' : ''}">${escape(cover.value)}</div><div class="l">${escape(cover.label)}</div></div>` : ''}
    <img class="mascot" src="${asset('public/landing/mascote/mascot-baigi.webp')}" alt="">
  </div>
</div></body></html>`
}

async function main() {
  const args = process.argv.slice(2)
  const all = args.includes('--todas')
  const only = new Set(args.filter(a => !a.startsWith('--')))
  const slugs = fs.readdirSync(contentDir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)).sort()
  const todo = slugs.filter(s => only.size ? only.has(s) : all || !fs.existsSync(path.join(outDir, `${s}.jpg`)))
  if (!todo.length) { console.log('Todas as capas existem (use --todas para refazer).'); return }
  fs.mkdirSync(outDir, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-capas-'))
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 } })
  for (const slug of todo) {
    const file = `content/blog/${slug}.md`
    const a = frontMatter(fs.readFileSync(path.join(root, file), 'utf8'), file)
    // A local file (not setContent): the fonts and the mascot load from file://
    const htmlFile = path.join(tmp, `${slug}.html`)
    fs.writeFileSync(htmlFile, html(a))
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(outDir, `${slug}.jpg`), type: 'jpeg', quality: 85 })
    console.log(`public/blog/capas/${slug}.jpg`)
  }
  await browser.close()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main()
