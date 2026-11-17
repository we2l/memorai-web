// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

/**
 * Conferred edital pages in the build (prd-paginas-edital-publicas RF-W1..RF-W3, RF-W8, R5.4). The CI web job builds
 * with content/editais as it is (empty until the first curated edital): then nothing of /editais is published. A build
 * with EDITAIS_FIXTURES=1 (the screens job, or by hand) has the fictitious page of tests/fixtures/editais.
 */
const FIXTURE = 'editais/tex-2026-analista-de-teste/index.html'
const contentDir = resolve(__dirname, '../../content/editais')
const published = existsSync(contentDir) && readdirSync(contentDir).some(f => f.endsWith('.json'))
const withFixture = !skipWithoutBuild && existsSync(join(PUBLIC_DIR, FIXTURE))
const read = (rel: string) => readFileSync(join(PUBLIC_DIR, rel), 'utf8')
const precached = () => [...read('sw.js').matchAll(/url:"([^"]+)"/g)].map(m => m[1]!)

describe.skipIf(skipWithoutBuild)('páginas de edital no build', () => {
  it.skipIf(published || withFixture)('sem edital conferido não publica índice, página, sitemap nem link no rodapé', () => {
    expect(existsSync(join(PUBLIC_DIR, 'editais'))).toBe(false)
    expect(read('sitemap.xml')).not.toContain('/editais')
    expect(read('ferramentas/index.html')).not.toContain('href="/editais"')
  })

  it.skipIf(!withFixture)('a página traz a lista aberta, index, canonical, um h1 e o JSON-LD WebPage + BreadcrumbList', () => {
    const html = read(FIXTURE)
    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large">')
    expect(html).toContain('<link rel="canonical" href="https://baigi.com.br/editais/tex-2026-analista-de-teste">')
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(html).toContain('Correio eletrônico')
    expect(html).not.toMatch(/class="[^"]*edital-closed/)
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)![1]!)['@graph']
    expect(graph.map((n: { '@type': string }) => n['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(graph[0].about['@type']).toBe('GovernmentOrganization')
    expect(read('sitemap.xml')).toContain('<loc>https://baigi.com.br/editais/tex-2026-analista-de-teste</loc>')
  })

  it.skipIf(!withFixture)('nada de /editais entra no precache do PWA', () => {
    const urls = precached()
    expect(urls.filter(u => u.startsWith('editais/'))).toEqual([])
    const nuxtDir = join(PUBLIC_DIR, '_nuxt')
    const holders = readdirSync(nuxtDir).filter(f => f.endsWith('.js') && /edital-page-status|tex-2026-analista-de-teste/.test(readFileSync(join(nuxtDir, f), 'utf8')))
    expect(holders.length).toBeGreaterThan(0)
    expect(holders.filter(f => !f.startsWith('once-'))).toEqual([])
    expect(urls.filter(u => holders.some(h => u.endsWith(h)))).toEqual([])
  })
})
