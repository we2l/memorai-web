// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

/**
 * Indexing (docs/research/seo-2026-11.md P0): the app's default head says `noindex` (the SPA shell answers 200 for any
 * URL, so a forgotten page would be a soft 404), and each public page opts in through useBlogSeo / INDEXABLE.
 * Forgetting the opt-in drops the page from Google: every public page is checked here, and the sitemap may only list
 * indexable ones.
 */
const PUBLIC = ['index.html', 'planos/index.html', 'ajuda/index.html', 'termos/index.html', 'privacidade/index.html', 'quem-faz/index.html', 'blog/index.html', 'ferramentas/index.html']
const PRIVATE = ['entrar/index.html', 'criar-conta/index.html', 'esqueci-senha/index.html', 'comecar/index.html']

const robots = (html: string) => [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map(m => m[1])

function page(path: string): string {
  const url = new URL(path)
  const rel = url.pathname === '/' ? 'index.html' : `${url.pathname.replace(/^\//, '')}/index.html`
  return readFileSync(join(PUBLIC_DIR, rel), 'utf8')
}

describe.skipIf(skipWithoutBuild)('indexação das páginas (build)', () => {
  it.each(PUBLIC)('%s: index, com canonical e um só h1', (file) => {
    const html = readFileSync(join(PUBLIC_DIR, file), 'utf8')
    expect(robots(html)).toEqual(['index, follow, max-image-preview:large'])
    expect(html.match(/rel="canonical" href="https:\/\/baigi\.com\.br\/[^"]*"/g)).toHaveLength(1)
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
  })

  it.each(PRIVATE)('%s: noindex', (file) => {
    expect(robots(readFileSync(join(PUBLIC_DIR, file), 'utf8'))).toEqual(['noindex, follow'])
  })

  it('o sitemap só lista páginas indexáveis', () => {
    const sitemap = readFileSync(join(PUBLIC_DIR, 'sitemap.xml'), 'utf8')
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]!)
    expect(urls.length).toBeGreaterThan(5)
    for (const url of urls) {
      expect(existsSync(join(PUBLIC_DIR, new URL(url).pathname === '/' ? 'index.html' : `${new URL(url).pathname.slice(1)}/index.html`)), url).toBe(true)
      expect(robots(page(url)), url).toEqual(['index, follow, max-image-preview:large'])
    }
  })

  it('cada artigo compartilha a própria imagem (og:image, twitter:image e o JSON-LD), não a genérica', () => {
    const html = readFileSync(join(PUBLIC_DIR, 'blog/caderno-de-erros-digital/index.html'), 'utf8')
    const image = 'https://baigi.com.br/blog/capas/caderno-de-erros-digital.jpg'
    expect(html).toContain(`<meta property="og:image" content="${image}"`)
    expect(html).toContain(`<meta name="twitter:image" content="${image}"`)
    expect(html).toContain(`"image":"${image}"`)
    expect(existsSync(join(PUBLIC_DIR, 'blog/capas/caderno-de-erros-digital.jpg'))).toBe(true)
  })

  it('a landing tem um título só, descrição curta e o JSON-LD da home', () => {
    const html = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8')
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    expect(h1).toBe('Chega de memória de peixe .')
    const description = html.match(/<meta name="description" content="([^"]*)"/)![1]!
    expect(description.length).toBeLessThanOrEqual(160)
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)![1]!)['@graph']
    expect(graph.map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite', 'SoftwareApplication'])
    // sameAs: only the brand's live profiles, never a person's (diretorios-perfis.md §9)
    expect(graph[0].sameAs).toEqual(['https://www.instagram.com/baigi.oficial/', 'https://www.tiktok.com/@baigi.oficial', 'https://www.youtube.com/@BaigiOficial'])
  })
})
