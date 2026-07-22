<template>
  <div class="notion-editor" ref="editorWrapperRef">
    <!-- Bubble Menu (manually positioned) -->
    <div
      v-if="showBubbleMenu"
      ref="bubbleMenuRef"
      class="bubble-menu"
      :style="bubbleMenuStyle"
    >
      <button
        v-for="btn in bubbleButtons"
        :key="btn.label"
        class="bubble-btn"
        :class="{ active: btn.active?.() }"
        :title="btn.label"
        @mousedown.prevent="btn.action"
      >
        <component :is="btn.icon" :size="16" />
      </button>
    </div>

    <!-- Editor content -->
    <EditorContent :editor="editor" class="prose-notion" />

    <!-- Slash command menu -->
    <div
      v-if="slashMenu.open"
      ref="slashMenuRef"
      class="slash-menu"
      :style="slashMenu.style"
    >
      <div class="slash-menu-list">
        <button
          v-for="(item, index) in filteredSlashItems"
          :key="item.label"
          class="slash-item"
          :class="{ selected: index === slashMenu.selectedIndex }"
          @mousedown.prevent="selectSlashItem(item)"
          @mouseenter="slashMenu.selectedIndex = index"
        >
          <span class="slash-icon">
            <component :is="item.icon" :size="18" />
          </span>
          <span class="slash-text">
            <span class="slash-label">{{ item.label }}</span>
            <span class="slash-desc">{{ item.description }}</span>
          </span>
        </button>
        <div v-if="!filteredSlashItems.length" class="slash-empty">
          Nenhum resultado
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Callout } from '~/extensions/callout'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, LinkIcon,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus,
  ImagePlus, AlertTriangle, Lightbulb, ShieldAlert, Type,
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
}>()

const editorWrapperRef = ref<HTMLElement>()
const bubbleMenuRef = ref<HTMLElement>()
const slashMenuRef = ref<HTMLElement>()

// === Bubble Menu ===
const showBubbleMenu = ref(false)
const bubbleMenuStyle = ref<Record<string, string>>({})

function updateBubbleMenu() {
  if (!editor.value) return
  const { state } = editor.value
  const { from, to, empty } = state.selection

  if (empty || from === to) {
    showBubbleMenu.value = false
    return
  }

  // Check if selection is text (not node selection)
  const isText = state.selection.$from.parent.isTextblock
  if (!isText) {
    showBubbleMenu.value = false
    return
  }

  const view = editor.value.view
  const coords = view.coordsAtPos(from)
  const endCoords = view.coordsAtPos(to)
  const wrapperRect = editorWrapperRef.value?.getBoundingClientRect()
  if (!wrapperRect) return

  const centerX = (coords.left + endCoords.right) / 2 - wrapperRect.left
  const topY = Math.min(coords.top, endCoords.top) - wrapperRect.top - 48

  bubbleMenuStyle.value = {
    position: 'absolute',
    top: `${topY}px`,
    left: `${centerX}px`,
    transform: 'translateX(-50%)',
  }
  showBubbleMenu.value = true
}

const bubbleButtons = computed(() => {
  if (!editor.value) return []
  const e = editor.value
  return [
    { label: 'Negrito', icon: Bold, active: () => e.isActive('bold'), action: () => e.chain().focus().toggleBold().run() },
    { label: 'Itálico', icon: Italic, active: () => e.isActive('italic'), action: () => e.chain().focus().toggleItalic().run() },
    { label: 'Sublinhado', icon: UnderlineIcon, active: () => e.isActive('underline'), action: () => e.chain().focus().toggleUnderline().run() },
    { label: 'Tachado', icon: Strikethrough, active: () => e.isActive('strike'), action: () => e.chain().focus().toggleStrike().run() },
    { label: 'Link', icon: LinkIcon, active: () => e.isActive('link'), action: () => toggleLink() },
  ]
})

