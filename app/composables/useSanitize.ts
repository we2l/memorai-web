import DOMPurify from 'dompurify'
import { escapeHtml } from '~/utils/escapeHtml'

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'u', 's', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'img', 'audio', 'span', 'div', 'sub', 'sup', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'mark']
const ALLOWED_ATTR = ['href', 'src', 'alt', 'class', 'target', 'rel', 'width', 'height', 'controls', 'data-cloze-index', 'data-cloze-hint', 'data-callout-type', 'data-subpage-id']

const SAFE_HREF = /^(https?:|mailto:)/i
const SAFE_SRC = /^(https:|data:image\/(png|jpe?g|gif|webp);)/i
// Local dev serves media from http://localhost:8037
const DEV_SRC = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i
const SAFE_CLASS = /^(cloze-[\w-]+|callout[\w-]*)$/

function isSafeSrc(src: string): boolean {
  return SAFE_SRC.test(src) || (import.meta.dev && DEV_SRC.test(src))
}

let hookRegistered = false

function registerHook() {
  if (hookRegistered) return
  hookRegistered = true

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element
    if (!el.tagName) return

    if (el.tagName === 'A') {
      const href = el.getAttribute('href')
      if (href && SAFE_HREF.test(href.trim())) {
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noopener noreferrer')
      } else {
        el.removeAttribute('href')
        el.removeAttribute('target')
      }
    }

    if (el.tagName === 'IMG' || el.tagName === 'AUDIO') {
      const src = el.getAttribute('src')
      if (src && !isSafeSrc(src.trim())) el.removeAttribute('src')
    }

    const cls = el.getAttribute('class')
    if (cls !== null) {
      const kept = cls.split(/\s+/).filter(token => SAFE_CLASS.test(token))
      if (kept.length) el.setAttribute('class', kept.join(' '))
      else el.removeAttribute('class')
    }
  })
}

export function useSanitize() {
  function sanitize(dirty: string): string {
    // SSR (no DOM): never return raw HTML
    if (!DOMPurify.isSupported) return escapeHtml(dirty ?? '')

    registerHook()

    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
    })
  }

  return { sanitize }
}
