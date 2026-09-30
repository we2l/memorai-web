// @vitest-environment jsdom
// DOMPurify does not sanitize correctly under happy-dom
import { describe, it, expect } from 'vitest'
import { useSanitize } from '~/composables/useSanitize'

describe('useSanitize', () => {
  const { sanitize } = useSanitize()

  it('removes style, event handlers and javascript: links', () => {
    const out = sanitize('<p style="color:red" onclick="x()">a</p><img src="https://x.com/a.png" onerror="alert(1)"><a href="javascript:alert(1)">l</a>')
    expect(out).not.toContain('style=')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('javascript:')
  })

  it('forces rel/target on safe links', () => {
    const out = sanitize('<a href="https://baigi.com.br">ok</a>')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
  })

  it('drops insecure image src', () => {
    const out = sanitize('<img src="http://evil.com/a.png">')
    expect(out).not.toContain('src=')
  })

  it('keeps https and data:image src', () => {
    expect(sanitize('<img src="https://s3.amazonaws.com/a.png">')).toContain('src="https://s3.amazonaws.com/a.png"')
    expect(sanitize('<img src="data:image/png;base64,AAAA">')).toContain('src="data:image/png;base64,AAAA"')
  })

  it('preserves cloze data attributes and classes', () => {
    const out = sanitize('<span class="cloze-chip evil" data-cloze-index="1" data-cloze-hint="dica">A</span><span class="cloze-blank">...</span>')
    expect(out).toContain('data-cloze-index="1"')
    expect(out).toContain('data-cloze-hint="dica"')
    expect(out).toContain('class="cloze-chip"')
    expect(out).toContain('class="cloze-blank"')
    expect(out).not.toContain('evil')
  })
})