function toggleLink() {
  if (!editor.value) return
  if (editor.value.isActive('link')) {
    editor.value.chain().focus().unsetLink().run()
    return
  }
  const url = window.prompt('URL:')
  if (url) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

// === Slash Menu ===
const slashMenu = reactive({
  open: false,
  query: '',
  style: {} as Record<string, string>,
  selectedIndex: 0,
})

const slashItems = [
  { label: 'Texto', description: 'Parágrafo simples', icon: Type, command: (e: any) => e.chain().focus().setParagraph().run() },
  { label: 'Título 1', description: 'Título grande', icon: Heading1, command: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Título 2', description: 'Título médio', icon: Heading2, command: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Título 3', description: 'Título pequeno', icon: Heading3, command: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Lista', description: 'Lista com marcadores', icon: List, command: (e: any) => e.chain().focus().toggleBulletList().run() },
  { label: 'Lista numerada', description: 'Lista ordenada', icon: ListOrdered, command: (e: any) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Citação', description: 'Bloco de citação', icon: Quote, command: (e: any) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Divisor', description: 'Linha horizontal', icon: Minus, command: (e: any) => e.chain().focus().setHorizontalRule().run() },
  { label: 'Imagem', description: 'Upload de imagem', icon: ImagePlus, command: () => triggerImageUpload() },
  { label: 'Erro', description: 'Bloco de erro comum', icon: AlertTriangle, command: (e: any) => e.chain().focus().setCallout('error').run() },
  { label: 'Insight', description: 'Algo que aprendi', icon: Lightbulb, command: (e: any) => e.chain().focus().setCallout('insight').run() },
  { label: 'Pegadinha', description: 'Atenção — pegadinha!', icon: ShieldAlert, command: (e: any) => e.chain().focus().setCallout('gotcha').run() },
]

const filteredSlashItems = computed(() => {
  const q = slashMenu.query.toLowerCase()
  if (!q) return slashItems
  return slashItems.filter(i =>
    i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
  )
})

function selectSlashItem(item: typeof slashItems[0]) {
  if (!editor.value) return
  // Delete the /query text
  const { state } = editor.value
  const { from } = state.selection
  const deleteFrom = from - slashMenu.query.length - 1 // -1 for the /
  editor.value.chain().focus().deleteRange({ from: Math.max(0, deleteFrom), to: from }).run()
  item.command(editor.value)
  closeSlashMenu()
}

function closeSlashMenu() {
  slashMenu.open = false
  slashMenu.query = ''
  slashMenu.selectedIndex = 0
}

function handleSlashDetection(editorInstance: any) {
  const { state } = editorInstance
  const { from } = state.selection
  const textBefore = state.doc.textBetween(Math.max(0, from - 20), from)

  // Detect /command pattern
  const slashMatch = textBefore.match(/\/([a-zA-Zà-úÀ-Ú0-9]*)$/)

  if (slashMatch) {
    slashMenu.query = slashMatch[1]
    slashMenu.selectedIndex = 0

    // Position the menu near cursor
    const coords = editorInstance.view.coordsAtPos(from)
    const wrapperRect = editorWrapperRef.value?.getBoundingClientRect()
    if (wrapperRect) {
      slashMenu.style = {
        position: 'absolute',
        top: `${coords.bottom - wrapperRect.top + 8}px`,
        left: `${coords.left - wrapperRect.left}px`,
      }
    }
    slashMenu.open = true
  } else {
    if (slashMenu.open) closeSlashMenu()
  }
}

// === Editor ===
const editor = useEditor({
  content: props.modelValue ?? '',
  extensions: [
    StarterKit,
    Underline,
    Callout,
    Image.configure({ inline: false, allowBase64: false }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'notion-link' } }),
    Placeholder.configure({
      placeholder: ({ node, pos }) => {
        if (pos === 0 || (node.type.name === 'paragraph' && pos <= 1)) {
          return 'Escreva ou digite / para comandos'
        }
        return ''
      },
    }),
  ],
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getJSON())
    handleSlashDetection(ed)
  },
  onSelectionUpdate: ({ editor: ed }) => {
    updateBubbleMenu()
    // Close slash menu if selection moved away
    if (slashMenu.open) {
      handleSlashDetection(ed)
    }
  },
  onBlur: () => {
    // Delay hiding to allow button clicks
    setTimeout(() => {
      showBubbleMenu.value = false
    }, 200)
  },
  editorProps: {
    handleKeyDown: (_view, event) => {
      if (slashMenu.open) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          slashMenu.selectedIndex = Math.min(slashMenu.selectedIndex + 1, filteredSlashItems.value.length - 1)
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          slashMenu.selectedIndex = Math.max(slashMenu.selectedIndex - 1, 0)
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          const item = filteredSlashItems.value[slashMenu.selectedIndex]
          if (item) selectSlashItem(item)
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          closeSlashMenu()
          return true
        }
      }
      return false
    },
  },
})

watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const current = JSON.stringify(editor.value.getJSON())
  const incoming = JSON.stringify(val)
  if (current !== incoming) {
    editor.value.commands.setContent(val ?? '')
  }
})

// === Image upload ===
const imageInput = ref<HTMLInputElement | null>(null)
const { uploadImage } = useImageUpload()

function triggerImageUpload() {
  if (!imageInput.value) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.style.display = 'none'
    input.addEventListener('change', handleImageSelect)
    document.body.appendChild(input)
    imageInput.value = input
  }
  imageInput.value.value = ''
  imageInput.value.click()
}

async function handleImageSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !editor.value) return

  const url = await uploadImage(file)
  if (url) {
    editor.value.chain().focus().setImage({ src: url }).run()
  }
}

// Close slash menu on click outside
function handleClickOutside(event: MouseEvent) {
  if (slashMenu.open && slashMenuRef.value && !slashMenuRef.value.contains(event.target as Node)) {
    closeSlashMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  if (imageInput.value) imageInput.value.remove()
  editor.value?.destroy()
})
</script>

<style>
/* === Notion-like Editor Styles === */

.notion-editor {
  position: relative;
  width: 100%;
}

