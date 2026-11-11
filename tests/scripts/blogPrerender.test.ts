// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

// prd-blog-seo RF-B5, RF-S1, RF-P1: the blog is HTML with the text, not an SPA shell, and stays out of the precache
const ARTICLES = ['curva-do-esquecimento', 'como-revisar-lei-seca-inss', 'alternativa-ao-anki']
const PAGES = ['blog', 'blog/sobre', ...ARTICLES.map(a => `blog/${a}`), 'ferramentas', 'ferramentas/calculadora-do-esquecimento', 'ferramentas/plano-ate-a-prova', 'quem-faz']
const read = (page: string) => readFileSync(join(PUBLIC_DIR, page, 'index.html'), 'utf8')
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]!))

describe.skipIf(skipWithoutBuild)('blog pré-renderizado (build)', () => {
  it.each(PAGES)('%s tem HTML com h1, canonical e descrição', (page) => {
    const html = read(page)
    expect(html).toMatch(/<h1[^>]*>[^<]+/)
    expect(html).toContain(`<link rel="canonical" href="https://baigi.com.br/${page}">`)
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/)
    expect(html).toMatch(/<meta property="og:url" content="https:\/\/baigi\.com\.br\//)
  })

  it.each(ARTICLES)('o artigo %s traz o texto inteiro, Article, BreadcrumbList e FAQPage', (slug) => {
    const html = read(`blog/${slug}`)
    expect(html).toContain('data-testid="blog-article"')
    expect(html).toContain('data-testid="blog-quiz"')
    expect(html).toContain('href="/comecar/')
    const types = jsonLd(html).map(d => d['@type'])
    expect(types).toEqual(expect.arrayContaining(['Article', 'BreadcrumbList', 'FAQPage']))
    const article = jsonLd(html).find(d => d['@type'] === 'Article')
    // Signed by the brand (prd-blog-v2 RF-A3): no person's name, photo or Person in the blog
    expect(article.author).toMatchObject({ '@type': 'Organization', 'name': 'Baigi' })
    expect(html).not.toMatch(/Weslley|weslley\.webp/)
    expect(html).toContain('href="/blog/sobre"')
    // The body is in the HTML, not only in a JS chunk: more than 1.000 words of text
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
    expect(text.split(/\s+/).filter(Boolean).length).toBeGreaterThan(1000)
  })

  it('quem-faz tem Person e Organization, a foto real, só "Weslley Araujo" e nenhum CPF', () => {
    const html = read('quem-faz')
    const types = jsonLd(html).map(d => d['@type'])
    expect(types).toEqual(expect.arrayContaining(['AboutPage', 'Organization']))
    expect(html).toContain('/quem-faz/weslley.webp')
    expect(html).toContain('Weslley Araujo')
    expect(html).not.toContain('Sousa Leite')
    expect(html).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/)
  })

  it('blog/sobre: AboutPage e Organization, sem nome nem foto de pessoa', () => {
    const html = read('blog/sobre')
    const types = jsonLd(html).map(d => d['@type'])
    expect(types).toEqual(expect.arrayContaining(['AboutPage', 'Organization']))
    expect(types).not.toContain('Person')
    expect(html).not.toMatch(/Weslley|weslley\.webp|Equipe|equipe/)
  })

  it('sitemap.xml, rss e robots apontam para as páginas', () => {
    const sitemap = readFileSync(join(PUBLIC_DIR, 'sitemap.xml'), 'utf8')
    for (const p of PAGES) expect(sitemap).toContain(`<loc>https://baigi.com.br/${p}</loc>`)
    expect(readFileSync(join(PUBLIC_DIR, 'blog/rss.xml'), 'utf8')).toContain('<rss version="2.0">')
    expect(readFileSync(join(PUBLIC_DIR, 'robots.txt'), 'utf8')).toContain('Sitemap: https://baigi.com.br/sitemap.xml')
  })

  it('nada do blog entra no precache do PWA', () => {
    const urls = [...readFileSync(join(PUBLIC_DIR, 'sw.js'), 'utf8').matchAll(/url:"([^"]+)"/g)].map(m => m[1]!)
    expect(urls.filter(u => /^(blog|ferramentas|quem-faz)\/|sitemap|blog-prose/.test(u))).toEqual([])
    const nuxtDir = join(PUBLIC_DIR, '_nuxt')
    const holders = readdirSync(nuxtDir).filter(f => f.endsWith('.js') && /data-testid":"(blog-quiz|tool-plan|tool-forgetting)"/.test(readFileSync(join(nuxtDir, f), 'utf8')))
    expect(holders.length).toBeGreaterThan(0)
    expect(holders.filter(f => !f.startsWith('once-'))).toEqual([])
    expect(urls.filter(u => holders.some(h => u.endsWith(h)))).toEqual([])
    expect(existsSync(join(PUBLIC_DIR, 'quem-faz/weslley.avif'))).toBe(true)
  })
})
