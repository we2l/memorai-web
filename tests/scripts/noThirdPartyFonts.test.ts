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

  // prd-ds-v3-fundacao RF-0.4: the SW precaches every woff2, so latin-ext and italic were dead weight
  const interFaces = () => readdirSync(join(PUBLIC_DIR, '_nuxt'))
    .filter(f => f.endsWith('.css'))
    .flatMap(f => readFileSync(join(PUBLIC_DIR, '_nuxt', f), 'utf8').match(/@font-face\{[^}]*font-family:\s*"?Inter"?;[^}]*\}/g) ?? [])

  it('Inter só latin e sem itálico: um woff2', () => {
    const faces = interFaces()
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.filter(f => /font-style:\s*italic/.test(f))).toEqual([])
    expect(new Set(faces.map(f => f.match(/_fonts\/([^)]+\.woff2)/)?.[1])).size).toBe(1)
    expect(readdirSync(join(PUBLIC_DIR, '_fonts')).filter(f => f.endsWith('.woff2'))).toHaveLength(1)
  })

  it('o unicode-range da Inter cobre os acentos e a pontuação do PT-BR', () => {
    const ranges = interFaces().flatMap(f => f.match(/unicode-range:([^;}]+)/)?.[1].split(',') ?? [])
      .map(r => r.trim().replace(/^U\+/i, '').split('-').map(h => Number.parseInt(h, 16)))
      .map(([lo, hi]) => [lo, hi ?? lo] as const)
    const covered = (cp: number) => ranges.some(([lo, hi]) => cp >= lo && cp <= hi)
    const missing = [...'ação não você à é í ó ú â ô ü ÇÃÕÂÊÔÁÉÍÓÚÀ – — “ ” ‘ ’ … • € ª º'].filter(c => c !== ' ' && !covered(c.codePointAt(0)!))
    expect(missing).toEqual([])
  })

  // ADR-035 §2: the Fraunces of the big numbers (digits only) is precached; the exam-card italic is not
  it('Fraunces: "Baigi Num" (dígitos, no precache) e "Baigi It" (fora do precache), sem base64 no CSS', () => {
    const nuxtDir = join(PUBLIC_DIR, '_nuxt')
    const files = readdirSync(nuxtDir)
    const num = files.filter(f => /^baigi-num-600\..+\.woff2$/.test(f))
    const it500 = files.filter(f => /^baigi-it-500\..+\.woff2$/.test(f))
    expect(num).toHaveLength(1)
    expect(it500).toHaveLength(1)
    const urls = [...readFileSync(join(PUBLIC_DIR, 'sw.js'), 'utf8').matchAll(/url:"([^"]+)"/g)].map(m => m[1]!)
    expect(urls.some(u => u.endsWith(num[0]!))).toBe(true)
    expect(urls.filter(u => u.includes('baigi-it-'))).toEqual([])
    const css = files.filter(f => f.endsWith('.css')).map(f => readFileSync(join(nuxtDir, f), 'utf8')).join('\n')
    const face = css.match(/@font-face\{[^}]*font-family:\s*"?Baigi Num"?;[^}]*\}/)?.[0] ?? ''
    expect(face).toMatch(/unicode-range:\s*U\+0*20,/i)
    expect(css).not.toMatch(/data:font\/woff2/)
  })
})
