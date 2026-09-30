const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

/** Visible text of an HTML fragment (for search/preview): no tags, attributes or entities. */
export function htmlToPlain(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}
