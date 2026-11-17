// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { editaisDirs, editaisRoutes, editaisSitemapEntries, FIXTURE_DIR, loadEditais, showFooterLink, toEditalMeta } from '../../modules/editais/index'
import { proposalSha256, validateEditalPage } from '../../modules/editais/validate'
import { loadArticles, sitemapXml } from '../../modules/blog/index'
import type { EditalPage } from '../../modules/editais/types'

const ROOT = resolve(__dirname, '../..')
const FIXTURE_FILE = join(ROOT, FIXTURE_DIR, 'tex-2026-analista-de-teste.json')
const fixture = (): EditalPage => JSON.parse(readFileSync(FIXTURE_FILE, 'utf8'))
const TODAY = '2026-11-17'
const blog = new Set(['o-que-e-edital-verticalizado'])
const check = (p: unknown, slug = 'tex-2026-analista-de-teste') => validateEditalPage(p, 'x.json', slug, { today: TODAY })

const dirs: string[] = []
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }) })
function dirWith(pages: EditalPage[]): string {
  const d = mkdtempSync(join(tmpdir(), 'editais-'))
  dirs.push(d)
  for (const p of pages) writeFileSync(join(d, `${p.slug}.json`), JSON.stringify(p))
  return d
}

describe('validateEditalPage (prd-paginas-edital-publicas RF-W1)', () => {
  it('a fixture passa e o sha é o do JSON canônico com as chaves ordenadas (o mesmo da API)', () => {
    expect(() => check(fixture())).not.toThrow()
    // Key order does not change the hash
    const p = fixture().proposal
    expect(proposalSha256({ subjects: p.subjects, exam_date: p.exam_date, name: p.name })).toBe(fixture().proposal_sha256)
  })

  it.each([
    ['nome do arquivo diferente do slug', (p: EditalPage) => p, 'outro-2026-x', /nome do arquivo/],
    ['campo obrigatório nulo', (p: EditalPage) => { p.edital.banca = null as never; return p }, undefined, /edital\.banca é obrigatório/],
    ['data fora do ISO', (p: EditalPage) => { p.edital.prova = '14/03/2099'; return p }, undefined, /edital\.prova não é uma data/],
    ['inscrições depois da prova', (p: EditalPage) => { p.edital.inscricoes_fim = '2099-04-01'; return p }, undefined, /inscricoes_fim cai depois da prova/],
    ['checked_at no futuro', (p: EditalPage) => { p.checked_at = '2026-11-18'; return p }, undefined, /no futuro/],
    ['source_url sem https', (p: EditalPage) => { p.source_url = 'http://example.com/x.pdf'; return p }, undefined, /https/],
    ['sem prova e sem expires_on', (p: EditalPage) => { p.edital.prova = null; delete p.edital.paginas.prova; return p }, undefined, /dia de vencimento/],
    ['lista editada à mão (sha)', (p: EditalPage) => { p.proposal.subjects[0]!.topics[0]!.name = 'Outro'; return p }, undefined, /proposal_sha256 não bate/],
    ['matéria vazia', (p: EditalPage) => { p.proposal.subjects[0]!.topics = []; return p }, undefined, /está vazia/],
    ['dado sem a página do edital', (p: EditalPage) => { delete p.edital.paginas.vagas; return p }, undefined, /vagas sem a página/],
    ['peso de matéria que não está na lista', (p: EditalPage) => { p.weights![0]!.subject = 'Física'; return p }, undefined, /weights cita/],
  ])('reprova: %s', (_name, mutate, slug, error) => {
    expect(() => check(mutate(fixture()), slug)).toThrow(error)
  })

  it('reprova acima dos tetos (41 matérias)', () => {
    const p = fixture()
    p.proposal.subjects = Array.from({ length: 41 }, (_, i) => ({ name: `M${i}`, topics: [{ name: 'a', description: null }] }))
    p.counts = { subjects: 41, topics: 41 }
    p.proposal_sha256 = proposalSha256(p.proposal)
    p.weights = null
    expect(() => check(p)).toThrow(/mais de 40 matérias/)
  })
})

