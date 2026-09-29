// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = resolve(__dirname, '../../scripts/check-bundle-budget.mjs')
const dirs: string[] = []

function fixture(budgetKb: number) {
  const root = mkdtempSync(join(tmpdir(), 'budget-'))
  dirs.push(root)
  const nuxt = join(root, '.output/public/_nuxt')
  mkdirSync(nuxt, { recursive: true })
  // Random bytes do not compress: gz size ~ raw size
  writeFileSync(join(nuxt, 'entry.js'), randomBytes(20 * 1024))
  writeFileSync(join(nuxt, 'page.js'), randomBytes(40 * 1024))
  const manifestDir = join(root, '.nuxt/dist/server')
  mkdirSync(manifestDir, { recursive: true })
  writeFileSync(join(manifestDir, 'client.manifest.mjs'), `export default ${JSON.stringify({
    'entry.js': { file: 'entry.js', isEntry: true, imports: [] },
    'pages/cadernos/index.vue': { file: 'page.js', imports: ['entry.js'] },
  })}`)
  const budget = join(root, 'budget.json')
  writeFileSync(budget, JSON.stringify({
    entryLayoutGzKb: budgetKb,
    largestChunkGzKb: budgetKb,
    routes: { '/cadernos': { file: 'pages/cadernos/index.vue', gzKb: budgetKb } },
  }))
  return spawnSync(process.execPath, [SCRIPT, '--root', root, '--budget', budget], { encoding: 'utf8' })
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('check-bundle-budget', () => {
  it('sai com 1 quando um chunk passa do budget', () => {
    const res = fixture(30)
    expect(res.status).toBe(1)
    expect(res.stdout).toContain('NÃO')
  })

  it('sai com 0 quando tudo está abaixo do budget', () => {
    const res = fixture(100)
    expect(res.status).toBe(0)
    expect(res.stdout).toContain('rota /cadernos chunk')
  })
})
