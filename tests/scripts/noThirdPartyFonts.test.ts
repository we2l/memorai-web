// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === '_nuxt' ? [] : htmlFiles(join(dir, e.name))
    return e.name.endsWith('.html') ? [join(dir, e.name)] : []
  })
}

describe.skipIf(skipWithoutBuild)('fontes self-hosted (build)', () => {
  it('nenhum HTML referencia Google Fonts', () => {
    const files = htmlFiles(PUBLIC_DIR)
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
  })

  it('existe ao menos um .woff2 em _fonts/', () => {
    const dir = join(PUBLIC_DIR, '_fonts')
    expect(existsSync(dir)).toBe(true)
    expect(readdirSync(dir).some(f => f.endsWith('.woff2'))).toBe(true)
  })
})
