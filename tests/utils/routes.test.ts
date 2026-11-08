import { describe, expect, it } from 'vitest'
import { isPublicRoute } from '~/utils/routes'

describe('isPublicRoute', () => {
  it('blog, ferramentas e quem-faz abrem sem conta (prd-blog-seo); o app não', () => {
    for (const p of ['/blog', '/blog/curva-do-esquecimento', '/ferramentas', '/ferramentas/plano-ate-a-prova', '/quem-faz']) expect(isPublicRoute(p), p).toBe(true)
    for (const p of ['/hoje', '/blogs', '/ferramentasx', '/cadernos']) expect(isPublicRoute(p), p).toBe(false)
  })
})
