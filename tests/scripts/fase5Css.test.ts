// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PUBLIC_DIR, skipWithoutBuild } from './buildOutput'

const NUXT = join(PUBLIC_DIR, '_nuxt')
const cssFiles = skipWithoutBuild ? [] : readdirSync(NUXT).filter(f => f.endsWith('.css'))
const read = (f: string) => readFileSync(join(NUXT, f), 'utf8')
const entryFile = cssFiles.find(f => f.startsWith('entry'))
const landingFile = cssFiles.find(f => read(f).includes('.landing-page'))

describe.skipIf(skipWithoutBuild)('Fase 5: o que o build entrega', () => {
  it('o entry.css não tem paleta, tamanho, raio nem sombra padrão do Tailwind', () => {
    const css = read(entryFile!)
    for (const ghost of ['--color-gray-', '.text-gray-', '.bg-white', '.text-sm', '.rounded-lg', '.rounded-xl', '.shadow-md', '.bg-\\[\\#', '.btn-primary', '.card-base', '.text-base-muted', '.confetti-particle', '--badge-', '--bg-card']) {
      expect(css, ghost).not.toContain(ghost)
    }
  })

  it('a lacuna do cloze vai no chunk de quem a mostra, fora do entry.css (E2, teto de 13 KB)', () => {
    expect(read(entryFile!)).not.toContain('.cloze-blank')
    expect(cssFiles.filter(f => f.startsWith('ReviewCard.')).map(read).join('')).toContain('.cloze-blank')
  })

  it('o CSS da landing só alcança o escopo dela: nenhuma utility solta', () => {
    const css = read(landingFile!)
    const start = css.indexOf('@layer utilities{') + '@layer utilities{'.length
    let end = start
    for (let depth = 1; depth > 0; end++) depth += css[end] === '{' ? 1 : css[end] === '}' ? -1 : 0
    const utilities = css.slice(start, end)
    // The landing compiles with the theme of the DS (prd-landing-v4 RF-L14, prd-landing-d RF-D19): the tokens of the
    // app (the subject dots of the areas), no default palette
    expect(utilities).toContain('.landing-page .bg-subject-1')
    expect(css).not.toContain('--color-gray-')
    // Outside a nested block (media query, hover), every rule starts with the scope
    const loose = [...utilities.matchAll(/(?:^|\})\.(?!landing-page)[^{}]*\{/g)]
    expect(loose.map(m => m[0].slice(0, 80))).toEqual([])
  })

  it('o CSS da landing fica fora do precache, e é o único index.*.css', () => {
    const sw = readFileSync(join(PUBLIC_DIR, 'sw.js'), 'utf8')
    expect(sw).not.toContain(landingFile!)
    expect(cssFiles.filter(f => f.startsWith('index.'))).toEqual([landingFile])
  })

  // Landing D (prd-landing-d): the composition of the prototype (phone, bubbles, bands, stage, player, motion) lives
  // here, out of the entry.css and of the precache. v4: ~4 KB gzip.
  it('o CSS da landing fica leve (D: ~7 KB gzip)', () => {
    expect(gzipSync(read(landingFile!)).length / 1024).toBeLessThan(8)
  })

  it('a fonte de título da landing (ADR-028) fica no CSS dela, nunca no entry.css', () => {
    expect(read(landingFile!)).toContain('/landing/bricolage-700.woff2')
    expect(read(entryFile!)).not.toContain('Bricolage')
  })
})
