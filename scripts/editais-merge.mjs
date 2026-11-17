#!/usr/bin/env node
/**
 * Updates a conferred edital file with a new export of the API without losing what was filled by hand
 * (prd-paginas-edital-publicas §3.3, "Atualizar"). `editais:public-curate … --stdout` writes the hand-filled fields
 * (`edital`, `group`, `related_blog`, `changes`, …) as null: redirecting it straight to content/editais/<slug>.json
 * after a correction (--proposal) would erase them. This takes from the export only what the API owns and keeps the rest.
 *
 * Usage: ssh … docker exec -i baigi-app php artisan editais:public-curate {id} {slug} --source-url=… --proposal=- --stdout < lista.json \
 *          | node scripts/editais-merge.mjs {slug}
 * A new file (no content/editais/<slug>.json yet) is written as the export. Then: fill `edital`, add `changes[]`, update
 * `checked_at`, `npm run build` (the build validates) and `node scripts/check-editais.mjs {slug}`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Fields of the export that come from the reading (the API); everything else is the owner's */
export const API_FIELDS = ['id', 'proposal', 'proposal_sha256', 'counts', 'weights', 'source', 'exported_at', 'source_url', 'checked_at']

export function mergeEdital(current, exported) {
  if (!current) return exported
  if (exported.slug !== current.slug) throw new Error(`o export é do slug ${exported.slug}, o arquivo é ${current.slug}`)
  const merged = { ...current }
  for (const key of API_FIELDS) if (key in exported) merged[key] = exported[key]
  // The order of §4 (diffs stay readable)
  return Object.fromEntries([...Object.keys(exported), ...Object.keys(current)].filter((k, i, all) => all.indexOf(k) === i).map(k => [k, merged[k]]))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2]
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error('Uso: … --stdout | node scripts/editais-merge.mjs <slug>')
    process.exit(1)
  }
  const input = readFileSync(0, 'utf8')
  let exported
  try { exported = JSON.parse(input) } catch {
    console.error('A entrada não é JSON: confira a saída do editais:public-curate --stdout')
    process.exit(1)
  }
  const file = resolve(import.meta.dirname, '..', 'content/editais', `${slug}.json`)
  const current = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  const merged = mergeEdital(current, exported)
  writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`)
  console.error(current ? `content/editais/${slug}.json: lista, sha, contagem, peso e fonte atualizados; o resto ficou. Atualize checked_at e changes[] se for retificação.` : `content/editais/${slug}.json criado: preencha o bloco edital à mão.`)
}
