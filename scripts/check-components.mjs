#!/usr/bin/env node
// Unresolved component guard (prd-correcoes-experiencia RF-F1): a PascalCase tag that Nuxt does not
// register renders nothing in production, silently (B1: <ReviewSessionSummary> vs the registered
// FlashcardReviewSessionSummary). Every PascalCase tag in app/**/*.vue must be in the components.d.ts Nuxt
// generated (run `nuxi prepare` or the build first), imported/declared in the file's <script>, or a Vue built-in.
// Why it stays next to check-ds (tasks 15.9): check-ds looks at classes and variables, never at component tags.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const VUE_BUILTINS = new Set(['Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense', 'Component', 'Slot'])

/**
 * Where Nuxt wrote components.d.ts (QA 2026-11 M9). `nuxi prepare` and dev write to .nuxt; `nuxi build` (and the
 * vitest environment) write to node_modules/.cache/nuxt/.nuxt when .nuxt already exists (@nuxt/kit loadNuxtConfig).
 * The newest of the two is the last generation; null when there is none.
 */
export function resolveComponentsDts(rootDir) {
  const found = ['.nuxt/components.d.ts', 'node_modules/.cache/nuxt/.nuxt/components.d.ts']
    .map(p => join(rootDir, p))
    .filter(p => existsSync(p))
    .map(p => ({ path: p, mtime: statSync(p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  return found[0] ?? null
}

/** A component file newer than the generated list: the list is old and would give false results. */
export function newerComponents(componentsDir, since) {
  if (!existsSync(componentsDir)) return []
  return walk(componentsDir).filter(f => statSync(f).mtimeMs > since)
}

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

function main() {
  const rootDir = fileURLToPath(new URL('..', import.meta.url))
  const ROOT = join(rootDir, 'app')
  const dts = resolveComponentsDts(rootDir)
  if (!dts) {
    console.error('check-components: components.d.ts não encontrado em .nuxt nem em node_modules/.cache/nuxt/.nuxt — rode "npx nuxi prepare" (ou o build) antes')
    process.exit(1)
  }
  const stale = newerComponents(join(ROOT, 'components'), dts.mtime)
  if (stale.length) {
    console.error(`check-components: ${relative(rootDir, dts.path)} é mais velho que ${stale.length} componente(s) (ex.: ${relative(rootDir, stale[0])}) — rode "npx nuxi prepare" (ou o build) de novo`)
    process.exit(1)
  }
  const registered = new Set([...readFileSync(dts.path, 'utf8').matchAll(/^export const (\w+)\s*:/gm)].map(m => m[1]))

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
  console.log(`check-components: ok (${relative(rootDir, dts.path)})`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
