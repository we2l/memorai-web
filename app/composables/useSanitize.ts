import DOMPurify from 'dompurify'

export function useSanitize() {
  function sanitize(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'img', 'span', 'div', 'sub', 'sup', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'mark'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'width', 'height', 'style'],
      ALLOW_DATA_ATTR: false,
    })
  }

  return { sanitize }
}
