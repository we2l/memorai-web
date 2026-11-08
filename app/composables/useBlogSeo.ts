/**
 * Head of the blog, the tools and /quem-faz (prd-blog-seo RF-S1): title, description, canonical, Open Graph, Twitter
 * and the JSON-LD blocks, all in the prerendered HTML.
 */
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from '~/utils/blog'

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

/** JSON inside <script>: `<` escaped so no text of an article can close the tag */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function useBlogSeo(input: BlogSeoInput) {
  const url = absoluteUrl(input.path)
  const image = input.image ? absoluteUrl(input.image) : DEFAULT_OG_IMAGE
  const meta = [
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
    title: input.title.includes(SITE_NAME) ? input.title : `${input.title} · ${SITE_NAME}`,
    meta,
    link: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', type: 'application/rss+xml', title: 'Blog do Baigi', href: absoluteUrl('/blog/rss.xml') },
    ],
    script: (input.jsonLd ?? []).map(data => ({ type: 'application/ld+json', innerHTML: jsonLdScript(data) })),
  })
}
