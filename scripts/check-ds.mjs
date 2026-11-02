#!/usr/bin/env node
// Ghost guard of the design system (ADR-027 §8, prd-ds-v3-fundacao RF-0.3). Reads the build: run it
// after `npm run build`. A ghost renders nothing and fails silently:
//   ghost-var    var(--x) (or Tailwind `bg-(--x)`) in app/**/*.{vue,ts,css} whose --x is declared nowhere:
//                not in the built CSS (.output/public/_nuxt/*.css) and not set at runtime ('--x': v in
//                :style, setProperty('--x'), style="--x: v"). A fallback does not excuse it: the fallback
//                is then the only value that ever renders.
//   ghost-class  class used in a template (class, *-class, string literals and object keys of :class) or
//                in a class list of a script (2+ class-like tokens, 1+ known class) that has no rule in
//                the built CSS.
//   token-name   naming rule of the tokens (ADR-027 §1, raio-X §B), read from the sources:
//                - a custom property declared OUTSIDE @theme (app/**/*.css and <style> of .vue) whose name
//                  starts with a Tailwind namespace (--color-, --text-, --radius-, --shadow-, --font-...):
//                  unlayered, it beats the @theme variable of the same name (the --text-body trap: a color
//                  where a font size was expected). Those prefixes only exist in @theme, as the bridge;
//                - a name declared in @theme both as --color-X and --text-X: `text-X` becomes the color and
//                  the font size is lost in silence.
// Same allowlist and ratchet as check-tokens (scripts/ds-allowlist.json, scripts/ds-baseline.json).
// Usage: node scripts/check-ds.mjs [--update] [--root <repo>] [--baseline <file>] [--allowlist <file>]
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { allowedBy, blank, blankComments, cliOptions, lineLocator, listFiles, loadAllowlist, runRatchet } from './lib/ds-guard.mjs'

export const RULES = ['ghost-var', 'ghost-class', 'token-name']

// Theme variable namespaces of Tailwind 4 (tailwindcss/theme.css)
export const TW_NAMESPACES = [
  'color', 'text', 'font', 'font-weight', 'leading', 'tracking', 'spacing', 'radius', 'shadow', 'inset-shadow',
  'drop-shadow', 'text-shadow', 'blur', 'perspective', 'aspect', 'ease', 'animate', 'container', 'breakpoint', 'default',
]
const THEME_BLOCK = /@theme\b[^{]*\{[^}]*\}/g
const NAMESPACED_DECL = new RegExp(`(?<=^|[{;\\s])--(?:${TW_NAMESPACES.join('|')})-[\\w-]*(?=\\s*:)`, 'g')

/** CSS of a source: the file itself, or only the <style> blocks of a .vue (same offsets). */
function cssOf(file, source) {
  if (file.endsWith('.css')) return source
  if (!file.endsWith('.vue')) return ''
  let out = ''
  let last = 0
  for (const m of source.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style>/g)) {
    const start = m.index + m[1].length
    out += blank(source.slice(last, start)) + m[2]
    last = start + m[2].length
  }
  return out + blank(source.slice(last))
}

/** Tailwind-namespaced custom properties declared outside @theme: [{ name, index }]. */
export function namespacedRawTokens(css) {
  const text = blankComments(css).replace(THEME_BLOCK, blank)
  return [...text.matchAll(NAMESPACED_DECL)].map(m => ({ name: m[0], index: m.index }))
}

/** --text-X declared in @theme while --color-X also is (any file): [{ name, index }] of the --text-X. */
export function themeCollisions(css, colorNames) {
  const out = []
  for (const block of blankComments(css).matchAll(THEME_BLOCK)) {
    for (const m of block[0].matchAll(/--text-([\w-]+?)(?=\s*:)/g)) {
      if (!m[1].includes('--') && colorNames.has(m[1])) out.push({ name: `--text-${m[1]}`, index: block.index + m.index })
    }
  }
  return out
}

/** Colors declared in any @theme block of the sources. */
export function themeColorNames(cssList) {
  const names = new Set()
  for (const css of cssList) {
    for (const block of blankComments(css).matchAll(THEME_BLOCK)) {
      for (const m of block[0].matchAll(/--color-([\w-]+)(?=\s*:)/g)) names.add(m[1])
    }
  }
  return names
}

