// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cssClassNames, cssDeclaredVars, ghostFindings, namespacedRawTokens, runtimeVars, templateClassRefs, tokenNameFindings, varRefs } from '../../scripts/check-ds.mjs'

const SCRIPT = resolve(__dirname, '../../scripts/check-ds.mjs')
const dirs: string[] = []
const noAllowlist = { entries: [], errors: [] }

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('check-ds: leitura do CSS do build', () => {
  it('desfaz o escape das classes do Tailwind', () => {
    const css = '.hover\\:bg-x:hover{color:red}.\\!py-1\\.5{padding:0}.min-h-\\[2\\.75rem\\]{min-height:2.75rem}'
      + '.\\32 xl\\:p-4{padding:1rem}.a .b>.c{margin:0}@media (min-width:40.5rem){.sm\\:flex{display:flex}}'
      + '.group-hover\\:text-x:is(:where(.group):hover *){color:red}'
    const names = cssClassNames(css)
    for (const c of ['hover:bg-x', '!py-1.5', 'min-h-[2.75rem]', '2xl:p-4', 'a', 'b', 'c', 'sm:flex', 'group-hover:text-x', 'group']) {
      expect(names, c).toContain(c)
    }
    expect(names).not.toContain('5rem')
  })

  it('acha variáveis declaradas e registradas', () => {
    const vars = cssDeclaredVars(':root{--bg-card:#fff}.dark{--text-muted:#aaa;color:var(--nope)}@property --tw-shadow{syntax:"*"}')
    expect([...vars].sort()).toEqual(['--bg-card', '--text-muted', '--tw-shadow'])
  })

  it('acha variáveis definidas em tempo de execução', () => {
    const src = `<div :style="{ '--nb-color': c }" style="--gap: 4px; color: red" />
      <script>root.style.setProperty('--sidebar-w-set', '64px')</script>`
    expect([...runtimeVars(src)].sort()).toEqual(['--gap', '--nb-color', '--sidebar-w-set'])
  })

  it('lista var() e a sintaxe bg-(--x), sem comentários', () => {
    const refs = varRefs('a { color: var(--a); /* var(--b) */ } <div class="bg-(--c) text-[var(--d)]" /> // var(--e)\n')
    expect(refs.map(r => r.name)).toEqual(['--a', '--c', '--d'])
  })
})

describe('check-ds: classes do template', () => {
  const names = (src: string) => templateClassRefs(src).map(r => r.name)

  it('lê class, *-class e os literais de :class', () => {
    const src = `<template>
      <div class="flex  gap-2" :class="[active ? 'bg-a' : 'bg-b', { 'is-open': open, hidden: !open }]" />
      <Transition enter-active-class="transition duration-200" />
      <span :class="\`p-2 \${tone ? 'text-x' : ''}\`" />
    </template>`
    expect(names(src).sort()).toEqual(['bg-a', 'bg-b', 'duration-200', 'flex', 'gap-2', 'hidden', 'is-open', 'p-2', 'text-x', 'transition'])
  })

  it('ignora comparações, argumentos de função e pedaços interpolados', () => {
    const src = `<template>
      <div :class="variant === 'primary' ? 'btn-primary' : 'btn-secondary'" />
      <div :class="getClass('true')" />
      <div :class="\`bg-\${tone}-soft\`" />
    </template>`
    expect(names(src).sort()).toEqual(['btn-primary', 'btn-secondary'])
  })

  it('não lê script, style nem comentários', () => {
    const src = `<template><!-- <i class="nope"> --><b class="ok" /></template>
      <script setup>const x = '<i class="nope2">'</script><style>.y { }</style>`
    expect(names(src)).toEqual(['ok'])
  })
})

