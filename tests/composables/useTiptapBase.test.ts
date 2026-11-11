import { describe, it, expect, vi, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { useTiptapBase } from '~/composables/useTiptapBase'

// QA 2026-11 M7: Tiptap 3's StarterKit brings Link and Underline; a second copy warned and doubled the handlers
describe('useTiptapBase', () => {
  let editor: Editor | null = null
  afterEach(() => { editor?.destroy(); editor = null; vi.restoreAllMocks() })

  const names = (e: Editor) => e.extensionManager.extensions.map(x => x.name)

  it('sem extensões duplicadas, com o link do NoteEditor (openOnClick false, classe)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    editor = new Editor({
      extensions: useTiptapBase({ placeholder: '', link: { openOnClick: false, HTMLAttributes: { class: 'notion-link' } } }),
    })
    const all = names(editor)
    expect(all.filter(n => n === 'link')).toHaveLength(1)
    expect(all.filter(n => n === 'underline')).toHaveLength(1)
    expect(new Set(all).size).toBe(all.length)
    const link = editor.extensionManager.extensions.find(x => x.name === 'link')!
    expect(link.options.openOnClick).toBe(false)
    expect(link.options.HTMLAttributes.class).toBe('notion-link')
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/Duplicate extension/)
  })

  it('o RichInput mantém o que desliga no StarterKit e o sublinhado', () => {
    editor = new Editor({ extensions: useTiptapBase({ placeholder: '', starterKit: { heading: false, codeBlock: false } }) })
    const all = names(editor)
    expect(all).not.toContain('heading')
    expect(all).not.toContain('codeBlock')
    expect(all).toContain('underline')
    expect(editor.can().toggleUnderline()).toBe(true)
  })
})