/* Editor content area */
.prose-notion .tiptap {
  outline: none;
  line-height: 1.7;
  color: var(--color-text-body, #50597A);
}

.prose-notion .tiptap > *:first-child {
  margin-top: 0;
}

/* Paragraphs */
.prose-notion .tiptap p {
  margin: 0.5em 0;
  font-size: 1rem;
}

/* Headings */
.prose-notion .tiptap h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-heading, #1F2343);
  margin: 2em 0 0.25em;
  line-height: 1.2;
}

.prose-notion .tiptap h2 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-heading, #1F2343);
  margin: 1.5em 0 0.25em;
  line-height: 1.25;
}

.prose-notion .tiptap h3 {
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--color-text-heading, #1F2343);
  margin: 1.25em 0 0.25em;
  line-height: 1.3;
}

/* Lists */
.prose-notion .tiptap ul {
  list-style: disc;
  padding-left: 1.5em;
  margin: 0.25em 0;
}

.prose-notion .tiptap ol {
  list-style: decimal;
  padding-left: 1.5em;
  margin: 0.25em 0;
}

.prose-notion .tiptap li {
  margin-bottom: 0.15em;
}

.prose-notion .tiptap li p {
  margin: 0;
}

/* Blockquote */
.prose-notion .tiptap blockquote {
  border-left: 3px solid var(--color-primary-200, #D8CBFF);
  padding-left: 1em;
  margin: 0.75em 0;
  opacity: 0.85;
}

/* Horizontal rule */
.prose-notion .tiptap hr {
  border: none;
  border-top: 1px solid var(--color-border-divider, #EFF2F8);
  margin: 2em 0;
  opacity: 0.6;
}

/* Images */
.prose-notion .tiptap img {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 1.5em 0;
}

/* Callouts */
.prose-notion .tiptap .callout {
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  margin: 1.5em 0;
}

.prose-notion .tiptap .callout[data-callout-type="error"] {
  background: rgba(239, 68, 68, 0.08);
  border-left: 3px solid #EF4444;
}

.prose-notion .tiptap .callout[data-callout-type="insight"] {
  background: rgba(34, 197, 94, 0.08);
  border-left: 3px solid #22C55E;
}

.prose-notion .tiptap .callout[data-callout-type="gotcha"] {
  background: rgba(245, 158, 11, 0.08);
  border-left: 3px solid #F59E0B;
}

.prose-notion .tiptap .callout[data-callout-type="info"] {
  background: rgba(56, 189, 248, 0.06);
  border-left: 3px solid #38BDF8;
}

/* Link styling */
.prose-notion .tiptap .notion-link {
  color: var(--color-primary-500, #6F3FF5);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.prose-notion .tiptap .notion-link:hover {
  color: var(--color-primary-600, #5A2EE6);
}

/* Placeholder */
.prose-notion .tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  pointer-events: none;
  height: 0;
  color: var(--color-text-muted, #8A90A8);
  opacity: 0.7;
}

/* Cloze chips */
.prose-notion .tiptap .cloze-chip {
  background: var(--color-primary-50, #F5F2FF);
  color: var(--color-primary-500, #6F3FF5);
  padding: 0.1em 0.4em;
  border-radius: 4px;
  font-weight: 500;
}

/* === Bubble Menu === */

.bubble-menu {
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: var(--color-bg-card, #FFFFFF);
  border: 1px solid var(--color-border-base, #E7EAF3);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(45, 35, 66, 0.12);
  animation: fadeIn 150ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.bubble-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--color-text-body, #50597A);
  transition: all 150ms;
}

.bubble-btn:hover {
  background: var(--color-bg-soft, #F5F6FA);
  color: var(--color-text-heading, #1F2343);
}

.bubble-btn.active {
  background: var(--color-primary-50, #F5F2FF);
  color: var(--color-primary-500, #6F3FF5);
}

/* === Slash Command Menu === */

.slash-menu {
  z-index: 50;
  min-width: 280px;
  max-width: 320px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--color-bg-card, #FFFFFF);
  border: 1px solid var(--color-border-base, #E7EAF3);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(45, 35, 66, 0.12);
  padding: 6px;
  animation: fadeIn 150ms ease;
}

.slash-menu-list {
  display: flex;
  flex-direction: column;
}

.slash-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 100ms;
  text-align: left;
  width: 100%;
}

.slash-item:hover,
.slash-item.selected {
  background: var(--color-primary-50, #F5F2FF);
}

.slash-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-bg-soft, #F5F6FA);
  color: var(--color-text-body, #50597A);
  flex-shrink: 0;
}

.slash-item.selected .slash-icon,
.slash-item:hover .slash-icon {
  background: var(--color-primary-100, #ECE6FF);
  color: var(--color-primary-500, #6F3FF5);
}

.slash-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.slash-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-heading, #1F2343);
}

.slash-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted, #8A90A8);
}

.slash-empty {
  padding: 12px;
  text-align: center;
  color: var(--color-text-muted, #8A90A8);
  font-size: 0.875rem;
}

/* === Dark mode === */
:root.dark .bubble-menu,
:root.dark .slash-menu {
  background: var(--color-bg-card);
  border-color: var(--color-border-base);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

:root.dark .slash-icon {
  background: var(--color-bg-soft);
}
</style>
