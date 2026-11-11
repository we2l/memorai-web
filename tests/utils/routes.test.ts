import { describe, expect, it } from 'vitest'
import { isReadingRoute, bootNeedsMe, isPublicRoute } from '~/utils/routes'

describe('isPublicRoute', () => {
  it('blog, ferramentas e quem-faz abrem sem conta (prd-blog-seo); o app não', () => {
    for (const p of ['/blog', '/blog/curva-do-esquecimento', '/ferramentas', '/ferramentas/plano-ate-a-prova', '/quem-faz']) expect(isPublicRoute(p), p).toBe(true)
    for (const p of ['/hoje', '/blogs', '/ferramentasx', '/cadernos']) expect(isPublicRoute(p), p).toBe(false)
  })
})

describe('bootNeedsMe (QA M6)', () => {
  it('a 404 of a visitor does not ask /me', () => {
    expect(bootNeedsMe('/nao-existe', { known: false, hasHint: false })).toBe(false)
  })

  it('a 404 with the session hint asks /me (the error page knows the person)', () => {
    expect(bootNeedsMe('/nao-existe', { known: false, hasHint: true })).toBe(true)
  })

  it('a private route asks /me; a public one only with the hint', () => {
    expect(bootNeedsMe('/hoje', { known: true, hasHint: false })).toBe(true)
    expect(bootNeedsMe('/planos', { known: true, hasHint: false })).toBe(false)
    expect(bootNeedsMe('/planos', { known: true, hasHint: true })).toBe(true)
  })
})

describe('isReadingRoute (prd-blog-v2 RF-L1)', () => {
  it('blog, ferramentas e quem-faz leem com a barra fina de cookies', () => {
    for (const p of ['/blog', '/blog/sobre', '/blog/curva-do-esquecimento', '/ferramentas/plano-ate-a-prova', '/quem-faz']) expect(isReadingRoute(p)).toBe(true)
    for (const p of ['/', '/planos', '/hoje', '/blogs', '/ferramentasx']) expect(isReadingRoute(p)).toBe(false)
  })
})