describe('check-ds: fantasmas', () => {
  const css = ':root{--bg-card:#fff}.flex{display:flex}.text-base-muted{color:var(--text-muted)}.btn-primary{color:red}'

  it('aponta variável inexistente, mesmo com fallback, e classe sem regra', () => {
    const sources = {
      'app/a.vue': `<template><label class="label-base flex">x</label></template>
<style scoped>
.t { color: var(--color-text-muted); }
.s { box-shadow: var(--shadow-dropdown, 0 8px 24px #0002); background: var(--bg-card); }
</style>`,
    }
    const found = ghostFindings(sources, css, noAllowlist).map(f => `${f.rule} ${f.match} ${f.file}:${f.line}`)
    expect(found).toEqual([
      'ghost-var --color-text-muted app/a.vue:3',
      'ghost-var --shadow-dropdown app/a.vue:4',
      'ghost-class label-base app/a.vue:1',
    ])
  })

  it('aceita variável definida por :style e lista de classes em script', () => {
    const sources = {
      'app/b.vue': `<template><div :style="{ '--nb-color': c }" class="flex" /></template>
<script setup>const TONE = { ok: 'flex text-base-muted', bad: 'flex text-nope' }</script>
<style scoped>.c { border-color: var(--nb-color); }</style>`,
      'app/c.ts': "export const CLS = 'btn-primary flex'\nexport const LANG = 'pt-BR'\n",
    }
    const found = ghostFindings(sources, css, noAllowlist).map(f => `${f.rule} ${f.match} ${f.file}:${f.line}`)
    expect(found).toEqual(['ghost-class text-nope app/b.vue:2'])
  })
})

describe('check-ds: regra de nomes dos tokens (token-name)', () => {
  it('aponta prefixo de namespace do Tailwind fora do @theme, em CSS e em <style> de .vue', () => {
    const sources = {
      'app/assets/css/tokens.css': `:root {
  --surface-page: #fff;
  --text-body: #333; /* --color-x: comentário não conta */
  --color-accent: var(--action);
}
@theme inline { --color-page: var(--surface-page); --text-section: 1.25rem; }
.dark { --shadow-card: none; }`,
      'app/a.vue': '<template><div class="p-2" style="--radius-x: 2px" /></template>\n<style scoped>\n.a { --font-x: Inter; --nb-color: red; }\n</style>',
      'app/b.ts': "export const x = '--color-y: red'",
    }
    const found = tokenNameFindings(sources, noAllowlist).map(f => `${f.match} ${f.file}:${f.line}`)
    expect(found).toEqual([
      '--text-body app/assets/css/tokens.css:3',
      '--color-accent app/assets/css/tokens.css:4',
      '--shadow-card app/assets/css/tokens.css:7',
      '--font-x app/a.vue:3',
    ])
  })

  it('aponta nome que é cor e tamanho de texto no @theme (text-X vira a cor)', () => {
    const sources = {
      'app/assets/css/theme.css': '@theme static {\n  --text-page: 2rem;\n  --text-page--line-height: 2.5rem;\n  --text-body: 1rem;\n}\n@theme inline {\n  --color-page: var(--surface-page);\n}',
    }
    const found = tokenNameFindings(sources, noAllowlist).map(f => `${f.match} ${f.file}:${f.line}`)
    expect(found).toEqual(['--text-page app/assets/css/theme.css:2'])
  })

  it('ignora o que está dentro do @theme e nomes sem namespace', () => {
    expect(namespacedRawTokens('@theme { --color-a: red; --text-b: 1rem; }\n:root { --fg: #000; --line-input: #888; --z-toast: 70; }')).toEqual([])
  })
})

function fixture(files: Record<string, string>, baseline: object) {
  const root = mkdtempSync(join(tmpdir(), 'ds-'))
  dirs.push(root)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  mkdirSync(join(root, 'scripts'), { recursive: true })
  writeFileSync(join(root, 'scripts/ds-baseline.json'), JSON.stringify(baseline))
  writeFileSync(join(root, 'scripts/ds-allowlist.json'), JSON.stringify({ entries: [] }))
  return spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' })
}

describe('check-ds: CLI', () => {
  const app = { 'app/a.vue': '<template><b class="flex ghost" /></template>\n' }

  it('exige o build', () => {
    const res = fixture(app, {})
    expect(res.status).toBe(2)
    expect(res.stderr).toContain('rode "npm run build" antes')
  })

  it('reprova fantasma novo e aceita o da linha de base', () => {
    const files = { ...app, '.output/public/_nuxt/entry.css': '.flex{display:flex}' }
    const fail = fixture(files, {})
    expect(fail.status).toBe(1)
    expect(fail.stderr).toContain('ghost-class app/a.vue: 0 → 1')
    const ok = fixture(files, { 'ghost-class': { 'app/a.vue': 1 } })
    expect(ok.status, ok.stderr).toBe(0)
    expect(ok.stdout).toContain('check-ds: ok (ghost-var 0 · ghost-class 1 · token-name 0')
  })
})
