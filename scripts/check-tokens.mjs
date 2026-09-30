#!/usr/bin/env node
// Anti-hex guard (prd-ux-critica RF-F10.3): colors come from design tokens (main.css).
// Ignores the landing (pages/index.vue, components/landing/**) and main.css.
// Allowlist a line with a /* tokens-allow */ (or <!-- tokens-allow -->) comment.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../app', import.meta.url).pathname
const IGNORE = [/^pages\/index\.vue$/, /^components\/landing\//, /^assets\/css\/main\.css$/]
const HEX = /#[0-9a-fA-F]{3,8}\b/
const RAW = /\b(?:text|bg|border)-(?:red|green|blue|emerald|amber|yellow|gray|slate|purple|violet|orange|pink)-\d+/

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.vue') ? [p] : []
  })
}

const problems = []
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file)
  if (IGNORE.some(r => r.test(rel))) continue
  const src = readFileSync(file, 'utf8')
  // Illustrations with their own brand palette opt out as a whole
  if (/tokens-allow-file/.test(src)) continue
  src.split('\n').forEach((line, i) => {
    if (/tokens-allow/.test(line)) return
    if (/mask-image/.test(line)) return
    // SVG attribute ids like href="#grad" are not colors
    const scrubbed = line.replace(/(?:href|url\()\s*=?\s*["']?#[\w-]+/g, '')
    if (HEX.test(scrubbed) || RAW.test(scrubbed)) problems.push(`${rel}:${i + 1}: ${line.trim().slice(0, 110)}`)
  })
}

if (problems.length) {
  console.error(`check-tokens: ${problems.length} ocorrência(s) de cor crua\n` + problems.map(p => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log('check-tokens: ok')