/** token-name findings of the app sources. */
export function tokenNameFindings(sources, allowlist) {
  const css = Object.fromEntries(Object.entries(sources).map(([f, s]) => [f, cssOf(f, s)]))
  const colors = themeColorNames(Object.values(css))
  const findings = []
  for (const [file, text] of Object.entries(css)) {
    if (!text.trim()) continue
    const locate = lineLocator(sources[file])
    for (const ref of [...namespacedRawTokens(text), ...themeCollisions(text, colors)].sort((a, b) => a.index - b.index)) {
      const { line, text: lineText } = locate(ref.index)
      const finding = { rule: 'token-name', file, line, text: lineText, match: ref.name }
      if (!allowedBy(allowlist, finding)) findings.push(finding)
    }
  }
  return findings
}

const unescapeCss = s => s
  .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/\\(.)/g, '$1')

/** Every class named in a selector of the CSS (at-rule preludes skipped). */
export function cssClassNames(css) {
  const names = new Set()
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{};]+)\{/g)) {
    const selector = m[1].trim()
    if (selector.startsWith('@')) continue
    for (const c of selector.matchAll(/\.((?:\\[0-9a-fA-F]{1,6}\s?|\\.|[\w-])+)/g)) names.add(unescapeCss(c[1]))
  }
  return names
}

