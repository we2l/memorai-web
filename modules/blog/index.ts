/**
 * Blog and free tools, prerendered (prd-blog-seo, ADR-033). Why not @nuxt/content: v3 answers client-side
 * navigation by downloading a SQLite (WASM) dump into the browser; this app is an SPA with a precache budget, and
 * the blog needs only static articles. Here the Markdown is turned into HTML at build time (marked, already a dep)
 * and each article becomes its own lazy chunk; the browser never parses Markdown.
 *
 * - `#blog/index`: metadata of every article (no HTML) + authors, for /blog, the author page and related links;
 * - `#blog/articles`: { slug: () => import(article.md) }, one chunk per article (`once-*`, out of the precache);
 * - prerender routes for /blog/**, /ferramentas/** and the author pages; sitemap.xml and /blog/rss.xml.
 * A broken internal link, an unknown author, a bad front matter or a missing share image fails the build.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { addTypeTemplate, addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { BLOG_AUTHORS } from './authors'
import { BLOG_CATEGORIES, BLOG_TOOLS, parseArticle, toMeta, type BlogArticle } from './markdown'

export const SITE_URL = 'https://baigi.com.br'

/**
 * Public pages that go into the sitemap besides the blog (the prerendered marketing pages). /termos and /privacidade
 * stay indexable but out of it (no search intent). No lastmod here: Vercel clones shallow, so a date from git would be
 * wrong, and Google ignores lastmod that is not consistently accurate.
 */
const STATIC_PAGES = ['/', '/planos', '/quem-faz', '/ajuda']
/** Pages of the blog that are not articles (app/pages/blog/*.vue): reserved slugs, prerendered and in the sitemap */
const BLOG_PAGES = ['sobre']
/** Folders of public/blog (the share images): an article with this slug would collide with them */
const BLOG_ASSET_DIRS = ['capas']
/** Tools that are not in an article (no embed): their page lives in app/pages/ferramentas, prerendered and in the sitemap */
const STANDALONE_TOOLS = ['edital-verticalizado']
/** Internal paths an article may link to besides /blog/** and /ferramentas/** */
const LINKABLE = /^\/(|planos|ajuda|quem-faz|criar-conta|entrar|comecar(\/(concurso|enem|medicina|oab|ingles|faculdade))?)$/

function xml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * The share image of each article (og:image, twitter:image, Article JSON-LD): public/blog/capas/<slug>.jpg, 1200×675,
 * made by scripts/blog-capas.mjs and committed (Google asks Discover for a large image that is not generic). An
 * `image:` in the front matter wins; an article with neither fails the build, so a new article never ships with
 * the generic image of the site.
 */
export function attachShareImages(articles: BlogArticle[], publicDir: string): void {
  for (const a of articles) {
    if (a.image) continue
    const rel = `/blog/capas/${a.slug}.jpg`
    if (!existsSync(join(publicDir, rel))) {
      throw new Error(`content/blog/${a.slug}.md: falta a imagem de compartilhamento public${rel}. Rode: node scripts/blog-capas.mjs ${a.slug}`)
    }
    a.image = rel
  }
}

export function loadArticles(dir: string): BlogArticle[] {
  const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort()
  const articles = files.map(f => parseArticle(readFileSync(join(dir, f), 'utf8'), `content/blog/${f}`, basename(f, '.md')))
  const slugs = new Set(articles.map(a => a.slug))
  for (const reserved of [...BLOG_PAGES, ...BLOG_ASSET_DIRS]) {
    if (slugs.has(reserved)) throw new Error(`content/blog/${reserved}.md: o slug "${reserved}" é de uma página do blog (/blog/${reserved})`)
  }
  const tools = new Set<string>([...BLOG_TOOLS, ...STANDALONE_TOOLS])
  const featured = articles.filter(a => a.featured)
  if (featured.length > 1) throw new Error(`featured: true em mais de um artigo (${featured.map(a => a.slug).join(', ')}); o destaque do /blog é um só`)
  for (const a of articles) {
    if (!BLOG_AUTHORS[a.author]) throw new Error(`content/blog/${a.slug}.md: autor desconhecido "${a.author}" (modules/blog/authors.ts)`)
    for (const ref of [a.pillar, ...a.related].filter(Boolean) as string[]) {
      if (!slugs.has(ref)) throw new Error(`content/blog/${a.slug}.md: pillar/related aponta para "${ref}", que não existe`)
    }
    for (const link of a.links) {
      const blog = link.match(/^\/blog\/([a-z0-9-]+)$/)
      const tool = link.match(/^\/ferramentas\/([a-z0-9-]+)$/)
      const ok = link === '/blog' || (blog && BLOG_PAGES.includes(blog[1]!)) || link === '/ferramentas' || (blog && slugs.has(blog[1]!)) || (tool && tools.has(tool[1]!)) || LINKABLE.test(link)
      if (!ok) throw new Error(`content/blog/${a.slug}.md: link interno quebrado "${link}"`)
    }
  }
  return articles.sort((x, y) => y.published.localeCompare(x.published) || x.slug.localeCompare(y.slug))
}

