// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { newerComponents, resolveComponentsDts } from '../../scripts/check-components.mjs'

// QA 2026-11 M9: the build of Nuxt 4 writes components.d.ts to node_modules/.cache/nuxt/.nuxt, not .nuxt
const dirs: string[] = []
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }) })

function root() {
  const d = mkdtempSync(join(tmpdir(), 'check-components-'))
  dirs.push(d)
  return d
}
// at in seconds (utimes); mtimeMs comes back in ms
function file(path: string, at: number) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, '')
  utimesSync(path, at, at)
}

describe('check-components: o components.d.ts gerado por último', () => {
  it('nenhum gerado: null', () => {
    expect(resolveComponentsDts(root())).toBeNull()
  })

  it('o do build (cache) quando é o mais novo', () => {
    const r = root()
    file(join(r, '.nuxt/components.d.ts'), 1000)
    file(join(r, 'node_modules/.cache/nuxt/.nuxt/components.d.ts'), 2000)
    expect(resolveComponentsDts(r)!.path).toBe(join(r, 'node_modules/.cache/nuxt/.nuxt/components.d.ts'))
  })

  it('o do prepare (.nuxt) quando é o mais novo', () => {
    const r = root()
    file(join(r, '.nuxt/components.d.ts'), 3000)
    file(join(r, 'node_modules/.cache/nuxt/.nuxt/components.d.ts'), 2000)
    expect(resolveComponentsDts(r)!.path).toBe(join(r, '.nuxt/components.d.ts'))
  })

  it('componente mais novo que a lista: a lista está velha', () => {
    const r = root()
    file(join(r, 'app/components/a/Old.vue'), 1000)
    file(join(r, 'app/components/b/New.vue'), 3000)
    expect(newerComponents(join(r, 'app/components'), 2_000_000)).toEqual([join(r, 'app/components/b/New.vue')])
    expect(newerComponents(join(r, 'app/components'), 4_000_000)).toEqual([])
  })
})
