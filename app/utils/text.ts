/**
 * Caderno name from free text: first non-empty line, cut at `max` chars on a
 * word boundary (never mid-word). Falls back to a hard cut for a single long word.
 */
export function smartTitle(text: string, max = 40): string {
  const line = (text ?? '').split(/\r?\n/).map(l => l.trim()).find(Boolean) ?? ''
  const clean = line.replace(/\s+/g, ' ')
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max + 1)
  const lastSpace = cut.lastIndexOf(' ')
  const title = lastSpace > 0 ? cut.slice(0, lastSpace) : clean.slice(0, max)
  return title.replace(/[\s,;:.\-–—]+$/, '')
}