export function blogRoutes(articles: BlogArticle[]): string[] {
  return [
    '/blog',
    ...BLOG_PAGES.map(p => `/blog/${p}`),
    ...articles.map(a => `/blog/${a.slug}`),
    '/ferramentas',
    ...[...BLOG_TOOLS, ...STANDALONE_TOOLS].map(t => `/ferramentas/${t}`),
  ]
}

export function sitemapXml(articles: BlogArticle[]): string {
  const latest = articles.map(a => a.updated).sort().pop()
  const byPath = new Map<string, string | undefined>()
  for (const p of STATIC_PAGES) byPath.set(p, undefined)
  for (const r of blogRoutes(articles)) byPath.set(r, r === '/blog' ? latest : undefined)
  for (const a of articles) byPath.set(`/blog/${a.slug}`, a.updated)
  const urls = [...byPath].map(([path, lastmod]) =>
    `  <url><loc>${SITE_URL}${path === '/' ? '/' : path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export function rssXml(articles: BlogArticle[]): string {
  const items = articles.map(a => [
    '    <item>',
    `      <title>${xml(a.title)}</title>`,
    `      <link>${SITE_URL}/blog/${a.slug}</link>`,
    `      <guid isPermaLink="true">${SITE_URL}/blog/${a.slug}</guid>`,
    `      <pubDate>${new Date(`${a.published}T12:00:00Z`).toUTCString()}</pubDate>`,
    `      <category>${xml(BLOG_CATEGORIES[a.category])}</category>`,
    `      <description>${xml(a.description)}</description>`,
    '    </item>',
  ].join('\n'))
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Blog do Baigi</title>\n    <link>${SITE_URL}/blog</link>\n    <description>Como estudar e lembrar na prova: repetição espaçada, revisão e métodos com fonte.</description>\n    <language>pt-BR</language>\n${items.join('\n')}\n  </channel>\n</rss>\n`
}

export default defineNuxtModule({
  meta: { name: 'baigi-blog' },
  setup(_options, nuxt) {
    const contentDir = resolve(nuxt.options.rootDir, 'content/blog')
    const articles = loadArticles(contentDir)
    const publicDir = resolve(nuxt.options.rootDir, 'public')
    attachShareImages(articles, publicDir)
    const metas = articles.map(toMeta)

    // Prerender: the routes are known at build time (no crawler guessing)
    nuxt.options.nitro.prerender ??= {}
    nuxt.options.nitro.prerender.routes = [...(nuxt.options.nitro.prerender.routes ?? []), ...blogRoutes(articles)]

    // sitemap.xml and /blog/rss.xml written into the public output of the build (served as static files)
    nuxt.hook('nitro:build:public-assets', (nitro) => {
      const dir = nitro.options.output.publicDir
      mkdirSync(join(dir, 'blog'), { recursive: true })
      writeFileSync(join(dir, 'sitemap.xml'), sitemapXml(articles))
      writeFileSync(join(dir, 'blog/rss.xml'), rssXml(articles))
    })

    const here = fileURLToPath(new URL('.', import.meta.url))
    const INDEX = '#blog/index'
    const ARTICLES = '#blog/articles'
    addVitePlugin({
      name: 'baigi-blog',
      enforce: 'pre',
      resolveId(id) {
        if (id === INDEX || id === ARTICLES) return `\0${id}`
      },
      load(id) {
        if (id === `\0${INDEX}`) {
          return `export const articles = ${JSON.stringify(metas)}\nexport const authors = ${JSON.stringify(BLOG_AUTHORS)}\n`
        }
        if (id === `\0${ARTICLES}`) {
          const entries = articles.map(a => `  ${JSON.stringify(a.slug)}: () => import(${JSON.stringify(join(contentDir, `${a.slug}.md`))})`)
          return `export default {\n${entries.join(',\n')}\n}\n`
        }
      },
      transform(code, id) {
        if (!id.startsWith(contentDir) || !id.endsWith('.md')) return
        const article = parseArticle(code, `content/blog/${basename(id)}`, basename(id, '.md'))
        attachShareImages([article], publicDir)
        return { code: `export default ${JSON.stringify(article)}\n`, map: null }
      },
    })

    addTypeTemplate({
      filename: 'types/blog.d.ts',
      getContents: () => [
        `declare module '#blog/index' {`,
        `  export const articles: import('${resolve(here, 'types')}').BlogMeta[]`,
        `  export const authors: Record<string, import('${resolve(here, 'authors')}').BlogAuthor>`,
        `}`,
        `declare module '#blog/articles' {`,
        `  const loaders: Record<string, () => Promise<{ default: import('${resolve(here, 'types')}').BlogArticle }>>`,
        `  export default loaders`,
        `}`,
      ].join('\n'),
    })
  },
})
