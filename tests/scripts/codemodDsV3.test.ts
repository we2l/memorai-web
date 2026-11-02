// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadMap, parseToken, themeColors, transformClass, transformSource } from '../../scripts/codemod-ds-v3.mjs'

const ROOT = resolve(__dirname, '../..')
const map = loadMap()
const theme = themeColors()
const cls = (t: string) => transformClass(t, map, theme)

describe('codemod-ds-v3: mapa', () => {
  it('as trocas sem revisão repetem o ponteiro do legacy-v2.css (sem mudança visual)', () => {
    const legacy = readFileSync(join(ROOT, 'app/assets/css/legacy-v2.css'), 'utf8')
    const pointers = new Map([...legacy.matchAll(/(--[\w-]+)\s*:\s*var\((--[\w-]+)\)\s*;/g)].map(m => [m[1], m[2]]))
    for (const [name, entry] of Object.entries(map.vars) as [string, { default?: string; manual?: string }][]) {
      if (entry.manual || !pointers.has(name)) continue
      expect(entry.default, name).toBe(pointers.get(name))
    }
  })

  it('todo destino existe nos tokens v3 (variável ou utility)', () => {
    const tokens = readFileSync(join(ROOT, 'app/assets/css/tokens.css'), 'utf8')
    for (const [name, entry] of Object.entries(map.vars) as [string, { default?: string; bg?: string }][]) {
      for (const target of [entry.default, entry.bg].filter(Boolean)) expect(tokens, `${name} → ${target}`).toContain(`${target}:`)
    }
    for (const [name, entry] of Object.entries(map.classes) as [string, { to?: string }][]) {
      for (const to of (entry.to ?? '').split(' ').filter(Boolean)) {
        const base = to.replace(/^\w+:/, '')
        const known = /^(?:bg|text|border|ring)-(.+)$/.exec(base)
        if (known && !/^text-(?:page-title|section|body|meta|label|stat)/.test(base)) expect(theme.names.has(known[1]), `${name} → ${to}`).toBe(true)
      }
    }
  })
})

describe('codemod-ds-v3: classes', () => {
  it('troca nomes v2 mantendo variantes, importante e opacidade', () => {
    expect(cls('text-base-muted').to).toBe('text-fg-muted')
    expect(cls('hover:text-base-primary').to).toBe('hover:text-fg-strong')
    expect(cls('md:text-display').to).toBe('md:text-page-title-sm md:lg:text-page-title')
    expect(cls('font-heading').to).toBe('')
    expect(cls('min-h-[44px]').to).toBe('min-h-touch')
  })

  it('prefixo-[var(--x)] e prefixo-(--x) viram a utility v3, com destino de fundo', () => {
    expect(cls('text-[var(--badge-danger-text)]').to).toBe('text-danger')
    expect(cls('bg-[var(--badge-danger-bg)]').to).toBe('bg-danger-subtle')
    expect(cls('hover:bg-[var(--border-divider)]').to).toBe('hover:bg-line')
    expect(cls('bg-[var(--color-accent-primary)]/20').to).toBe('bg-action/20')
    expect(cls('text-[var(--color-accent-primary)]').to).toBe('text-action-fg')
    expect(cls('border-(--surface-raised)').to).toBe('border-raised')
    expect(cls('bg-[var(--color-success)]').to).toBe('bg-success')
  })

  it('o que pede revisão fica igual e vai para a lista', () => {
    for (const t of ['rounded-xl', 'shadow-lg', 'card', 'input-base', 'skeleton', 'bg-[var(--bg-card)]', 'border-[var(--border-base)]']) {
      const r = cls(t)
      expect(r.to, t).toBe(t)
      expect(r.manual, t).toBeTruthy()
    }
  })

  it('não mexe no que não conhece', () => {
    for (const t of ['flex', 'grid-cols-[1fr_auto]', 'bg-[var(--nope)]', 'data-[state=open]:bg-raised']) expect(cls(t).to).toBe(t)
  })

  it('parseToken separa variantes com colchetes', () => {
    expect(parseToken('data-[a=b]:hover:!bg-x/20')).toMatchObject({ variants: 'data-[a=b]:hover:', important: '!', base: 'bg-x', modifier: '/20' })
  })
})

