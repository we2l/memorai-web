/**
 * `?area=` of a tool page (prd-blog-seo RF-T1, RF-T2): which mini-lote the call opens. A prerendered page hydrates
 * without the query and Nuxt puts it back afterwards, so this follows the router instead of reading it once.
 */
import { BLOG_AREAS, type BlogArea } from '~~/modules/blog/types'

export function useAreaQuery() {
  const route = useRoute()
  return computed<BlogArea | null>(() => {
    const q = route.query.area
    return typeof q === 'string' && (BLOG_AREAS as readonly string[]).includes(q) ? q as BlogArea : null
  })
}
