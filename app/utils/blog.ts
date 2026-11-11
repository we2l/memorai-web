/**
 * Pure helpers of the blog and the tools (prd-blog-seo RF-S1, RF-A1): the start link with UTM, dates in PT-BR and the
 * structured data. No Vue here, so tests/utils/blog.test.ts covers them.
 */
import { BLOG_CATEGORIES, type BlogArea, type BlogArticle, type BlogMeta } from '~~/modules/blog/types'
import type { BlogAuthor } from '~~/modules/blog/authors'

import { PUBLISHER, SITE_NAME, SITE_URL } from '~/utils/seo'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/landing/og-baigi.jpg`

export type BlogCtaPosition = 'inline' | 'quiz' | 'end' | 'tool'
export type BlogTool = 'calculadora-do-esquecimento' | 'plano-ate-a-prova'

/** Area labels for the call ("Continuar com 6 cards de {label}") */
export const AREA_LABEL: Record<BlogArea, string> = {
  concurso: 'concurso',
  enem: 'ENEM',
  medicina: 'medicina',
  oab: 'OAB',
  ingles: 'inglês',
  faculdade: 'faculdade',
}

/**
 * The visitor's mini-lote of the area (prd-onboarding-v4, /comecar/{area}); without an area, the area picker.
 * The only place that knows the route: if the onboarding moves, change it here.
 */
export function blogStartPath(area: BlogArea | null, content: string, position: BlogCtaPosition): string {
  const params = new URLSearchParams({ utm_source: 'blog', utm_medium: 'organic', utm_campaign: 'blog', utm_content: `${content}-${position}` })
  return `${area ? `/comecar/${area}` : '/comecar'}?${params.toString()}`
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** 2026-11-08 → "8 de novembro de 2026" (no Intl: same text on the server and in the browser) */
export function formatBlogDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MONTHS[(m ?? 1) - 1]} de ${y}`
}

const SHORT_MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
/** 2026-11-08 → "8 nov. 2026" (cards of the index) */
export function formatBlogDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${SHORT_MONTHS[(m ?? 1) - 1]} ${y}`
}

/** The highlight of /blog: the `featured: true` article or, without one, the newest (the list comes newest first) */
export function featuredArticle<T extends Pick<BlogMeta, 'featured'>>(all: T[]): T | undefined {
  return all.find(a => a.featured) ?? all[0]
}

export function categoryLabel(category: BlogMeta['category']): string {
  return BLOG_CATEGORIES[category]
}

export function absoluteUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

/** The hidden bucket of a number for the analytics (RN-6: never the exact input) */
export function bucket(n: number, edges: number[]): string {
  for (let i = 0; i < edges.length; i++) {
    if (n < edges[i]!) return i === 0 ? `<${edges[0]}` : `${edges[i - 1]}-${edges[i]! - 1}`
  }
  return `${edges[edges.length - 1]}+`
}

export function breadcrumbJsonLd(items: { name: string, path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': item.name, 'item': absoluteUrl(item.path) })),
  }
}

/**
 * The author of an article in the structured data (prd-blog-v2 RF-A3): the brand is the same Organization as the
 * publisher (with url and logo); no Person in the blog. A person author (none today) would need a Person here.
 */
export function authorJsonLd(author: BlogAuthor) {
  if (author.mascot) return PUBLISHER
  return { '@type': 'Person', 'name': author.name, 'url': absoluteUrl(author.page) }
}

export function articleJsonLd(article: BlogArticle, author: BlogAuthor) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': article.title,
    'description': article.description,
    'datePublished': article.published,
    'dateModified': article.updated,
    'inLanguage': 'pt-BR',
    'mainEntityOfPage': absoluteUrl(`/blog/${article.slug}`),
    'image': article.image ? absoluteUrl(article.image) : DEFAULT_OG_IMAGE,
    'author': authorJsonLd(author),
    'publisher': PUBLISHER,
  }
}

export function faqJsonLd(faq: BlogArticle['faq']) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faq.map(f => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })),
  }
}

export function toolJsonLd(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': name,
    'description': description,
    'url': absoluteUrl(path),
    'applicationCategory': 'EducationalApplication',
    'operatingSystem': 'Web',
    'inLanguage': 'pt-BR',
    'isAccessibleForFree': true,
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'BRL' },
    'publisher': PUBLISHER,
  }
}

/** Related articles: the pillar and the `related` slugs first, then the newest of the same category */
export function relatedArticles(article: Pick<BlogMeta, 'slug' | 'pillar' | 'related' | 'category'>, all: BlogMeta[], limit = 3): BlogMeta[] {
  const bySlug = new Map(all.map(a => [a.slug, a]))
  const picked: BlogMeta[] = []
  const push = (a?: BlogMeta) => {
    if (a && a.slug !== article.slug && !picked.includes(a) && picked.length < limit) picked.push(a)
  }
  for (const slug of [article.pillar, ...article.related]) if (slug) push(bySlug.get(slug))
  for (const a of all) if (a.category === article.category) push(a)
  for (const a of all) push(a)
  return picked
}

export const BLOG_TOOL_PAGES: { tool: BlogTool, path: string, title: string, description: string }[] = [
  {
    tool: 'calculadora-do-esquecimento',
    path: '/ferramentas/calculadora-do-esquecimento',
    title: 'Calculadora do esquecimento',
    description: 'Estudou há alguns dias? Veja quanto ainda deve lembrar e quando revisar.',
  },
  {
    tool: 'plano-ate-a-prova',
    path: '/ferramentas/plano-ate-a-prova',
    title: 'Plano até a prova',
    description: 'Com a data e o volume, quantos cards novos e quantas revisões por dia você precisa.',
  },
]
