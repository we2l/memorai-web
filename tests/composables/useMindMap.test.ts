import { describe, it, expect } from 'vitest'
import { escapeTree } from '~/composables/useMindMap'

describe('useMindMap escapeTree', () => {
  it('escapes HTML in node content and keeps the raw text', () => {
    const payload = '<img src=x onerror=alert(1)>'
    const tree = escapeTree({
      content: 'Raiz',
      children: [{ content: payload, children: [], payload: { type: 'conceito' } }],
    })

    const child = tree.children[0]!
    expect(child.content).toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(child.payload?.raw).toBe(payload)
    expect(child.payload?.type).toBe('conceito')
    expect(tree.payload?.raw).toBe('Raiz')
  })
})
