import type { EditalPage } from './types'

/** The sitemap's lastmod and the JSON-LD dateModified: the newest of checked_at and changes[].date (RF-W2) */
export function editalLastmod(p: Pick<EditalPage, 'checked_at' | 'changes'>): string {
  return [p.checked_at, ...p.changes.map(c => c.date)].sort().pop()!
}
