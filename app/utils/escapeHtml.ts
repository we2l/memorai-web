const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escapes text for safe interpolation into HTML (content or attribute).
 */
export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]!)
}