/** Custom properties declared (`--x:`) or registered (`@property --x`) in the CSS. */
export function cssDeclaredVars(css) {
  const names = new Set()
  for (const m of css.matchAll(/(?:^|[{;\s(])(--[\w-]+)\s*:/g)) names.add(m[1])
  for (const m of css.matchAll(/@property\s+(--[\w-]+)/g)) names.add(m[1])
  return names
}

/** Custom properties a source sets at runtime: `'--x': v`, setProperty('--x', v), style="--x: v". */
export function runtimeVars(source) {
  const names = new Set()
  for (const m of source.matchAll(/['"`](--[\w-]+)['"`]\s*[:,)]/g)) names.add(m[1])
  for (const m of source.matchAll(/(?<![\w-]):?style\s*=\s*"([^"]*)"/g)) {
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:/g)) names.add(d[1])
  }
  return names
}

/** var(--x) and Tailwind 4 `prefix-(--x)` references: [{ name, index }]. */
export function varRefs(source) {
  const text = blankComments(source)
  return [...text.matchAll(/var\(\s*(--[\w-]+)|[\w]-\((--[\w-]+)\)/g)].map(m => ({ name: m[1] ?? m[2], index: m.index }))
}

const CLASS_TOKEN = /^(?:[a-z0-9@[\]&_:*>.=()'"/-]+:)*!?-?[a-z_][\w-]*(?:-\[[^\]\s]+\]|\/[\d.]+|\/\[[^\]]+\])?(?:\.\d+)?!?$|^(?:[a-z0-9@[\]&_:*>.=-]+:)*!?\[[^\]\s]+\]$/
const MARK = '\u0000'

function pushTokens(out, str, index) {
  for (const token of str.split(/\s+/)) {
    if (token && !token.includes(MARK) && !/[{}$]/.test(token)) out.push({ name: token, index })
  }
}

/** Class literals of a `:class` expression: strings (minus comparisons and call args) and object keys. */
function expressionClasses(expr, index, out) {
  // Groups: 1 comparison before, 2 call paren before, 3 quote, 4 body, 5 comparison after
  const strings = /(?:(===?|!==?)\s*|(\()\s*)?(['`])((?:(?!\3)[^\\]|\\.)*)\3(\s*(?:===?|!==?))?/g
  for (const m of expr.matchAll(strings)) {
    if (m[1] || m[2] || m[5]) continue
    // Template literal: interpolations break the token they touch (bg-${tone})
    const literal = m[3] === '`' ? m[4].replace(/\$\{[^}]*\}/g, MARK) : m[4]
    pushTokens(out, literal, index)
    if (m[3] === '`') for (const inner of m[4].matchAll(/\$\{([^}]*)\}/g)) expressionClasses(inner[1], index, out)
  }
  const outside = expr.replace(/(['`])(?:(?!\1)[^\\]|\\.)*\1/g, blank)
  for (const k of outside.matchAll(/[{,]\s*([A-Za-z_$][\w$]*)\s*:/g)) out.push({ name: k[1], index })
}

/** Classes used in the <template> of a .vue file: [{ name, index }]. */
export function templateClassRefs(source) {
  const template = blankComments(source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, blank)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, blank))
  const out = []
  for (const m of template.matchAll(/(?<![\w:@.-])((?:v-bind)?:)?((?:[\w-]+-)?class)\s*=\s*"([^"]*)"/g)) {
    const [, bound, , value] = m
    if (bound) expressionClasses(value, m.index, out)
    else pushTokens(out, value.replace(/\{\{[\s\S]*?\}\}/g, MARK), m.index)
  }
  return out
}

/** Class lists in script strings: 2+ class-like tokens and at least one class the CSS knows. */
export function scriptClassRefs(source, known, isVue) {
  const scripts = isVue
    ? source.replace(/<template\b[\s\S]*<\/template>/, blank).replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, blank)
    : source
  const text = blankComments(scripts)
  const out = []
  for (const m of text.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
    if (m[2].includes('${')) continue
    const tokens = m[2].trim().split(/\s+/).filter(Boolean)
    if (tokens.length < 2 || !tokens.every(t => CLASS_TOKEN.test(t)) || !tokens.some(t => known.has(t))) continue
    for (const t of tokens) out.push({ name: t, index: m.index })
  }
  return out
}

/** Ghost findings of the app against the CSS of a build. */
export function ghostFindings(sources, css, allowlist) {
  const classes = cssClassNames(css)
  const declared = cssDeclaredVars(css)
  for (const src of Object.values(sources)) for (const v of runtimeVars(src)) declared.add(v)

  const findings = []
  for (const [file, source] of Object.entries(sources)) {
    const locate = lineLocator(source)
    const add = (rule, name, index) => {
      const { line, text } = locate(index)
      const finding = { rule, file, line, text, match: name }
      if (!allowedBy(allowlist, finding)) findings.push(finding)
    }
    for (const ref of varRefs(source)) if (!declared.has(ref.name)) add('ghost-var', ref.name, ref.index)
    const isVue = file.endsWith('.vue')
    if (!isVue && !file.endsWith('.ts')) continue
    const used = [...(isVue ? templateClassRefs(source) : []), ...scriptClassRefs(source, classes, isVue)]
    for (const ref of used) if (!classes.has(ref.name)) add('ghost-class', ref.name, ref.index)
  }
  return findings
}

function main() {
  const opts = cliOptions(process.argv.slice(2), fileURLToPath(new URL('..', import.meta.url)))
  const cssDir = join(opts.root, '.output/public/_nuxt')
  const cssFiles = listFiles(opts.root, cssDir, ['.css'])
  if (!existsSync(cssDir) || !cssFiles.length) {
    console.error('check-ds: CSS do build não encontrado em .output/public/_nuxt: rode "npm run build" antes')
    process.exit(2)
  }
  const css = cssFiles.map(f => readFileSync(join(opts.root, f), 'utf8')).join('\n')
  const sources = Object.fromEntries(listFiles(opts.root, join(opts.root, 'app'), ['.vue', '.ts', '.css'])
    .map(f => [f, readFileSync(join(opts.root, f), 'utf8')]))
  const allowlist = loadAllowlist(opts.allowlistFile, RULES)
  process.exit(runRatchet({
    name: 'check-ds',
    ownRules: RULES,
    findings: [...ghostFindings(sources, css, allowlist), ...tokenNameFindings(sources, allowlist)],
    allowlist,
    baselineFile: opts.baselineFile,
    update: opts.update,
    hint: 'Fantasma: declare o token/a classe em app/assets/css (tokens.css, theme.css) ou use um que exista. '
      + 'token-name: token cru sem prefixo do Tailwind (--surface-*, --fg-*...); a ponte --color-*/--text-* fica só no @theme. '
      + 'Exceção legítima: scripts/ds-allowlist.json com motivo e prazo.',
  }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
