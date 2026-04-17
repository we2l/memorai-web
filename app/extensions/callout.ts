import { Node, mergeAttributes } from '@tiptap/core'

export interface CalloutOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type: string) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addOptions() {
    return { types: ['error', 'insight', 'gotcha'] }
  },

  addAttributes() {
    return {
      type: {
        default: 'insight',
        parseHTML: el => el.getAttribute('data-callout-type'),
        renderHTML: attrs => ({ 'data-callout-type': attrs.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'callout' }), 0]
  },

  addCommands() {
    return {
      setCallout: (type: string) => ({ commands }) => {
        return commands.wrapIn(this.name, { type })
      },
      unsetCallout: () => ({ commands }) => {
        return commands.lift(this.name)
      },
    }
  },
})
