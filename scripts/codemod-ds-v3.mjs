#!/usr/bin/env node
// Codemod v2 → v3 of the design system (prd-ds-v3-fundacao RF-2.3, tasks 14.1). Reads scripts/ds-v3-map.json
// (the same table feeds the `deprecated` rule of check-ds) and app/assets/css/theme.css (v3 color names).
// Dry-run by default: prints, per file, every change and the list for manual review. --write applies.
//   - var(--v2) anywhere in the file (template, script, <style>) → var(--v3), unless the map marks it manual;
//   - class tokens in templates (class, *-class, string literals of :class), variants and modifiers kept:
//     v2 names (text-base-muted → text-fg-muted) and `prefix-[var(--x)]` / `prefix-(--x)` → the v3 utility
//     (bg-[var(--badge-danger-bg)] → bg-danger-subtle);
//   - <button>/<NuxtLink>/<a> with btn-primary|secondary|ghost|danger → <UiButton variant> (the
//     `!min-h-0 !px-3 !py-1.5` small button becomes size="sm");
//   - card, input-base, skeleton, rounded-xl, shadow-lg... (marked `manual`) are listed, never swapped blindly.
// Usage: node scripts/codemod-ds-v3.mjs [--write] [--json] <file|dir>...
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { blank, blankComments, lineLocator, listFiles } from './lib/ds-guard.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

export const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'border-x', 'border-y', 'border-t', 'border-r', 'border-b', 'border-l', 'border-s', 'border-e',
  'ring', 'ring-offset', 'outline', 'fill', 'stroke', 'divide', 'placeholder', 'caret', 'accent', 'decoration', 'from', 'via', 'to',
]
const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger']
const SMALL_BUTTON = /^!(?:min-h-0|px-\d+(?:\.\d+)?|py-\d+(?:\.\d+)?)$|^(?:text-small|text-meta|text-sm)$/

export function loadMap(file = join(ROOT, 'scripts/ds-v3-map.json')) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** Semantic variable → v3 color name, from the `@theme inline` bridge of theme.css (--color-page: var(--surface-page)). */
export function themeColors(css = readFileSync(join(ROOT, 'app/assets/css/theme.css'), 'utf8')) {
  const bySemantic = new Map()
  const names = new Set()
  for (const m of css.matchAll(/--color-([\w-]+)\s*:\s*var\((--[\w-]+)\)/g)) {
    names.add(m[1])
    if (!bySemantic.has(m[2])) bySemantic.set(m[2], m[1])
  }
  return { bySemantic, names }
}

/** `md:hover:!bg-x/20` → { variants: 'md:hover:', important, base: 'bg-x', modifier: '/20', suffix } (brackets kept whole). */
export function parseToken(token) {
  let depth = 0
  let cut = 0
  for (let i = 0; i < token.length; i++) {
    const c = token[i]
    if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth--
    else if (c === ':' && depth === 0) cut = i + 1
  }
  const variants = token.slice(0, cut)
  let rest = token.slice(cut)
  const important = rest.startsWith('!') ? '!' : ''
  if (important) rest = rest.slice(1)
  const suffix = rest.endsWith('!') ? '!' : ''
  if (suffix) rest = rest.slice(0, -1)
  const mod = /\/(?:\d+(?:\.\d+)?|\[[^\]]+\])$/.exec(rest)
  const modifier = mod && !rest.endsWith(']') ? mod[0] : (mod && /\/\[[^\]]+\]$/.test(rest) && rest.lastIndexOf('/[') > rest.lastIndexOf('-[') ? mod[0] : '')
  const base = modifier ? rest.slice(0, -modifier.length) : rest
  return { variants, important, base, modifier, suffix }
}

/** v3 target of a var for a utility prefix: { var } or { manual }. */
function resolveVar(name, prefix, map, theme) {
  const entry = map.vars[name]
  if (entry) {
    if (entry.manual) return { manual: `${name}: ${entry.manual}` }
    return { var: (prefix === 'bg' && entry.bg) || entry.default }
  }
  if (theme.bySemantic.has(name)) return { var: name }
  const own = /^--color-([\w-]+)$/.exec(name)
  if (own && theme.names.has(own[1])) return { name: own[1] }
  return null
}

/**
 * One class token → { to, manual? } (to === token when nothing changes; to === '' removes it).
 * Components (btn-*, card...) are left to the element pass and the manual list.
 */
