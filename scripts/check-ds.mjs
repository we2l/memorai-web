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
// Component guards (prd-ds-v3-fundacao RF-2.4, tasks 14.3; read from the sources, no build needed):
//   component-class  btn-*, card*, input-base, textarea-base and skeleton outside app/components/ui/
//                    (UiButton, UiSection, UiInput, UiTextarea, UiSkeleton)
//   overlay          `fixed inset-0` outside UiDialog/UiSheet (one modal layer: Esc, focus, scroll lock)
//   spin             animate-spin outside UiSpinner (UiButton/UiIconButton `loading`)
//   switch-role      role="switch" outside UiSwitch
//   arbitrary        arbitrary values, `[var(--x)]` and `(--x)` included; allowed: grid templates, viewport
//                    heights (dvh/svh/vh) and calc() with the shell measures (raio-X §E.2)
//   important        `!` in a class and !important in a <style>
//   inline-style     static style="" with a color or a size
//   dark-style       .dark inside a <style> (dark mode comes from the tokens)
//   z-index          z-<n> / z-[n] outside ui/ and shell/ (z-sticky ... z-toast)
//   deprecated       v2 names of scripts/ds-v3-map.json: classes and var(--v2) (the codemod swaps them)
//   text-min         a font size below 13 px (ADR-035 §2, RN-4): text-[Npx|Nrem] in a class, font-size/font in a
//                    <style> or app CSS; the landing keeps its own scale (ADR-028) and is out
// And a warning (no ratchet): a page with more than one variant="primary" (ADR-027 §6).
// Same allowlist and ratchet as check-tokens (scripts/ds-allowlist.json, scripts/ds-baseline.json).
// Usage: node scripts/check-ds.mjs [--update] [--root <repo>] [--baseline <file>] [--allowlist <file>]
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { allowedBy, blank, blankComments, cliOptions, lineLocator, listFiles, loadAllowlist, runRatchet } from './lib/ds-guard.mjs'

export const GHOST_RULES = ['ghost-var', 'ghost-class', 'token-name']
export const COMPONENT_RULES = ['component-class', 'overlay', 'spin', 'switch-role', 'arbitrary', 'important', 'inline-style', 'dark-style', 'z-index', 'deprecated', 'text-min']
export const RULES = [...GHOST_RULES, ...COMPONENT_RULES]

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


// ============ Component guards (RF-2.4) ============

const COMPONENT_CLASS = /^(?:btn-(?:primary|secondary|ghost|danger|again|hard|good|easy)|card|card-base|card-warm|input-base|textarea-base|skeleton)$/
const OVERLAY_FILES = ['app/components/ui/Dialog.vue']
const SHELL_MEASURE = /--(?:nav-h|topnav-h|bottomnav-h|miniplayer-h|sticky-action-h|toast-bottom|fab-bottom|sidebar-w|gutter)|safe-area/
const STYLE_SIZE_OR_COLOR = /(?:^|;)\s*(?:color|background(?:-color)?|border(?:-[a-z]+)?|outline|box-shadow|fill|stroke|(?:min-|max-)?(?:width|height)|font-size|line-height|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|gap|top|left|right|bottom|inset)\s*:/i

/** Variants (md:hover:), important marks and the utility of a class token. */
export function splitToken(token) {
  let depth = 0
  let cut = 0
  for (let i = 0; i < token.length; i++) {
    const c = token[i]
    if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth--
    else if (c === ':' && depth === 0) cut = i + 1
  }
  let base = token.slice(cut)
  const important = base.startsWith('!') || base.endsWith('!')
  base = base.replace(/^!|!$/g, '')
  return { variants: token.slice(0, cut), base, important }
}

