// @vitest-environment node
import { readFileSync } from 'node:fs'
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

  it('não registra navigateFallback para a landing', () => {
    expect(sw()).not.toMatch(/createHandlerBoundToURL|NavigationRoute/)
  })
})