describe('loadEditais, rotas e sitemap', () => {
  it('sem nenhum edital não publica nada de /editais', () => {
    const pages = loadEditais([dirWith([])], TODAY, blog).map(l => l.page)
    expect(editaisRoutes(pages)).toEqual([])
    expect(editaisSitemapEntries(pages, TODAY)).toEqual([])
    expect(showFooterLink(pages, TODAY)).toBe(false)
    expect(sitemapXml([], editaisSitemapEntries(pages, TODAY))).not.toContain('/editais')
  })

  it('aberto entra no sitemap com o lastmod de changes; vencido sai mas a rota continua', () => {
    const pages = loadEditais([dirWith([fixture()])], TODAY, blog).map(l => l.page)
    expect(editaisRoutes(pages)).toEqual(['/editais', '/editais/tex-2026-analista-de-teste'])
    expect(editaisSitemapEntries(pages, TODAY)).toEqual([
      { path: '/editais', lastmod: '2026-11-16' },
      { path: '/editais/tex-2026-analista-de-teste', lastmod: '2026-11-16' },
    ])
    expect(editaisSitemapEntries(pages, '2099-03-15')).toEqual([{ path: '/editais', lastmod: undefined }])
    expect(toEditalMeta(pages[0]!)).toMatchObject({ year: '2026', orgao_sigla: 'TEX', topics: 14, lastmod: '2026-11-16' })
  })

  it('o rodapé só linka a partir de 5 páginas abertas', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...fixture(), slug: `tex-2026-cargo-${i}`, edital: { ...fixture().edital, cargo: `Cargo ${i}` } }))
    const pages = loadEditais([dirWith(many)], TODAY, blog).map(l => l.page)
    expect(showFooterLink(pages, TODAY)).toBe(true)
    expect(showFooterLink(pages.slice(0, 4), TODAY)).toBe(false)
  })

  it('links entre arquivos: sibling, related_blog e grupo + cargo repetido reprovam', () => {
    expect(() => loadEditais([dirWith([{ ...fixture(), siblings: ['nao-existe-2026-x'] }])], TODAY, blog)).toThrow(/siblings/)
    expect(() => loadEditais([dirWith([fixture()])], TODAY, new Set())).toThrow(/related_blog/)
    const a = { ...fixture(), group: 'tex-2026' }
    const b = { ...fixture(), slug: 'tex-2026-outro', group: 'tex-2026' }
    expect(() => loadEditais([dirWith([a, b])], TODAY, blog)).toThrow(/já tem uma página do cargo/)
  })

  it('a fixture só entra com EDITAIS_FIXTURES=1 e nunca na Vercel', () => {
    expect(editaisDirs(ROOT, {})).toHaveLength(1)
    expect(editaisDirs(ROOT, { EDITAIS_FIXTURES: '1' })).toHaveLength(2)
    expect(() => editaisDirs(ROOT, { EDITAIS_FIXTURES: '1', VERCEL: '1' })).toThrow(/nunca vai ao ar/)
  })

  it('um artigo pode linkar a página de um edital que existe; slug errado reprova', () => {
    const d = mkdtempSync(join(tmpdir(), 'blog-'))
    dirs.push(d)
    const art = (link: string) => `---\ntitle: T\ndescription: D.\nsummary: S.\ncategory: concurso\narea: concurso\nauthor: baigi\npublished: 2026-11-08\ntags: a\n---\nVeja [a lista](${link}).\n`
    writeFileSync(join(d, 'a.md'), art('/editais/tex-2026-analista-de-teste'))
    expect(() => loadArticles(d, new Set(['/editais', '/editais/tex-2026-analista-de-teste']))).not.toThrow()
    expect(() => loadArticles(d)).toThrow(/link interno quebrado/)
  })
})

describe('scripts/editais-merge.mjs', () => {
  it('troca só o que vem da API e mantém o preenchido à mão', async () => {
    // @ts-ignore plain .mjs script, no types
    const { mergeEdital } = await import('../../scripts/editais-merge.mjs')
    const current = fixture()
    const exported = { ...fixture(), proposal_sha256: 'novo', counts: { subjects: 1, topics: 1 }, edital: { orgao: null }, related_blog: [], changes: [] }
    const merged = mergeEdital(current, exported)
    expect(merged.proposal_sha256).toBe('novo')
    expect(merged.counts).toEqual({ subjects: 1, topics: 1 })
    expect(merged.edital).toEqual(current.edital)
    expect(merged.related_blog).toEqual(current.related_blog)
    expect(merged.changes).toEqual(current.changes)
    expect(mergeEdital(null, exported)).toBe(exported)
    expect(() => mergeEdital(current, { ...exported, slug: 'outro-2026-x' })).toThrow(/slug/)
  })
})
