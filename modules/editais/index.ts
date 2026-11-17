/**
 * Conferred edital pages, prerendered (prd-paginas-edital-publicas §3.0, RF-W1..RF-W3): content/editais/<slug>.json,
 * one file per edital, written by `editais:public-curate --stdout` and completed by hand. Same pattern as modules/blog
 * (ADR-033): the build validates every file, makes the routes, the index and the sitemap entries; the page never asks
 * the API to exist (the API is only behind the actions: apply, lead and report, by the ULID of the file).
 *
 * - `#editais/index`: metadata of every page (no list) + the day of the build, for /editais and the links;
 * - `#editais/pages`: { slug: () => import(<slug>.json) }, one `once-*` chunk per edital;
 * - `#editais/footer`: whether the public footer links /editais (decision of 16/11: from 5 pages open);
 * - routeRules + prerender of /editais and /editais/<slug> only when there is at least one page: with none, nothing
 *   of /editais is published (no empty index, no footer link, nothing in the sitemap).
 *
 * The state of each page (open, exam past, cancelled) is computed on the day of the build (utils/editalStatus.ts):
 * the daily rebuild (.github/workflows/rebuild-diario.yml) takes a page past its exam out of the index and the sitemap.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { addTypeTemplate, addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { editalStatus, editalToday } from '../../app/utils/editalStatus'
import type { EditalPage, EditalPageMeta } from './types'
import { editalLastmod } from './lastmod'
import { checkEditalLinks, editalYear, validateEditalPage } from './validate'

export { editalLastmod }

/** Footer link "Editais conferidos" only from this many open pages (prd §8.2, decision 5) */
export const FOOTER_MIN_PAGES = 5
/** Fixture of the tests (EDITAIS_FIXTURES=1): never in a deploy */
export const FIXTURE_DIR = 'tests/fixtures/editais'

/** The day the build decides the states on: São Paulo today; EDITAIS_TODAY only outside Vercel (tests, visual check) */
export function buildDay(env: NodeJS.ProcessEnv = process.env): string {
  if (env.EDITAIS_TODAY && !env.VERCEL && /^\d{4}-\d{2}-\d{2}$/.test(env.EDITAIS_TODAY)) return env.EDITAIS_TODAY
  return editalToday()
}

/** content/editais, plus the fixture of the tests with EDITAIS_FIXTURES=1 (refused on Vercel: fake data never ships) */
export function editaisDirs(rootDir: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const dirs = [resolve(rootDir, 'content/editais')]
  if (env.EDITAIS_FIXTURES === '1') {
    if (env.VERCEL) throw new Error('EDITAIS_FIXTURES=1 num build da Vercel: o edital de teste nunca vai ao ar')
    dirs.push(resolve(rootDir, FIXTURE_DIR))
  }
  return dirs
}

export interface LoadedEdital { page: EditalPage, file: string }

export function loadEditais(dirs: string[], today: string, blogSlugs: ReadonlySet<string>): LoadedEdital[] {
  const loaded: LoadedEdital[] = []
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
      const file = join(dir, f)
      const label = `${dir.endsWith(FIXTURE_DIR) ? FIXTURE_DIR : 'content/editais'}/${f}`
      let raw: unknown
      try {
        raw = JSON.parse(readFileSync(file, 'utf8'))
      } catch {
        throw new Error(`${label}: JSON inválido`)
      }
      loaded.push({ page: validateEditalPage(raw, label, basename(f, '.json'), { today }), file })
    }
  }
  const slugs = loaded.map(l => l.page.slug)
  const dup = slugs.find((s, i) => slugs.indexOf(s) !== i)
  if (dup) throw new Error(`content/editais: o slug "${dup}" aparece duas vezes`)
  checkEditalLinks(loaded.map(l => l.page), blogSlugs)
  return loaded.sort((a, b) => a.page.slug.localeCompare(b.page.slug))
}


export function toEditalMeta(p: EditalPage): EditalPageMeta {
  return {
    id: p.id,
    slug: p.slug,
    group: p.group,
    area: p.area,
    year: editalYear(p.slug)!,
    orgao: p.edital.orgao,
    orgao_sigla: p.edital.orgao_sigla,
    cargo: p.edital.cargo,
    banca: p.edital.banca,
    prova: p.edital.prova,
    prova_prevista: !!p.edital.prova_prevista,
    inscricoes_inicio: p.edital.inscricoes_inicio,
    inscricoes_fim: p.edital.inscricoes_fim,
    expires_on: p.expires_on,
    status_override: p.status_override,
    status_date: p.status_date,
    checked_at: p.checked_at,
    lastmod: editalLastmod(p),
    topics: p.counts.topics,
    subjects: p.counts.subjects,
  }
}