export function transformClass(token, map, theme) {
  const t = parseToken(token)
  const wrap = base => base.split(' ').filter(Boolean).map(b => `${t.variants}${t.important}${b}${t.modifier}${t.suffix}`).join(' ')
  const cls = map.classes[t.base]
  if (cls) {
    if (cls.manual) return { to: token, manual: `${t.base}: ${cls.manual}` }
    return { to: cls.to === '' ? '' : wrap(cls.to) }
  }
  const comp = map.components[t.base]
  if (comp) return { to: token, manual: comp.manual ? `${t.base}: ${comp.manual}` : null }
  const arb = /^([a-z]+(?:-[a-z]+)*?)-(?:\[var\((--[\w-]+)\)\]|\((--[\w-]+)\))$/.exec(t.base)
  if (arb && COLOR_PREFIXES.includes(arb[1])) {
    const [, prefix] = arb
    const varName = arb[2] ?? arb[3]
    const target = resolveVar(varName, prefix, map, theme)
    if (!target) return { to: token }
    if (target.manual) return { to: token, manual: target.manual }
    const name = target.name ?? theme.bySemantic.get(target.var)
    if (!name) return { to: token, manual: `${t.base}: ${target.var} não tem utility v3 (use um token com cor no @theme).` }
    return { to: wrap(`${prefix}-${name}`) }
  }
  return { to: token }
}

/** Rewrites the class tokens of a string, collecting the changes. */
function rewriteTokens(text, map, theme, at, changes, manual) {
  return text.replace(/[^\s'"`{}]+/g, (token) => {
    if (token.includes('${')) return token
    const r = transformClass(token, map, theme)
    if (r.manual) manual.push({ index: at, token, reason: r.manual })
    if (r.to !== token) changes.push({ index: at, from: token, to: r.to || '(removida)' })
    return r.to
  }).replace(/ {2,}/g, ' ')
}

