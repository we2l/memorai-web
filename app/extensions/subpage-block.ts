import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SubpageBlockView from '~/components/topic/SubpageBlockView.vue'

export interface SubpageBlockOptions {
  onNavigate?: (topicId: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subpageBlock: {
      insertSubpage: (topicId: string) => ReturnType
    }
  }
}

export const SubpageBlock = Node.create<SubpageBlockOptions>({
  name: 'subpageBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      onNavigate: undefined,
    }
  },

  addAttributes() {
    return {
      topicId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-subpage-id'),
        renderHTML: (attrs) => ({ 'data-subpage-id': attrs.topicId }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-subpage-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'subpage-block' })]
  },

  addCommands() {
    return {
      insertSubpage:
        (topicId: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { topicId },
          })
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SubpageBlockView)
  },
})