/** Open on the day of the build: indexable and in the sitemap (R5.4) */
export function isIndexable(p: EditalPage, today: string): boolean {
  return editalStatus(p, today).open
}

export function editaisRoutes(pages: EditalPage[]): string[] {
  return pages.length ? ['/editais', ...pages.map(p => `/editais/${p.slug}`)] : []
}

/** Sitemap entries (RF-W2): /editais and every page open today, lastmod = the newest of checked_at and changes */
export function editaisSitemapEntries(pages: EditalPage[], today: string): { path: string, lastmod?: string }[] {
  const open = pages.filter(p => isIndexable(p, today))
  if (!pages.length) return []
  const index = { path: '/editais', lastmod: open.map(editalLastmod).sort().pop() }
  return [index, ...open.map(p => ({ path: `/editais/${p.slug}`, lastmod: editalLastmod(p) }))]
}

/** Paths a blog article may link to (RF-W2): a wrong slug fails the build */
export function editaisLinkable(pages: EditalPage[]): Set<string> {
  return new Set(editaisRoutes(pages))
}

export function showFooterLink(pages: EditalPage[], today: string): boolean {
  return pages.filter(p => isIndexable(p, today)).length >= FOOTER_MIN_PAGES
}

/** Slugs of content/blog (related_blog of an edital must exist) */
export function blogSlugsOf(rootDir: string): Set<string> {
  const dir = resolve(rootDir, 'content/blog')
  return new Set(existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md')).map(f => basename(f, '.md')) : [])
}

/** Everything the build needs, loaded once (modules/blog calls it too, for the sitemap and the links) */
export function editaisOfBuild(rootDir: string): { loaded: LoadedEdital[], pages: EditalPage[], today: string } {
  const today = buildDay()
  const loaded = loadEditais(editaisDirs(rootDir), today, blogSlugsOf(rootDir))
  return { loaded, pages: loaded.map(l => l.page), today }
}

export default defineNuxtModule({
  meta: { name: 'baigi-editais' },
  setup(_options, nuxt) {
    const { loaded, pages, today } = editaisOfBuild(nuxt.options.rootDir)

    if (pages.length) {
      // Prerendered HTML with the whole list (RF-W3); unknown slugs stay with the 404 of the page
      nuxt.options.routeRules = {
        ...nuxt.options.routeRules,
        '/editais': { ssr: true, prerender: true },
        '/editais/**': { ssr: true, prerender: true },
      }
      nuxt.options.nitro.prerender ??= {}
      nuxt.options.nitro.prerender.routes = [...(nuxt.options.nitro.prerender.routes ?? []), ...editaisRoutes(pages)]
    }

    const here = fileURLToPath(new URL('.', import.meta.url))
    const INDEX = '#editais/index'
    const PAGES = '#editais/pages'
    const FOOTER = '#editais/footer'
    addVitePlugin({
      name: 'baigi-editais',
      enforce: 'pre',
      resolveId(id) {
        if (id === INDEX || id === PAGES || id === FOOTER) return `\0${id}`
      },
      load(id) {
        if (id === `\0${INDEX}`) return `export const editais = ${JSON.stringify(pages.map(toEditalMeta))}\nexport const builtOn = ${JSON.stringify(today)}\n`
        if (id === `\0${FOOTER}`) return `export const showEditaisLink = ${JSON.stringify(showFooterLink(pages, today))}\n`
        if (id === `\0${PAGES}`) {
          const entries = loaded.map(l => `  ${JSON.stringify(l.page.slug)}: () => import(${JSON.stringify(l.file)})`)
          return `export default {\n${entries.join(',\n')}\n}\n`
        }
      },
    })

    addTypeTemplate({
      filename: 'types/editais.d.ts',
      getContents: () => [
        `declare module '#editais/index' {`,
        `  export const editais: import('${resolve(here, 'types')}').EditalPageMeta[]`,
        `  export const builtOn: string`,
        `}`,
        `declare module '#editais/pages' {`,
        `  const loaders: Record<string, () => Promise<{ default: import('${resolve(here, 'types')}').EditalPage }>>`,
        `  export default loaders`,
        `}`,
        `declare module '#editais/footer' {`,
        `  export const showEditaisLink: boolean`,
        `}`,
      ].join('\n'),
    })
  },
})
