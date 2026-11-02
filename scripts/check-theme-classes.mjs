#!/usr/bin/env node
// Color utility guard (prd-correcoes-experiencia RF-F6): Tailwind 4 only generates `bg-x` when
// `--color-x` is in an @theme block. A token declared only in :root/.dark (B5: bg-accent-primary)
// silently produces no CSS. Fails when app/**/*.{vue,ts} uses a color utility of a project color
// family whose name is neither an @theme color nor an exact @utility of app/assets/css (custom @utility
// classes take no opacity modifier: `text-base-muted/40` generates nothing either).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../app', import.meta.url))
// main.css only imports tokens/theme/base/legacy-v2 (DS v3): read every file of the folder
const CSS_DIR = join(ROOT, 'assets/css')
const CSS = readdirSync(CSS_DIR).filter(f => f.endsWith('.css')).sort().map(f => readFileSync(join(CSS_DIR, f), 'utf8')).join('\n')
const PREFIXES = 'bg|text|border(?:-[xytrbl]|-[se])?|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow'

const themeBlocks = [...CSS.matchAll(/@theme\b[^{]*\{([\s\S]*?)\}/g)].map(m => m[1]).join('\n')
const themeVar = (ns) => new Set([...themeBlocks.matchAll(new RegExp(`--${ns}-([a-z0-9-]+)\\s*:`, 'g'))].map(m => m[1]))
const themeColors = themeVar('color')
// `text-base` is a font size, `shadow-lg` a shadow: same prefix, other namespaces
const themeOther = { text: themeVar('text'), shadow: themeVar('shadow') }
const utilities = new Set([...CSS.matchAll(/@utility\s+([a-z0-9-]+)\s*\{/g)].map(m => m[1]))

// Project color families: first segment of every project color name (@theme, :root/.dark, @utility)
const colorNames = [
  ...themeColors,
  ...[...CSS.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map(m => m[1]),
  ...[...utilities].map(u => u.match(new RegExp(`^(?:${PREFIXES})-(.+)$`))?.[1]).filter(Boolean),
]
const FAMILIES = new Set(colorNames.map(n => n.split('-')[0]))

const CLASS = new RegExp(`(?<![\\w-])((?:[a-z0-9-]+:)*)!?(${PREFIXES})-([a-z][a-z0-9-]*)(?:/(\\d+|\\[[^\\]]+\\]))?(?![\\w-])`, 'g')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.(vue|ts)$/.test(p) ? [p] : []
  })
}

function valid(prefix, name, modifier) {
  const base = prefix.replace(/-[xytrbl]$|-[se]$/, '')
  if (themeColors.has(name)) return true
  if (themeOther[base]?.has(name)) return !modifier
  // Exact custom utility (bg-surface, text-base-muted...): no opacity modifier support
  return utilities.has(`${prefix}-${name}`) && !modifier
}

const problems = []
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file)
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(CLASS)) {
      const [, , prefix, name, modifier] = m
      if (!FAMILIES.has(name.split('-')[0])) continue
      if (!valid(prefix, name, modifier)) problems.push(`${rel}:${i + 1}: ${m[0].replace(/^(?:[a-z0-9-]+:)+/, '')}`)
    }
  })
}

if (problems.length) {
  console.error(`check-theme-classes: ${problems.length} classe(s) de cor sem regra no CSS (declare o token no @theme de app/assets/css (theme.css))\n` + problems.map(p => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log('check-theme-classes: ok')