/** String literals of a :class expression rewritten in place (comparisons and call arguments kept). */
function rewriteExpression(expr, map, theme, at, changes, manual) {
  return expr.replace(/(===?|!==?|\()?(\s*)(['`])((?:(?!\3)[^\\]|\\.)*)\3/g, (m, cmp, ws, q, body) => {
    if (cmp) return m
    return `${ws}${q}${rewriteTokens(body, map, theme, at, changes, manual).trim()}${q}`
  })
}

const OPEN_TAG = /<(button|NuxtLink|a)\b((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g

/** Index of the `</tag>` that closes the element opened before `from`. */
function closingTag(source, tag, from) {
  const re = new RegExp(`<${tag}\\b(?:[^>"']|"[^"]*"|'[^']*')*?(/?)>|</${tag}\\s*>`, 'g')
  re.lastIndex = from
  let depth = 1
  for (let m = re.exec(source); m; m = re.exec(source)) {
    if (m[0].startsWith('</')) {
      if (--depth === 0) return { start: m.index, end: m.index + m[0].length }
    } else if (!m[1]) depth++
  }
  return null
}

/** <button class="btn-primary ..."> → <UiButton variant="primary" ...>. */
function rewriteButtons(source, changes, manual) {
  const template = templateRange(source)
  if (!template) return source
  let out = source
  let shift = 0
  for (const m of [...source.slice(0, template.end).matchAll(OPEN_TAG)]) {
    if (m.index < template.start) continue
    const [whole, tag, attrs, selfClose] = m
    const cls = /(^|\s)class="([^"]*)"/.exec(attrs)
    const tokens = cls ? cls[2].split(/\s+/).filter(Boolean) : []
    const btn = tokens.find(t => /^btn-(primary|secondary|ghost|danger)$/.test(t))
    if (/:class="[^"]*btn-/.test(attrs)) {
      manual.push({ index: m.index, token: 'btn-*', reason: 'btn-* em :class dinâmico: troque por <UiButton :variant>.' })
      continue
    }
    if (!btn || selfClose) continue
    const at = m.index + shift
    const close = closingTag(out, tag, at + whole.length)
    if (!close) {
      manual.push({ index: m.index, token: btn, reason: `<${tag}> sem fechamento encontrado.` })
      continue
    }
    const variant = btn.slice(4)
    const small = tokens.includes('!min-h-0')
    const kept = tokens.filter(t => t !== btn && !(small && SMALL_BUTTON.test(t)))
    let newAttrs = attrs.replace(cls[0], kept.length ? `${cls[1]}class="${kept.join(' ')}"` : '')
    newAttrs = ` variant="${variant}"${small ? ' size="sm"' : ''}${newAttrs.replace(/^\s+/, ' ')}`.replace(/\s+$/, '')
    const inner = out.slice(at + whole.length, close.start)
    if (/animate-spin/.test(inner)) manual.push({ index: m.index, token: btn, reason: 'Spinner dentro do botão: use a prop `loading` do UiButton.' })
    const opened = `<UiButton${newAttrs}>`
    out = `${out.slice(0, at)}${opened}${inner}</UiButton>${out.slice(close.end)}`
    shift += opened.length - whole.length + '</UiButton>'.length - (close.end - close.start)
    changes.push({ index: m.index, from: `<${tag} class="${btn}…">`, to: `<UiButton variant="${variant}"${small ? ' size="sm"' : ''}>` })
  }
  return out
}

function templateRange(source) {
  const open = /<template\b[^>]*>/.exec(source)
  if (!open) return null
  const end = source.lastIndexOf('</template>')
  return end > open.index ? { start: open.index, end } : null
}

/** Whole-file transform. Returns { output, changes, manual } with 1-based lines (no pass adds or removes a line). */
export function transformSource(source, file, map = loadMap(), theme = themeColors()) {
  const changes = []
  const manual = []
  let out = source

  // 1. Class tokens of the template first (static class/*-class and the string literals of :class): the
  //    `bg-[var(--x)]` targets depend on the prefix, which the plain var() pass below cannot see
  if (file.endsWith('.vue')) {
    const range = templateRange(out)
    if (range) {
      const head = out.slice(0, range.start)
      const tail = out.slice(range.end)
      let template = out.slice(range.start, range.end)
      const scrub = template.replace(/<!--[\s\S]*?-->/g, blank)
      const edits = []
      for (const m of scrub.matchAll(/(?<![\w:@.-])((?:v-bind)?:)?((?:[\w-]+-)?class)\s*=\s*"([^"]*)"/g)) {
        const [whole, bound, name, value] = m
        const at = range.start + m.index
        const next = bound
          ? rewriteExpression(value, map, theme, at, changes, manual)
          : rewriteTokens(value, map, theme, at, changes, manual).trim()
        if (next !== value) edits.push({ start: m.index, end: m.index + whole.length, text: `${bound ?? ''}${name}="${next}"` })
      }
      for (const e of edits.reverse()) template = template.slice(0, e.start) + e.text + template.slice(e.end)
      out = head + template + tail
      // 2. Buttons → UiButton
      out = rewriteButtons(out, changes, manual)
    }
  }

  // 3. Variables left, anywhere outside comments (template, script, <style>)
  const scrubbed = blankComments(out)
  out = out.replace(/var\(\s*(--[\w-]+)/g, (m, name, offset) => {
    const entry = map.vars[name]
    if (!entry || scrubbed[offset] !== out[offset]) return m
    if (entry.manual) {
      manual.push({ index: offset, token: name, reason: `${name}: ${entry.manual}` })
      return m
    }
    changes.push({ index: offset, from: name, to: entry.default })
    return m.replace(name, entry.default)
  })

  // Every pass keeps the line breaks: the original source locates all of them
  const locate = lineLocator(source)
  const withLine = list => list.map(e => ({ ...e, line: locate(Math.min(e.index, source.length - 1)).line }))
    .sort((a, b) => a.line - b.line)
    .map(({ index, ...rest }) => rest)
  const seen = new Set()
  const uniqueManual = withLine(manual).filter((m) => {
    const key = `${m.line}:${m.reason}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { output: out, changes: withLine(changes), manual: uniqueManual }
}

function filesOf(args) {
  return args.flatMap((a) => {
    const abs = join(ROOT, a)
    return statSync(abs).isDirectory() ? listFiles(ROOT, abs, ['.vue', '.ts']) : [a]
  })
}

function main() {
  const argv = process.argv.slice(2)
  const write = argv.includes('--write')
  const json = argv.includes('--json')
  const targets = argv.filter(a => !a.startsWith('--'))
  if (!targets.length) {
    console.error('uso: node scripts/codemod-ds-v3.mjs [--write] [--json] <arquivo|pasta>...')
    process.exit(2)
  }
  const map = loadMap()
  const theme = themeColors()
  const report = []
  for (const file of filesOf(targets)) {
    const source = readFileSync(join(ROOT, file), 'utf8')
    const r = transformSource(source, file, map, theme)
    if (!r.changes.length && !r.manual.length) continue
    report.push({ file, changes: r.changes, manual: r.manual })
    if (write && r.output !== source) writeFileSync(join(ROOT, file), r.output)
  }
  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  let changed = 0
  let review = 0
  for (const f of report) {
    changed += f.changes.length
    review += f.manual.length
    console.log(`\n${f.file}: ${f.changes.length} troca(s), ${f.manual.length} para revisão`)
    for (const c of f.changes) console.log(`  ${c.line}: ${c.from} → ${c.to}`)
    for (const m of f.manual) console.log(`  ${m.line}: [revisão] ${m.reason}`)
  }
  console.log(`\ncodemod-ds-v3: ${report.length} arquivo(s), ${changed} troca(s), ${review} para revisão manual${write ? ' (gravado)' : ' (dry-run: --write grava)'}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
