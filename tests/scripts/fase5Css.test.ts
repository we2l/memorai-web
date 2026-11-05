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

  it('a lacuna do cloze continua no entry.css', () => {
    expect(read(entryFile!)).toContain('.cloze-blank')
  })

  it('o CSS da landing só alcança o escopo dela: nenhuma utility solta', () => {
    const css = read(landingFile!)
    const start = css.indexOf('@layer utilities{') + '@layer utilities{'.length
    let end = start
    for (let depth = 1; depth > 0; end++) depth += css[end] === '{' ? 1 : css[end] === '}' ? -1 : 0
    const utilities = css.slice(start, end)
    // The landing v4 compiles with the theme of the DS (prd-landing-v4 RF-L14): its own title scale, no default palette
    expect(utilities).toContain('.landing-page .text-hero')
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

  it('o CSS da landing fica leve (v4: ~4 KB gzip; era 5,8)', () => {
    expect(gzipSync(read(landingFile!)).length / 1024).toBeLessThan(4.5)
  })
})
