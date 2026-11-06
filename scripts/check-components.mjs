#!/usr/bin/env node
// Unresolved component guard (prd-correcoes-experiencia RF-F1): a PascalCase tag that Nuxt does not
// register renders nothing in production, silently (B1: <ReviewSessionSummary> vs the registered
// FlashcardReviewSessionSummary). Every PascalCase tag in app/**/*.vue must be in .nuxt/components.d.ts
// (run `nuxi prepare` or the build first), imported/declared in the file's <script>, or a Vue built-in.
// Why it stays next to check-ds (tasks 15.9): check-ds looks at classes and variables, never at component tags.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../app', import.meta.url))
const DTS = fileURLToPath(new URL('../.nuxt/components.d.ts', import.meta.url))
const VUE_BUILTINS = new Set(['Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense', 'Component', 'Slot'])

if (!existsSync(DTS)) {
  console.error('check-components: .nuxt/components.d.ts não encontrado — rode "npx nuxi prepare" (ou o build) antes')
  process.exit(1)
}
const registered = new Set([...readFileSync(DTS, 'utf8').matchAll(/^export const (\w+)\s*:/gm)].map(m => m[1]))

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.vue') ? [p] : []
  })
}

/** Names bound in <script>: imports (default, named, aliased) and local declarations. */
function scriptBindings(script) {
  const names = new Set()
  for (const m of script.matchAll(/import\s+(?!type\b)([\s\S]*?)\s+from\s+['"][^'"]+['"]/g)) {
    const clause = m[1]
    const named = clause.match(/\{([\s\S]*)\}/)
    if (named) {
      for (const part of named[1].split(',')) {
        const local = part.replace(/^\s*type\s+/, '').split(/\s+as\s+/).pop()?.trim()
        if (local) names.add(local)
      }
    }
    const def = clause.replace(/\{[\s\S]*\}/, '').replace(/\*\s+as\s+/, '').split(',')[0]?.trim()
    if (def) names.add(def)
  }
  for (const m of script.matchAll(/\b(?:const|let|var|function|class)\s+([A-Z]\w*)/g)) names.add(m[1])
  return names
}

const problems = []
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  const scripts = [...src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n')
  // Blank out script, style and comments keeping the line count (exact line numbers)
  const blank = (s) => s.replace(/[^\n]/g, '')
  const template = src
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, blank)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
  const local = scriptBindings(scripts)
  template.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/<([A-Z][A-Za-z0-9]*)(?=[\s/>]|$)/g)) {
      const tag = m[1]
      if (registered.has(tag) || local.has(tag) || VUE_BUILTINS.has(tag)) continue
      problems.push(`${relative(ROOT, file)}:${i + 1}: <${tag}> não é um componente registrado`)
    }
  })
}

if (problems.length) {
  console.error(`check-components: ${problems.length} componente(s) não resolvido(s)\n` + problems.map(p => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log('check-components: ok')
