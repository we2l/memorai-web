/**
 * Head of every public page (blog, tools, /quem-faz, /planos, /ajuda; prd-blog-seo RF-S1): title, description,
 * canonical, Open Graph, Twitter, the JSON-LD blocks and `robots: index`, all in the prerendered HTML. The app's
 * default head says `noindex` (nuxt.config.ts): a page is indexed only when it calls this (or sets INDEXABLE itself),
 * so the empty shell of an unknown URL or of a route behind the login never enters the index.
 */
import { DEFAULT_OG_IMAGE, absoluteUrl } from '~/utils/blog'
import { INDEXABLE, SITE_NAME, jsonLdScript } from '~/utils/seo'

export interface BlogSeoInput {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
  image?: string | null
  published?: string
  modified?: string
  jsonLd?: object[]
}

export function useBlogSeo(input: BlogSeoInput) {
  const url = absoluteUrl(input.path)
  const image = input.image ? absoluteUrl(input.image) : DEFAULT_OG_IMAGE
  const meta = [
    { name: 'robots', content: INDEXABLE },
    { name: 'description', content: input.description },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:type', content: input.type ?? 'website' },
    { property: 'og:locale', content: 'pt_BR' },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:image', content: image },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: input.title },
    { name: 'twitter:description', content: input.description },
    { name: 'twitter:image', content: image },
    ...(input.published ? [{ property: 'article:published_time', content: input.published }] : []),
    ...(input.modified ? [{ property: 'article:modified_time', content: input.modified }] : []),
  ]
  useHead({
    // The brand only when it fits in 60 characters: the result page cuts longer titles, and an unknown brand at the
    // end is what gets cut (seo-audit, title-tags)
    title: input.title.includes(SITE_NAME) || input.title.length + SITE_NAME.length + 3 > 60 ? input.title : `${input.title} · ${SITE_NAME}`,
    meta,
    link: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', type: 'application/rss+xml', title: 'Blog do Baigi', href: absoluteUrl('/blog/rss.xml') },
    ],
    script: (input.jsonLd ?? []).map(data => ({ type: 'application/ld+json', innerHTML: jsonLdScript(data) })),
  })
}
