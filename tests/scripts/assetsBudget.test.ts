// @vitest-environment node
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ASSETS = resolve(__dirname, '../../app/assets')
const KB = 1024

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
}

describe('budget de imagens em app/assets', () => {
  const mascots = readdirSync(join(ASSETS, 'mascots')).map(f => join(ASSETS, 'mascots', f))

  it('cada mascote ≤ 30 KB', () => {
    expect(mascots.length).toBeGreaterThan(0)
    for (const f of mascots) expect(statSync(f).size, f).toBeLessThanOrEqual(30 * KB)
  })

  it('ícone de 64 px ≤ 5 KB', () => {
    for (const f of mascots.filter(f => f.endsWith('-64.webp'))) {
      expect(statSync(f).size, f).toBeLessThanOrEqual(5 * KB)
    }
  })

  it('nenhum png > 50 KB', () => {
    const heavy = walk(ASSETS).filter(f => f.endsWith('.png') && statSync(f).size > 50 * KB)
    expect(heavy).toEqual([])
  })
})
