import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { findPageRefs, PageLinks } from '~/extensions/page-links'

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Controle difuso' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Texto da seção. ' }, { type: 'text', marks: [{ type: 'italic' }], text: '(pág. 12-15)' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Outra seção (págs. 40–41) e (p. 7).' }] },
  ],
}

let editor: Editor | null = null
afterEach(() => { editor?.destroy(); editor = null })

describe('links de página só na exibição (prd-4c-material-v3 RF-F2, tasks 6.3)', () => {
  it('acha os marcadores do job e ignora parênteses comuns', () => {
    expect(findPageRefs('fim *(pág. 12-15)* e (pag. 3) e (p. 9)').map(r => [r.page, r.end])).toEqual([[12, 15], [3, null], [9, null]])
    expect(findPageRefs('(art. 52, X) e (2024)')).toEqual([])
  })

  it('vira link no DOM sem mudar o JSON salvo; o clique em leitura abre a página', () => {
    const onOpen = vi.fn()
    const el = document.createElement('div')
    document.body.appendChild(el)
    editor = new Editor({ element: el, content: structuredClone(doc), editable: false, extensions: [StarterKit, PageLinks.configure({ onOpen })] })
    const links = el.querySelectorAll<HTMLElement>('[data-page]')
    expect([...links].map(l => l.dataset.page)).toEqual(['12', '40', '7'])
    expect(links[0]!.getAttribute('role')).toBe('link')
    expect(links[0]!.getAttribute('aria-label')).toBe('Ver no PDF, páginas 12 a 15')
    expect(editor.getJSON()).toEqual(doc)
    links[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onOpen).toHaveBeenCalledWith(40)
  })

  it('editar só reescaneia o bloco tocado e continua achando os marcadores', () => {
    const el = document.createElement('div')
    editor = new Editor({ element: el, content: structuredClone(doc), extensions: [StarterKit, PageLinks] })
    // Typing a new marker in the last paragraph
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' (pág. 99)')
    expect([...el.querySelectorAll<HTMLElement>('[data-page]')].map(l => l.dataset.page)).toEqual(['12', '40', '7', '99'])
    // Breaking a marker removes its link
    const text = editor.getText()
    expect(text).toContain('(pág. 12-15)')
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'sem páginas' }] }] })
    expect(el.querySelectorAll('[data-page]').length).toBe(0)
  })
})
