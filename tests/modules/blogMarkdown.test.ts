// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseArticle, slugify } from '../../modules/blog/markdown'
import { blogRoutes, loadArticles, rssXml, sitemapXml } from '../../modules/blog/index'

const FRONT = `---
title: Como revisar lei seca
description: Um teste.
summary: Resposta curta.
category: concurso
area: concurso
author: weslley
published: 2026-11-08
tags: lei, inss
---
`

function doc(body: string, front = FRONT) {
  return `${front}${body}`
}

describe('parseArticle (prd-blog-seo RF-B1..B4)', () => {
  it('lê o front matter, monta o sumário pelos ## e o FAQ pela seção de perguntas', () => {
    const a = parseArticle(doc(`Intro.

## Por que esquecemos?
Texto com [link](/blog/outro) e [fora](https://exemplo.com).

### Detalhe
Mais.

## Perguntas frequentes
### Quanto tempo leva?
Uns minutos por dia.

### Precisa de conta?
Não.
`), 'x.md', 'como-revisar')
    expect(a.title).toBe('Como revisar lei seca')
    expect(a.updated).toBe('2026-11-08')
    expect(a.tags).toEqual(['lei', 'inss'])
    expect(a.toc).toEqual([{ id: 'por-que-esquecemos', title: 'Por que esquecemos?' }, { id: 'perguntas-frequentes', title: 'Perguntas frequentes' }])
    expect(a.faq).toEqual([{ q: 'Quanto tempo leva?', a: 'Uns minutos por dia.' }, { q: 'Precisa de conta?', a: 'Não.' }])
    expect(a.links).toEqual(['/blog/outro'])
    const html = a.segments.map(s => (s.kind === 'html' ? s.html : '')).join('')
    expect(html).toContain('<h2 id="por-que-esquecemos">')
    expect(html).toContain('rel="noopener" target="_blank"')
  })

  it('separa os blocos embutidos em segmentos', () => {
    const a = parseArticle(doc(`Antes.

\`\`\`card
{"q": "Frente?", "a": "Verso.", "source": "Lei X"}
\`\`\`

Meio.

\`\`\`quiz
{"area": "concurso", "cards": [{"q": "1?", "a": "a"}, {"q": "2?", "a": "b"}, {"q": "3?", "a": "c"}]}
\`\`\`

\`\`\`tool
{"tool": "plano-ate-a-prova"}
\`\`\`

\`\`\`shot
{"shot": "revisao", "caption": "Tela real"}
\`\`\`
`), 'x.md', 'x')
    expect(a.segments.map(s => s.kind)).toEqual(['html', 'card', 'html', 'quiz', 'tool', 'shot'])
  })

  it.each([
    ['H1 no texto', '# Título'],
    ['HTML cru', '<div>oi</div>'],
    ['quiz com 2 cards', '```quiz\n{"area":"concurso","cards":[{"q":"1","a":"a"},{"q":"2","a":"b"}]}\n```'],
    ['área desconhecida', '```cta\n{"area":"marte","text":"x"}\n```'],
    ['JSON inválido', '```cta\n{area}\n```'],
    ['ferramenta desconhecida', '```tool\n{"tool":"x"}\n```'],
    ['link relativo', '[a](outra-pagina)'],
  ])('reprova %s', (_why, body) => {
    expect(() => parseArticle(doc(body), 'x.md', 'x')).toThrow()
  })

  it('reprova front matter sem campo obrigatório e slug inválido', () => {
    expect(() => parseArticle(doc('Oi', FRONT.replace('category: concurso\n', '')), 'x.md', 'x')).toThrow(/category/)
    expect(() => parseArticle(doc('Oi'), 'x.md', 'Com Espaço')).toThrow(/slug/)
  })

  it('slugify tira acento e pontuação', () => {
    expect(slugify('Como funciona a repetição espaçada?')).toBe('como-funciona-a-repeticao-espacada')
  })
})

describe('loadArticles, sitemap e RSS', () => {
  let dir = ''
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  it('reprova link interno quebrado', () => {
    dir = mkdtempSync(join(resolve(__dirname, '../../.nuxt'), 'blog-test-'))
    writeFileSync(join(dir, 'a.md'), doc('Veja [b](/blog/nao-existe).'))
    expect(() => loadArticles(dir)).toThrow(/link interno quebrado/)
  })

  it('os artigos do repo carregam e entram no sitemap, no RSS e nas rotas', () => {
    const articles = loadArticles(resolve(__dirname, '../../content/blog'))
    expect(articles.length).toBeGreaterThanOrEqual(3)
    const sitemap = sitemapXml(articles)
    for (const a of articles) {
      expect(sitemap).toContain(`<loc>https://baigi.com.br/blog/${a.slug}</loc><lastmod>${a.updated}</lastmod>`)
      expect(rssXml(articles)).toContain(`<link>https://baigi.com.br/blog/${a.slug}</link>`)
    }
    expect(sitemap).toContain('<loc>https://baigi.com.br/quem-faz</loc>')
    expect(sitemap).toContain('<loc>https://baigi.com.br/ferramentas/calculadora-do-esquecimento</loc>')
    expect(blogRoutes(articles)).toContain('/ferramentas/plano-ate-a-prova')
  })
})