/** An arbitrary value outside the ones raio-X §E.2 allows. */
export function isForbiddenArbitrary(base) {
  const value = /\[(.+)\]/.exec(base)?.[1] ?? (/-\((--[\w-]+)\)/.test(base) ? base : null)
  if (value === null) return false
  if (/^grid-(?:cols|rows)-\[|^grid-template/.test(base)) return false
  if (/\d(?:dvh|svh|lvh|vh)\b/.test(value) && !value.includes('var(')) return false
  if (value.includes('calc(') && SHELL_MEASURE.test(value)) return false
  return true
}

/** The floor of the type scale (ADR-035 §2): 13 px (0.8125rem). */
export const MIN_FONT_PX = 13
const LANDING = /^app\/(?:components\/landing\/|pages\/index\.vue$)/

/** A px or rem size below the floor (em and % are relative: not judged). */
export function belowMinFont(value) {
  const m = /^(\d*\.?\d+)(px|rem)$/.exec(value)
  if (!m) return false
  const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
  return px < MIN_FONT_PX
}

/** Font sizes in CSS: font-size: X and the size of the font shorthand (font: 600 12px/1.2 ...). */
export function cssFontSizes(css) {
  const out = []
  for (const m of css.matchAll(/(?<![\w-])font-size\s*:\s*([\d.]+(?:px|rem))/g)) out.push({ value: m[1], index: m.index })
  for (const m of css.matchAll(/(?<![\w-])font\s*:[^;{}]*?(?<![\w.])([\d.]+(?:px|rem))(?=[\s/])/g)) out.push({ value: m[1], index: m.index })
  return out
}

/** <style> blocks of a .vue (offsets kept). */
function styleOf(file, source) {
  return file.endsWith('.vue') ? cssOf(file, source) : ''
}

/** v2 names from scripts/ds-v3-map.json: { classes: Set, vars: Set }. */
export function deprecatedNames(map) {
  return { classes: new Set(Object.keys(map.classes ?? {})), vars: new Set(Object.keys(map.vars ?? {})) }
}

/** Component-guard findings of the app sources (no build needed). */
export function componentFindings(sources, map, allowlist) {
  const deprecated = deprecatedNames(map)
  const findings = []
  for (const [file, source] of Object.entries(sources)) {
    const isVue = file.endsWith('.vue')
    if (file.endsWith('.css') && !LANDING.test(file)) {
      const locateCss = lineLocator(source)
      for (const f of cssFontSizes(blankComments(source))) {
        if (!belowMinFont(f.value)) continue
        const { line, text } = locateCss(f.index)
        const finding = { rule: 'text-min', file, line, text, match: `font-size ${f.value}` }
        if (!allowedBy(allowlist, finding)) findings.push(finding)
      }
    }
    if (!isVue && !file.endsWith('.ts')) continue
    const inUi = file.startsWith('app/components/ui/')
    const inShell = file.startsWith('app/components/shell/')
    const locate = lineLocator(source)
    const add = (rule, match, index) => {
      const { line, text } = locate(index)
      const finding = { rule, file, line, text, match }
      if (!allowedBy(allowlist, finding)) findings.push(finding)
    }

    const refs = isVue ? templateClassRefs(source) : []
    const byAttribute = new Map()
    for (const ref of refs) {
      const { base, important } = splitToken(ref.name)
      const list = byAttribute.get(ref.index) ?? []
      list.push(base)
      byAttribute.set(ref.index, list)
      if (COMPONENT_CLASS.test(base) && !inUi) add('component-class', ref.name, ref.index)
      if (base === 'animate-spin' && file !== 'app/components/ui/Spinner.vue') add('spin', ref.name, ref.index)
      if (isForbiddenArbitrary(base)) add('arbitrary', ref.name, ref.index)
      if (important) add('important', ref.name, ref.index)
      if (/^-?z-(?:\d+|\[.+\])$/.test(base) && !inUi && !inShell) add('z-index', ref.name, ref.index)
      if (deprecated.classes.has(base)) add('deprecated', ref.name, ref.index)
      const size = /^text-\[([\d.]+(?:px|rem))\]$/.exec(base)?.[1]
      if (size && belowMinFont(size) && !LANDING.test(file)) add('text-min', ref.name, ref.index)
    }
    for (const [index, bases] of byAttribute) {
      if (bases.includes('fixed') && bases.includes('inset-0') && !OVERLAY_FILES.includes(file)) add('overlay', 'fixed inset-0', index)
    }

    const text = blankComments(source)
    if (file !== 'app/components/ui/Switch.vue') {
      for (const m of text.matchAll(/role\s*=\s*["']switch["']|role:\s*['"]switch['"]/g)) add('switch-role', m[0], m.index)
    }
    for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) if (deprecated.vars.has(m[1])) add('deprecated', m[1], m.index)
    if (isVue) {
      for (const m of text.matchAll(/(?<![\w:-])style\s*=\s*"([^"]*)"/g)) {
        if (STYLE_SIZE_OR_COLOR.test(m[1])) add('inline-style', `style="${m[1].slice(0, 40)}"`, m.index)
      }
      const css = blankComments(styleOf(file, source))
      if (!LANDING.test(file)) for (const f of cssFontSizes(css)) if (belowMinFont(f.value)) add('text-min', `font-size ${f.value}`, f.index)
      for (const m of css.matchAll(/!important/g)) add('important', '!important', m.index)
      for (const m of css.matchAll(/(?<![\w-])\.dark\b/g)) add('dark-style', '.dark', m.index)
    }
  }
  return findings
}

/** Pages with more than one variant="primary" (warning only: a dialog inside may carry its own). Internal pages
 * (app/pages/_ds.vue, the catalog) are skipped. */
export function multiPrimaryPages(sources) {
  return Object.entries(sources)
    .filter(([file]) => file.startsWith('app/pages/') && file.endsWith('.vue') && !file.startsWith('app/pages/_'))
    .map(([file, source]) => ({ file, count: (blankComments(source).match(/\bvariant="primary"/g) ?? []).length }))
    .filter(p => p.count > 1)
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
  const mapFile = join(opts.root, 'scripts/ds-v3-map.json')
  const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : { vars: {}, classes: {}, components: {} }
  for (const p of multiPrimaryPages(sources)) {
    console.warn(`check-ds: aviso: ${p.file} tem ${p.count} variant="primary" (um por tela, ADR-027 §6; diálogo conta à parte)`)
  }
  process.exit(runRatchet({
    name: 'check-ds',
    ownRules: RULES,
    findings: [...ghostFindings(sources, css, allowlist), ...tokenNameFindings(sources, allowlist), ...componentFindings(sources, map, allowlist)],
    allowlist,
    baselineFile: opts.baselineFile,
    update: opts.update,
    hint: 'Fantasma: declare o token/a classe em app/assets/css (tokens.css, theme.css) ou use um que exista. '
      + 'token-name: token cru sem prefixo do Tailwind (--surface-*, --fg-*...); a ponte --color-*/--text-* fica só no @theme. '
      + 'Guardas de componente: use UiButton, UiSection, UiInput, UiSkeleton, UiSwitch, UiDialog/UiSheet e UiSpinner (loading), '
      + 'utilities com nome (bg-raised, min-h-touch, z-overlay) e os nomes v3 (node scripts/codemod-ds-v3.mjs <arquivo> troca os v2). '
      + 'Exceção legítima: scripts/ds-allowlist.json com motivo e prazo.',
  }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
