#!/usr/bin/env node
// Raw color guard of the design system (ADR-027 §8, prd-ds-v3-fundacao RF-0.1/RF-0.2).
// Scans app/**/*.{vue,ts,css} (comments excluded) for colors outside the tokens:
//   hex       #RGB, #RGBA, #RRGGBB, #RRGGBBAA (SVG fragment refs like href="#grad" are not colors)
//   color-fn  rgb/rgba/hsl/hsla/hwb/lab/lch/oklab/oklch/color() with literal channels, and color-mix()
//             with a named color (var(), transparent and currentColor are not literals; a hex inside
//             is counted once, by `hex`)
//   palette   Tailwind default palette classes: every family of tailwindcss/theme.css + white/black,
//             with every color prefix (bg, text, border-x, ring-offset, fill, from, shadow...)
// Exceptions live in scripts/ds-allowlist.json (path, motivo, prazo). Ratchet: scripts/ds-baseline.json
// keeps the count per rule and per file; the run fails when a file goes above it.
// Usage: node scripts/check-tokens.mjs [--update] [--root <repo>] [--baseline <file>] [--allowlist <file>]
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { allowedBy, blank, blankComments, cliOptions, lineLocator, listFiles, loadAllowlist, runRatchet } from './lib/ds-guard.mjs'

export const RULES = ['hex', 'color-fn', 'palette']

// tests/scripts/checkTokens.test.ts keeps this list in sync with node_modules/tailwindcss/theme.css
export const PALETTE_FAMILIES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo',
  'violet', 'purple', 'fuchsia', 'pink', 'rose', 'slate', 'gray', 'zinc', 'neutral', 'stone',
  'mauve', 'olive', 'mist', 'taupe',
]
export const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'border-x', 'border-y', 'border-t', 'border-r', 'border-b', 'border-l', 'border-s', 'border-e',
  'ring', 'ring-offset', 'inset-ring', 'outline', 'fill', 'stroke', 'from', 'via', 'to', 'divide', 'placeholder',
  'caret', 'accent', 'decoration', 'shadow', 'inset-shadow', 'drop-shadow', 'text-shadow',
]

// `_` counts as a separator: inside Tailwind arbitrary values it stands for a space (shadow-[0_2px_rgba(...)])
const HEX = /(?<![a-zA-Z0-9&#./])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi
const COLOR_FN = /(?<![a-zA-Z0-9-])(?:(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[-+.\d]|color\(\s*(?:srgb(?:-linear)?|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz(?:-d50|-d65)?)\s+[-+.\d])/gi
const COLOR_MIX = /(?<![a-zA-Z0-9-])color-mix\(/gi
const PALETTE = new RegExp(`(?<![\\w-])(?:${COLOR_PREFIXES.join('|')})-(?:(?:${PALETTE_FAMILIES.join('|')})-(?:50|[1-9]00|950)|white|black)(?![\\w-])`, 'g')
// SVG fragment references and slot shorthands: `#id` there is a name, not a color
const NOT_COLORS = [
  /(?:xlink:)?href\s*=\s*["']#[\w-]+/g,
  /url\(\s*["']?#[\w-]+/g,
  /<template\b[^>]*?\s#[\w-]+/g,
]
const NOT_LITERAL = /^(?:var\(|transparent$|currentcolor$|#|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\()/i

/** Index right after the parenthesis that closes the one at `open`. */
function closeParen(text, open) {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')' && --depth === 0) return i + 1
  }
  return text.length
}

/** Top-level comma split of `color-mix(...)` arguments. */
function splitArgs(inner) {
  const out = []
  let depth = 0
  let start = 0
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++
    else if (inner[i] === ')') depth--
    else if (inner[i] === ',' && depth === 0) {
      out.push(inner.slice(start, i))
      start = i + 1
    }
  }
  out.push(inner.slice(start))
  return out
}

/** A color-mix() argument that is a named color (white, red...) after dropping the percentage. */
function hasNamedColor(args) {
  return args.slice(1).some((arg) => {
    const color = arg.replace(/_/g, ' ').replace(/\$\{[^}]*\}%?/g, '').replace(/-?[\d.]+%/g, '').trim()
    return color && !NOT_LITERAL.test(color) && /^[a-z]+$/i.test(color)
  })
}

/** Raw colors of one source text: [{ rule, index, match }]. */
export function scanColors(source) {
  let text = blankComments(source)
  for (const re of NOT_COLORS) text = text.replace(re, blank)
  const found = []
  for (const m of text.matchAll(HEX)) found.push({ rule: 'hex', index: m.index, match: m[0] })
  for (const m of text.matchAll(COLOR_FN)) found.push({ rule: 'color-fn', index: m.index, match: m[0].replace(/\s+$/, '') })
  for (const m of text.matchAll(COLOR_MIX)) {
    const open = m.index + m[0].length - 1
    const args = splitArgs(text.slice(open + 1, closeParen(text, open) - 1))
    if (hasNamedColor(args)) found.push({ rule: 'color-fn', index: m.index, match: 'color-mix(' })
  }
  for (const m of text.matchAll(PALETTE)) found.push({ rule: 'palette', index: m.index, match: m[0] })
  return found.sort((a, b) => a.index - b.index)
}

/** Findings of a file with its line, minus what the allowlist excuses. */
export function fileFindings(file, source, allowlist) {
  const locate = lineLocator(source)
  return scanColors(source).flatMap(({ rule, index, match }) => {
    const { line, text } = locate(index)
    const finding = { rule, file, line, text, match }
    return allowedBy(allowlist, finding) ? [] : [finding]
  })
}

function main() {
  const opts = cliOptions(process.argv.slice(2), fileURLToPath(new URL('..', import.meta.url)))
  const allowlist = loadAllowlist(opts.allowlistFile, RULES)
  const findings = listFiles(opts.root, join(opts.root, 'app'), ['.vue', '.ts', '.css'])
    .flatMap(file => fileFindings(file, readFileSync(join(opts.root, file), 'utf8'), allowlist))
  process.exit(runRatchet({
    name: 'check-tokens',
    ownRules: RULES,
    findings,
    allowlist,
    baselineFile: opts.baselineFile,
    update: opts.update,
    hint: 'Use um token do design system (ADR-027). Exceção legítima: scripts/ds-allowlist.json com motivo e prazo.',
  }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
