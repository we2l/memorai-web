import { Mark, mergeAttributes } from '@tiptap/core'

export interface ClozeMarkerOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clozeMarker: {
      setCloze: (index: number) => ReturnType
      unsetCloze: () => ReturnType
    }
  }
}

export const ClozeMarker = Mark.create<ClozeMarkerOptions>({
  name: 'clozeMarker',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      index: {
        default: 1,
        parseHTML: (el) => parseInt(el.getAttribute('data-cloze-index') || '1'),
        renderHTML: (attrs) => ({ 'data-cloze-index': attrs.index }),
      },
      hint: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-cloze-hint'),
        renderHTML: (attrs) => attrs.hint ? { 'data-cloze-hint': attrs.hint } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-cloze-index]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'cloze-chip' }), 0]
  },

  addCommands() {
    return {
      setCloze: (index: number) => ({ chain, state }) => {
        const { to } = state.selection
        return chain()
          .setMark(this.name, { index })
          .setTextSelection(to)
          .unsetMark(this.name)
          .run()
      },
      unsetCloze: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => {
        // Will be handled by the component that knows the next index
        return false
      },
    }
  },
})

/**
 * Convert cloze mark HTML to {{c1::text}} syntax for backend storage.
 */
export function markToCloze(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('span[data-cloze-index]').forEach((el) => {
    const index = el.getAttribute('data-cloze-index') || '1'
    const hint = el.getAttribute('data-cloze-hint')
    const text = el.textContent || ''
    const cloze = hint ? `{{c${index}::${text}::${hint}}}` : `{{c${index}::${text}}}`
    el.replaceWith(cloze)
  })
  return div.innerHTML
}

/**
 * Convert {{c1::text}} syntax to cloze mark HTML for editor display.
 */
export function clozeToMark(text: string): string {
  return text.replace(
    /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]+?))?\}\}/g,
    (_match, index, answer, hint) => {
      const attrs = hint
        ? `data-cloze-index="${index}" data-cloze-hint="${hint}"`
        : `data-cloze-index="${index}"`
      return `<span class="cloze-chip" ${attrs}>${answer}</span>`
    },
  )
}

/**
 * Get the next cloze index from editor HTML content.
 */
export function getNextClozeIndex(html: string): number {
  const matches = html.matchAll(/data-cloze-index="(\d+)"/g)
  let max = 0
  for (const m of matches) {
    max = Math.max(max, parseInt(m[1]))
  }
  return max + 1
}
