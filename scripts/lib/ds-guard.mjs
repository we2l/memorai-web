// Shared pieces of the design system guards (ADR-027 §8, prd-ds-v3-fundacao RF-0.1/RF-0.2):
// file listing, comment blanking, the explicit allowlist (scripts/ds-allowlist.json) and the
// ratchet (scripts/ds-baseline.json: count per rule and per file; a run fails when a file goes up).
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Files under `dir` ending in one of `exts`, as sorted POSIX paths relative to `root`. */
export function listFiles(root, dir, exts) {
  const out = []
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) visit(p)
      else if (exts.some(e => name.endsWith(e))) out.push(relative(root, p).split(sep).join('/'))
    }
  }
  if (existsSync(dir)) visit(dir)
  return out.sort()
}

/** Same length, same line breaks: offsets and line numbers survive the blanking. */
export const blank = s => s.replace(/[^\n]/g, ' ')

/**
 * Comments blanked out: HTML comments, block comments and `//` line comments that start a line
 * or follow whitespace (never the `//` of a URL). A color inside a comment renders nothing.
 */
export function blankComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[ \t])\/\/[^\n]*/gm, (m, lead) => lead + blank(m.slice(lead.length)))
}

/** index → { line (1-based), text } of the original source. */
export function lineLocator(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  const lines = text.split('\n')
  return (index) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= index) lo = mid
      else hi = mid - 1
    }
    return { line: lo + 1, text: lines[lo] }
  }
}

/** `app/components/landing/**` → RegExp; `*` stays inside one path segment. */
export function globToRegExp(glob) {
  const esc = s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${glob.split('**').map(part => part.split('*').map(esc).join('[^/]*')).join('.*')}$`)
}

/**
 * Explicit exceptions: { entries: [{ path, rules, motivo, prazo, match? }] }.
 * - `path` is a glob relative to the repo root; `match` (optional) is a RegExp tested on the line.
 * - `prazo` is required: "permanente", a phase ("Fase 4h") or a date (YYYY-MM-DD). A past date fails the run.
 * Only the entries of the rules a guard owns are returned.
 */
export function loadAllowlist(file, ownRules, today = new Date().toISOString().slice(0, 10)) {
  const errors = []
  if (!existsSync(file)) return { entries: [], errors: [`allowlist não encontrada: ${file}`] }
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  const entries = []
  for (const [i, e] of (raw.entries ?? []).entries()) {
    const where = `ds-allowlist #${i} (${e.path ?? '?'})`
    if (typeof e.path !== 'string' || !e.path) errors.push(`${where}: "path" obrigatório`)
    if (!Array.isArray(e.rules) || !e.rules.length) errors.push(`${where}: "rules" obrigatório`)
    if (!String(e.motivo ?? '').trim()) errors.push(`${where}: "motivo" obrigatório`)
    if (!String(e.prazo ?? '').trim()) errors.push(`${where}: "prazo" obrigatório`)
    else if (/^\d{4}-\d{2}-\d{2}$/.test(e.prazo) && e.prazo < today) errors.push(`${where}: prazo vencido em ${e.prazo} (${e.motivo})`)
    const rules = (e.rules ?? []).filter(r => ownRules.includes(r))
    if (!rules.length || typeof e.path !== 'string') continue
    entries.push({ ...e, rules, pathRe: globToRegExp(e.path), matchRe: e.match ? new RegExp(e.match) : null, used: 0 })
  }
  return { entries, errors }
}

/** The entry that excuses this finding (and counts it as used), if any. */
export function allowedBy(allowlist, { rule, file, text }) {
  const entry = allowlist.entries.find(e => e.rules.includes(rule) && e.pathRe.test(file) && (!e.matchRe || e.matchRe.test(text)))
  if (entry) entry.used++
  return entry
}

export function readBaseline(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
}

export const total = (files = {}) => Object.values(files).reduce((acc, n) => acc + n, 0)

