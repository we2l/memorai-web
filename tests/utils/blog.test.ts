import { describe, expect, it } from 'vitest'
import { articleJsonLd, blogStartPath, bucket, faqJsonLd, formatBlogDate, relatedArticles } from '~/utils/blog'
import { jsonLdScript } from '~/utils/seo'
import { BLOG_AUTHORS } from '~~/modules/blog/authors'
import type { BlogArticle, BlogMeta } from '~~/modules/blog/types'

const meta = (slug: string, extra: Partial<BlogMeta> = {}): BlogMeta => ({
  slug, title: slug, seoTitle: slug, description: 'd', category: 'concurso', area: 'concurso', author: 'weslley',
  published: '2026-11-08', updated: '2026-11-08', readingMinutes: 5, tags: [], image: null, summary: null, pillar: null, related: [], ...extra,
})

describe('utils/blog', () => {
  it('o link de começar leva à área com UTM do blog', () => {
    expect(blogStartPath('concurso', 'lei-seca', 'quiz')).toBe('/comecar/concurso?utm_source=blog&utm_medium=organic&utm_campaign=blog&utm_content=lei-seca-quiz')
    expect(blogStartPath(null, 'calc', 'tool')).toMatch(/^\/comecar\?utm_source=blog/)
  })

  it('formata a data em PT-BR sem Intl e agrupa números', () => {
    expect(formatBlogDate('2026-11-08')).toBe('8 de novembro de 2026')
    expect(bucket(0, [1, 7, 30])).toBe('<1')
    expect(bucket(10, [1, 7, 30])).toBe('7-29')
    expect(bucket(40, [1, 7, 30])).toBe('30+')
  })

  it('Article com autor, foto e datas; FAQPage; o JSON no <script> não fecha a tag', () => {
    const a = { ...meta('x'), toc: [], faq: [{ q: 'P?', a: 'R' }], segments: [], links: [] } as BlogArticle
    const ld = articleJsonLd(a, BLOG_AUTHORS.weslley!)
    expect(ld.author).toMatchObject({ '@type': 'Person', 'url': 'https://baigi.com.br/quem-faz', 'image': 'https://baigi.com.br/quem-faz/weslley.webp' })
    expect(ld.dateModified).toBe('2026-11-08')
    expect(faqJsonLd(a.faq).mainEntity[0]).toMatchObject({ name: 'P?', acceptedAnswer: { text: 'R' } })
    expect(jsonLdScript({ t: '</script>' })).not.toContain('</script>')
  })

  it('relacionados: pilar e related primeiro, depois a mesma categoria, sem o próprio', () => {
    const all = [meta('a'), meta('b', { category: 'metodo' }), meta('c'), meta('d', { category: 'oab' })]
    const r = relatedArticles({ slug: 'a', pillar: 'b', related: ['d'], category: 'concurso' }, all)
    expect(r.map(x => x.slug)).toEqual(['b', 'd', 'c'])
  })
})