describe('codemod-ds-v3: arquivo', () => {
  it('troca classes, :class, var() fora de comentário e botões; mantém as linhas', () => {
    const src = `<template>
  <div class="text-base-muted  rounded-xl" :class="on ? 'bg-surface' : 'text-small'">
    <!-- var(--bg-soft) text-base-primary -->
    <button type="submit" class="btn-primary w-full" :disabled="busy" @click="go">
      <span>Salvar</span>
    </button>
    <NuxtLink to="/x" class="btn-secondary !min-h-0 !px-3 !py-1.5 text-small">Ver</NuxtLink>
    <button class="btn-ghost"><button class="inner">x</button></button>
  </div>
</template>
<script setup lang="ts">
// var(--text-muted) fica
const c = 'var(--text-muted)'
</script>
<style scoped>.a { color: var(--text-heading); }</style>
`
    const r = transformSource(src, 'a.vue', map, theme)
    expect(r.output.split('\n')).toHaveLength(src.split('\n').length)
    expect(r.output).toContain('class="text-fg-muted rounded-xl"')
    expect(r.output).toContain(`:class="on ? 'bg-page' : 'text-meta'"`)
    expect(r.output).toContain('<!-- var(--bg-soft) text-base-primary -->')
    expect(r.output).toContain('<UiButton variant="primary" type="submit" class="w-full" :disabled="busy" @click="go">')
    expect(r.output).toContain('<span>Salvar</span>\n    </UiButton>')
    expect(r.output).toContain('<UiButton variant="secondary" size="sm" to="/x">Ver</UiButton>')
    expect(r.output).toContain('<UiButton variant="ghost"><button class="inner">x</button></UiButton>')
    expect(r.output).toContain('// var(--text-muted) fica')
    expect(r.output).toContain("const c = 'var(--fg-muted)'")
    expect(r.output).toContain('color: var(--fg-strong)')
    expect(r.manual.map(m => `${m.line}:${m.reason.split(':')[0]}`)).toEqual(['2:rounded-xl'])
    expect(r.changes.find(c => c.from === 'text-base-muted')?.line).toBe(2)
  })

  it('btn-* em :class e spinner dentro do botão vão para revisão', () => {
    const src = `<template>
  <button :class="x ? 'btn-primary' : 'btn-danger'">a</button>
  <button class="btn-primary"><span class="animate-spin" /> b</button>
</template>`
    const r = transformSource(src, 'b.vue', map, theme)
    expect(r.output).toContain(`<button :class="x ? 'btn-primary' : 'btn-danger'">a</button>`)
    expect(r.manual.map(m => m.reason)).toEqual(expect.arrayContaining([expect.stringContaining(':class dinâmico'), expect.stringContaining('loading')]))
  })
})

describe('codemod-ds-v3: CLI', () => {
  const dirs: string[] = []
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }) })

  it('dry-run por padrão (relata e não grava); --write grava', () => {
    // The CLI resolves paths from the repo root: use a scratch folder inside it
    const dir = mkdtempSync(join(ROOT, 'app', '.codemod-test-'))
    dirs.push(dir)
    const rel = `${dir.slice(ROOT.length + 1)}/X.vue`
    writeFileSync(join(ROOT, rel), '<template><p class="text-base-muted">a</p></template>\n')
    const dry = spawnSync('node', ['scripts/codemod-ds-v3.mjs', rel], { cwd: ROOT, encoding: 'utf8' })
    expect(dry.stdout).toContain('1 troca(s)')
    expect(dry.stdout).toContain('dry-run')
    expect(readFileSync(join(ROOT, rel), 'utf8')).toContain('text-base-muted')
    spawnSync('node', ['scripts/codemod-ds-v3.mjs', '--write', rel], { cwd: ROOT, encoding: 'utf8' })
    expect(readFileSync(join(ROOT, rel), 'utf8')).toContain('text-fg-muted')
    const json = spawnSync('node', ['scripts/codemod-ds-v3.mjs', '--json', rel], { cwd: ROOT, encoding: 'utf8' })
    expect(JSON.parse(json.stdout)).toEqual([])
  })

  it('sem alvo explica o uso', () => {
    const r = spawnSync('node', ['scripts/codemod-ds-v3.mjs'], { cwd: ROOT, encoding: 'utf8' })
    expect(r.status).toBe(2)
    expect(r.stderr).toContain('uso:')
  })
})

