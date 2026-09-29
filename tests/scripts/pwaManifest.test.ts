// @vitest-environment node
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

describe.skipIf(skipWithoutBuild)('manifest do PWA (build)', () => {
  it('abre em /hoje com as cores light do DS', () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC_DIR, 'manifest.webmanifest'), 'utf8'))
    expect(manifest.start_url).toBe('/hoje')
    expect(manifest.theme_color).toBe('#F9FAFD')
  })

  it('ícone 512 otimizado (≤ 40 KB)', () => {
    expect(statSync(join(PUBLIC_DIR, 'pwa-512x512.png')).size).toBeLessThanOrEqual(40 * 1024)
  })
})
