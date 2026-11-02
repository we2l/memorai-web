// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { COLOR_PREFIXES, PALETTE_FAMILIES, scanColors } from '../../scripts/check-tokens.mjs'

const SCRIPT = resolve(__dirname, '../../scripts/check-tokens.mjs')
const dirs: string[] = []

const rules = (src: string) => scanColors(src).map(f => `${f.rule}:${f.match}`)

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('check-tokens: o que conta como cor crua', () => {
  it.each([
    ['hex de 6 dígitos', '<div style="color: #6F3FF5">', 'hex:#6F3FF5'],
    ['hex curto', 'color: #fff;', 'hex:#fff'],
    ['hex com alfa', "fill: '#6F3FF580'", 'hex:#6F3FF580'],
    ['hex em classe arbitrária', '<h1 class="text-[#1E0A3C]">', 'hex:#1E0A3C'],
    ['hex em .ts', "const DEPTH = ['#3B82F6']", 'hex:#3B82F6'],
    ['rgba com literal', 'box-shadow: 0 4px 12px rgba(111, 63, 245, 0.25);', 'color-fn:rgba(1'],
    ['rgb moderno', 'color: rgb(255 255 255 / 0.9);', 'color-fn:rgb(2'],
    ['hsl', 'background: hsl(210 40% 50%);', 'color-fn:hsl(2'],
    ['oklch', 'color: oklch(0.7 0.1 250);', 'color-fn:oklch(0'],
    ['color() com espaço de cor', 'color: color(display-p3 1 0 0);', 'color-fn:color(display-p3 1'],
    ['rgba dentro de arbitrário do Tailwind', '<div class="shadow-[0_2px_8px_rgba(0,0,0,0.1)]">', 'color-fn:rgba(0'],
    ['color-mix com cor nomeada', 'background: color-mix(in srgb, var(--a) 20%, white);', 'color-fn:color-mix('],
    ['bg-white', '<span class="bg-white">', 'palette:bg-white'],
    ['text-black com opacidade', '<span class="text-black/50">', 'palette:text-black'],
    ['paleta com variante', '<span class="hover:bg-red-500">', 'palette:bg-red-500'],
    ['paleta com !important', '<span class="!border-gray-200">', 'palette:border-gray-200'],
    ['borda de um lado', '<span class="border-x-slate-100">', 'palette:border-x-slate-100'],
    ['ring-offset', '<span class="ring-offset-white">', 'palette:ring-offset-white'],
    ['gradiente', '<span class="from-indigo-500 to-white">', 'palette:from-indigo-500'],
    ['fill de SVG', '<svg class="fill-white">', 'palette:fill-white'],
    ['text-shadow', '<span class="text-shadow-rose-300">', 'palette:text-shadow-rose-300'],
    ['família nova do Tailwind 4.2', '<span class="bg-taupe-200">', 'palette:bg-taupe-200'],
    ['@apply em <style>', '.x { @apply bg-emerald-50; }', 'palette:bg-emerald-50'],
  ])('pega %s', (_, src, expected) => {
    expect(rules(src)).toContain(expected)
  })

  it.each([
    ['token', 'color: var(--text-heading); background: var(--bg-card);'],
    ['color-mix só com tokens e transparent', 'background: color-mix(in srgb, var(--color-accent-primary) 8%, transparent);'],
    ['color-mix só com tokens', 'background: color-mix(in srgb, var(--bg-soft) 80%, var(--bg-card));'],
    ['canal de token', 'color: rgb(var(--rgb) / 50%);'],
    ['color-mix com interpolação', 'backgroundColor: `color-mix(in srgb, var(--a) ${pct}%, transparent)`'],
    ['referência de SVG', '<use href="#icon-grad" /><rect fill="url(#clip)" />'],
    ['slot com nome hex', '<template #add><span /></template><template #default />'],
    ['entidade HTML', '<span>&#123;</span>'],
    ['âncora de URL', "navigateTo('/ajuda#faq'); location.hash = '/planos#add'"],
    ['campo privado de classe', 'this.#bad = 1'],
    ['comentários', '/* #fff */ <!-- rgba(0,0,0,.1) --> // bg-white\n'],
    ['classes do projeto', '<span class="bg-accent-primary text-base-muted border-base">'],
    ['palavra que só começa igual', '<span class="bg-whitesmoke text-red-custom">'],
  ])('não pega %s', (_, src) => {
    expect(scanColors(src)).toEqual([])
  })

  it('lista todas as famílias da paleta do Tailwind instalado', () => {
    const theme = readFileSync(resolve(__dirname, '../../node_modules/tailwindcss/theme.css'), 'utf8')
    const families = [...new Set([...theme.matchAll(/--color-([a-z]+)-50:/g)].map(m => m[1]))]
    expect(families.length).toBeGreaterThanOrEqual(22)
    expect(PALETTE_FAMILIES).toEqual(expect.arrayContaining(families))
    expect(COLOR_PREFIXES).toEqual(expect.arrayContaining(['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'from', 'via', 'to', 'decoration', 'divide', 'outline']))
  })
})

type Files = Record<string, string>

function fixture(files: Files, baseline: object, allowlist: object = { entries: [] }) {
  const root = mkdtempSync(join(tmpdir(), 'tokens-'))
  dirs.push(root)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  mkdirSync(join(root, 'scripts'), { recursive: true })
  writeFileSync(join(root, 'scripts/ds-baseline.json'), JSON.stringify(baseline))
  writeFileSync(join(root, 'scripts/ds-allowlist.json'), JSON.stringify(allowlist))
  const run = (...args: string[]) => spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' })
  return { root, run }
}

const TWO_HEX = '<template><div class="text-[#111111] bg-[#222222]" /></template>\n'

describe('check-tokens: catraca e allowlist', () => {
  it('passa quando a contagem é a da linha de base', () => {
    const res = fixture({ 'app/a.vue': TWO_HEX }, { hex: { 'app/a.vue': 2 } }).run()
    expect(res.status, res.stderr).toBe(0)
    expect(res.stdout).toContain('check-tokens: ok (hex 2')
  })

  it('reprova quando um arquivo sobe e mostra a linha nova', () => {
    const res = fixture({ 'app/a.vue': `${TWO_HEX}<style>.x { color: rgba(0, 0, 0, 0.5); }</style>\n` }, { hex: { 'app/a.vue': 2 } }).run()
    expect(res.status).toBe(1)
    expect(res.stderr).toContain('color-fn app/a.vue: 0 → 1')
    expect(res.stderr).toContain('app/a.vue:2: rgba(0')
  })

  it('reprova arquivo novo com cor crua, mesmo se outro baixou', () => {
    const res = fixture({ 'app/a.vue': '<template><div /></template>\n', 'app/b.ts': "export const C = '#abcdef'\n" }, { hex: { 'app/a.vue': 2 } }).run()
    expect(res.status).toBe(1)
    expect(res.stderr).toContain('hex app/b.ts: 0 → 1')
    expect(res.stdout).toContain('hex app/a.vue: 2 → 0')
  })

  it('mostra o que baixou e passa', () => {
    const res = fixture({ 'app/a.vue': '<template><div class="text-[#111111]" /></template>\n' }, { hex: { 'app/a.vue': 2 } }).run()
    expect(res.status).toBe(0)
    expect(res.stdout).toContain('baixou')
    expect(res.stdout).toContain('hex app/a.vue: 2 → 1')
  })

  it('--update grava a contagem atual sem mexer nas regras de outra guarda', () => {
    const { root, run } = fixture({ 'app/a.vue': TWO_HEX, 'app/b.css': '.x { color: #333; }\n' }, { 'hex': { 'app/a.vue': 5 }, 'ghost-var': { 'app/z.vue': 1 } })
    expect(run('--update').status).toBe(0)
    const saved = JSON.parse(readFileSync(join(root, 'scripts/ds-baseline.json'), 'utf8'))
    expect(saved.hex).toEqual({ 'app/a.vue': 2, 'app/b.css': 1 })
    expect(saved['color-fn']).toEqual({})
    expect(saved['ghost-var']).toEqual({ 'app/z.vue': 1 })
  })

  it('a allowlist libera por caminho e por linha', () => {
    const files = { 'app/landing/x.vue': TWO_HEX, 'app/tokens.css': ':root {\n  --a: #fff;\n}\n.b { color: #000; }\n' }
    const allowlist = {
      entries: [
        { path: 'app/landing/**', rules: ['hex'], motivo: 'landing', prazo: 'Fase 4h' },
        { path: 'app/tokens.css', rules: ['hex'], match: '^\\s*--[\\w-]+\\s*:', motivo: 'declaração de token', prazo: 'permanente' },
      ],
    }
    const res = fixture(files, { hex: { 'app/tokens.css': 1 } }, allowlist).run()
    expect(res.status, res.stderr).toBe(0)
    expect(res.stdout).toContain('hex 1')
  })

  it('avisa exceção sem uso', () => {
    const allowlist = { entries: [{ path: 'app/sumiu.vue', rules: ['hex'], motivo: 'x', prazo: 'permanente' }] }
    const res = fixture({ 'app/a.vue': '<template><div /></template>\n' }, {}, allowlist).run()
    expect(res.status).toBe(0)
    expect(res.stderr).toContain('exceção sem uso')
  })

  it.each([
    ['sem motivo', { path: 'app/a.vue', rules: ['hex'], prazo: 'permanente' }, '"motivo" obrigatório'],
    ['sem prazo', { path: 'app/a.vue', rules: ['hex'], motivo: 'x' }, '"prazo" obrigatório'],
    ['sem regras', { path: 'app/a.vue', motivo: 'x', prazo: 'permanente' }, '"rules" obrigatório'],
    ['com prazo vencido', { path: 'app/a.vue', rules: ['hex'], motivo: 'x', prazo: '2020-01-01' }, 'prazo vencido em 2020-01-01'],
  ])('reprova exceção %s', (_, entry, message) => {
    const res = fixture({ 'app/a.vue': TWO_HEX }, { hex: { 'app/a.vue': 2 } }, { entries: [entry] }).run()
    expect(res.status).toBe(1)
    expect(res.stderr).toContain(message)
  })
})
