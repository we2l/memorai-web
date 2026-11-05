// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

describe.skipIf(skipWithoutBuild)('service worker (build)', () => {
  const sw = () => readFileSync(join(PUBLIC_DIR, 'sw.js'), 'utf8')

  it('não pré-cacheia imagens png nem pdf', () => {
    const urls = [...sw().matchAll(/url:"([^"]+)"/g)].map(m => m[1])
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.filter(u => /\.(png|pdf)$/i.test(u))).toEqual([])
  })

  it('páginas de uso único (onboarding, retornos de OAuth/checkout, redefinir senha) ficam fora do precache', () => {
    const urls = [...sw().matchAll(/url:"([^"]+)"/g)].map(m => m[1])
    expect(readdirSync(join(PUBLIC_DIR, '_nuxt')).filter(f => f.startsWith('once-')).length).toBeGreaterThanOrEqual(4)
    expect(urls.filter(u => u.includes('/once-') || u.startsWith('_nuxt/once-'))).toEqual([])
  })

  it('a lixeira, o Anki e os diálogos de mover e excluir (4b-2) ficam em chunks once-*, fora do precache', () => {
    const nuxtDir = join(PUBLIC_DIR, '_nuxt')
    const urls = [...sw().matchAll(/url:"([^"]+)"/g)].map(m => m[1]!)
    const js = readdirSync(nuxtDir).filter(f => f.endsWith('.js'))
    for (const marker of ['data-testid":"trash-list"', 'data-testid":"import-mapping"', 'data-testid":"move-confirm"', 'data-testid":"trash-keeps"']) {
      const holders = js.filter(f => readFileSync(join(nuxtDir, f), 'utf8').includes(marker))
      expect(holders.length, marker).toBeGreaterThan(0)
      expect(holders.filter(f => !f.startsWith('once-')), marker).toEqual([])
      expect(urls.filter(u => holders.some(h => u.endsWith(h))), marker).toEqual([])
    }
  })

  it('a página /_ds (referência do DS, prd-ds-v3-fundacao RF-2.5) fica fora do build de produção e do precache', () => {
    const urls = [...sw().matchAll(/url:"([^"]+)"/g)].map(m => m[1])
    expect(urls.filter(u => /(^|\/)_nuxt\/dev-/.test(u!))).toEqual([])
    // NUXT_DS_PAGE=1 builds it on purpose (screenshots); its chunk is dev-* and stays out of the precache
    if (process.env.NUXT_DS_PAGE === '1') return
    const nuxtDir = join(PUBLIC_DIR, '_nuxt')
    const js = readdirSync(nuxtDir).filter(f => f.endsWith('.js'))
    expect(js.filter(f => f.startsWith('dev-'))).toEqual([])
    expect(js.filter(f => readFileSync(join(nuxtDir, f), 'utf8').includes('data-ds-page'))).toEqual([])
  })

  it('não registra navigateFallback para a landing', () => {
    expect(sw()).not.toMatch(/createHandlerBoundToURL|NavigationRoute/)
  })
})
