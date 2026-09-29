#!/usr/bin/env node
// Guard (prd-ux-critica RF-F3b): no silent failure without a reason. A catch whose body has
// no code (only whitespace/comments) or a `.catch(() => {})` must carry an "intencional"
// comment explaining why (no network, localStorage, legacy...).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../app', import.meta.url).pathname

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.(vue|ts)$/.test(p) ? [p] : []
  })
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length
}

const problems = []
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  const rel = relative(ROOT, file)

  // try { } catch (e?) { ...body... }
  const re = /\bcatch\s*(\([^)]*\))?\s*\{/g
  let m
  while ((m = re.exec(src))) {
    let depth = 1
    let i = m.index + m[0].length
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
      i++
    }
    const body = src.slice(m.index + m[0].length, i - 1)
    const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').trim()
    const lineEnd = src.indexOf('\n', i)
    const tail = src.slice(i, lineEnd === -1 ? undefined : lineEnd)
    if (!code && !/intencional/i.test(body + tail)) problems.push(`${rel}:${lineOf(src, m.index)} catch sem tratamento`)
  }

  // promise.catch(() => {})
  const lines = src.split('\n')
  lines.forEach((line, n) => {
    if (/\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\)/.test(line) && !/intencional/i.test(line)) {
      problems.push(`${rel}:${n + 1} .catch(() => {}) sem tratamento`)
    }
  })
}

if (problems.length) {
  console.error(`check-empty-catch: ${problems.length} problema(s)\n` + problems.map(p => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log('check-empty-catch: ok')