/** findings [{ rule, file }] → { rule: { file: n } }, with every own rule present. */
export function countByFile(findings, ownRules) {
  const counts = Object.fromEntries(ownRules.map(r => [r, {}]))
  for (const f of findings) counts[f.rule][f.file] = (counts[f.rule][f.file] ?? 0) + 1
  return counts
}

/** Per rule and per file: what went above the baseline and what went below it. */
export function compare(baseline, counts) {
  const increased = []
  const decreased = []
  for (const [rule, files] of Object.entries(counts)) {
    const base = baseline[rule] ?? {}
    for (const file of [...new Set([...Object.keys(base), ...Object.keys(files)])].sort()) {
      const was = base[file] ?? 0
      const now = files[file] ?? 0
      if (now > was) increased.push({ rule, file, was, now })
      else if (now < was) decreased.push({ rule, file, was, now })
    }
  }
  return { increased, decreased }
}

/** Rewrites the own rules with the current counts (zeros dropped, files sorted); other keys stay. */
export function writeBaseline(file, baseline, counts) {
  const next = { ...baseline }
  for (const [rule, files] of Object.entries(counts)) {
    next[rule] = Object.fromEntries(Object.entries(files).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)))
  }
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`)
}

/**
 * Runs the ratchet and prints the report. Returns the exit code:
 * 0 ok (or --update), 1 a count went up or the allowlist has an error.
 */
export function runRatchet({ name, ownRules, findings, allowlist, baselineFile, update, hint, maxLines = 30 }) {
  const baseline = readBaseline(baselineFile)
  const counts = countByFile(findings, ownRules)
  const summary = ownRules.map(r => `${r} ${total(counts[r])}`).join(' · ')

  if (allowlist.errors.length) {
    console.error(`${name}: allowlist inválida\n${allowlist.errors.map(e => `  - ${e}`).join('\n')}`)
    return 1
  }

  if (update) {
    writeBaseline(baselineFile, baseline, counts)
    console.log(`${name}: linha de base gravada (${summary})`)
    return 0
  }

  const { increased, decreased } = compare(baseline, counts)
  for (const e of allowlist.entries.filter(e => !e.used)) {
    console.warn(`${name}: aviso: exceção sem uso em ds-allowlist.json (${e.path}, ${e.rules.join('/')}): remova-a`)
  }
  if (decreased.length) {
    console.log(`${name}: baixou (rode \`node scripts/${name}.mjs --update\` para travar o ganho):`)
    for (const d of decreased) console.log(`  - ${d.rule} ${d.file}: ${d.was} → ${d.now}`)
  }
  if (increased.length) {
    console.error(`${name}: ${increased.length} arquivo(s) acima da linha de base (scripts/ds-baseline.json)`)
    for (const inc of increased) {
      console.error(`  - ${inc.rule} ${inc.file}: ${inc.was} → ${inc.now}`)
      const lines = findings.filter(f => f.rule === inc.rule && f.file === inc.file)
      for (const f of lines.slice(0, maxLines)) console.error(`      ${f.file}:${f.line}: ${f.match}  ${f.text.trim().slice(0, 100)}`)
      if (lines.length > maxLines) console.error(`      … mais ${lines.length - maxLines}`)
    }
    if (hint) console.error(hint)
    return 1
  }
  const base = ownRules.map(r => `${r} ${total(baseline[r])}`).join(' · ')
  console.log(`${name}: ok (${summary}; linha de base: ${base})`)
  return 0
}

/** Shared CLI flags: --root <repo>, --baseline <file>, --allowlist <file>, --update. */
export function cliOptions(argv, defaultRoot) {
  const arg = (flag, fallback) => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : fallback
  }
  const root = arg('--root', defaultRoot)
  return {
    root,
    baselineFile: arg('--baseline', join(root, 'scripts/ds-baseline.json')),
    allowlistFile: arg('--allowlist', join(root, 'scripts/ds-allowlist.json')),
    update: argv.includes('--update'),
  }
}
