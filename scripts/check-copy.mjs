#!/usr/bin/env node
// Copy regression guard (prd-ux-critica RF-F7 / RN-UX-11): one term per concept,
// no false promises. Scans the template text of app/**/*.vue.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../app', import.meta.url).pathname
const ALLOW = new Set(['pages/importar.vue'])
const RULES = [
  { re: /\b(matéria|Matéria|subcaderno|Subcaderno)\b/, why: 'use Caderno / Tópico / Sub-tópico' },
  { re: /(?<![\w-])Decks?\b/, why: '"Deck" não aparece na UI (use caderno ou "baralho do Anki")' },
  { re: /30 segundos/, why: 'promessa de tempo falsa' },
  { re: /cards em breve/i, why: 'promessa falsa' },
]

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.vue') ? [p] : []
  })
}

/** Template only, without HTML comments and bound attribute values (code, not copy). */
function templateText(src) {
  const m = src.match(/<template>([\s\S]*)<\/template>/)
  if (!m) return ''
  return m[1].replace(/<!--[\s\S]*?-->/g, '').replace(/\s(?::|v-|@)[\w.:-]+="[^"]*"/g, '')
}

const problems = []
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file)
  if (ALLOW.has(rel)) continue
  const text = templateText(readFileSync(file, 'utf8'))
  text.split('\n').forEach((line, i) => {
    for (const { re, why } of RULES) {
      if (re.test(line)) problems.push(`${rel}: "${line.trim().slice(0, 100)}" — ${why}`)
    }
  })
}

if (problems.length) {
  console.error(`check-copy: ${problems.length} problema(s)\n` + problems.map(p => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log('check-copy: ok')
