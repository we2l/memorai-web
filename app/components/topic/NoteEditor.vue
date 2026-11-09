<template>
  <div ref="editorWrapperRef" class="relative w-full" :class="{ 'is-reading': !editable }">
    <!-- Formatting of the selection, only while editing (the card/IA/tira-dúvidas actions are SelectionActions) -->
    <div
      v-if="showBubbleMenu && editable"
      ref="bubbleMenuRef"
      class="absolute z-popover flex -translate-x-1/2 items-center gap-0.5 rounded-control bg-float px-1.5 py-1 shadow-float"
      :style="bubbleMenuStyle"
      role="toolbar"
      aria-label="Formatação"
    >
      <button
        v-for="btn in bubbleButtons"
        :key="btn.label"
        type="button"
        class="flex size-8 items-center justify-center rounded-row transition-colors duration-fast"
        :class="btn.active?.() ? 'bg-action-subtle text-action-fg' : 'text-fg hover:bg-soft hover:text-fg-strong'"
        :title="btn.label"
        :aria-label="btn.label"
        :aria-pressed="btn.active?.() ? 'true' : 'false'"
        @mousedown.prevent="btn.action"
      >
        <component :is="btn.icon" class="size-4" aria-hidden="true" />
      </button>
    </div>

    <!-- Editor content -->
    <EditorContent :editor="editor" class="prose-notion" />

    <!-- Editor hint (editing only) -->
    <div v-if="editable" class="flex select-none items-center gap-4 border-t border-hairline px-3 py-2 text-label text-fg-muted">
      <span><kbd class="mr-1 rounded-tag bg-soft px-1.5 shadow-0 font-sans text-label text-fg">/</kbd> comandos</span>
      <span><kbd class="mr-1 rounded-tag bg-soft px-1.5 shadow-0 font-sans text-label text-fg">Ctrl+Shift+C</kbd> cloze</span>
    </div>

    <!-- Slash command menu -->
    <div
      v-if="slashMenu.open"
      ref="slashMenuRef"
      class="absolute z-popover max-h-80 w-72 overflow-y-auto rounded-float bg-float p-1.5 shadow-float"
      :style="slashMenu.style"
    >
      <div class="flex flex-col" role="listbox" aria-label="Blocos">
        <button
          v-for="(item, index) in filteredSlashItems"
          :key="item.label"
          type="button"
          role="option"
          :aria-selected="index === slashMenu.selectedIndex ? 'true' : 'false'"
          class="flex w-full items-center gap-3 rounded-row px-3 py-2 text-left"
          :class="index === slashMenu.selectedIndex ? 'bg-action-subtle' : 'hover:bg-soft'"
          @mousedown.prevent="selectSlashItem(item)"
          @mouseenter="slashMenu.selectedIndex = index"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-row" :class="index === slashMenu.selectedIndex ? 'bg-raised text-action-fg' : 'bg-soft text-fg'">
            <component :is="item.icon" class="size-4.5" aria-hidden="true" />
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="text-meta font-medium text-fg-strong">{{ item.label }}</span>
            <span class="text-label text-fg-muted">{{ item.description }}</span>
          </span>
        </button>
        <p v-if="!filteredSlashItems.length" class="p-3 text-center text-meta text-fg-muted">
          Nenhum resultado
        </p>
      </div>
    </div>

    <!-- Subpage dropdown -->
    <TopicSubpageDropdown
      v-if="subpageDropdown.open && topicId"
      :topic-id="topicId"
      :position="subpageDropdown.position"
      @select="onSubpageSelect"
      @create="onSubpageCreate"
      @close="subpageDropdown.open = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { Callout } from '~/extensions/callout'
import { SubpageBlock } from '~/extensions/subpage-block'
import { PageLinks } from '~/extensions/page-links'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, LinkIcon,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus,
  ImagePlus, AlertTriangle, Lightbulb, ShieldAlert, Type,
  FolderOpen,
} from 'lucide-vue-next'

// The text of a note (prd-4c-material-v3 RF-F2): reading (`editable: false`, a PDF note) or editing (the
// slash menu, formatting of the selection, cloze). `pageLinks` turns the job's "(pág. X-Y)" into links
// that open the PDF on that page, only on screen (extensions/page-links.ts). The actions on a selected
// excerpt (card, 3 cards with AI, tira-dúvidas) live outside, in material/SelectionActions.vue.
const props = defineProps<{
  modelValue?: Record<string, any> | null
  editable?: boolean
  topicId?: string | null
  /** A PDF note: "(pág. X-Y)" become links (emits `open-page`) */
  pageLinks?: boolean
}>()

const emit = defineEmits<{
  /** A user edit. `read` serializes the document (on demand); `size` is its ProseMirror size. */
  (e: 'edit', read: () => Record<string, any>, size: number): void
  (e: 'open-page', page: number): void
  (e: 'navigate-topic', topicId: string): void
  /** The document is on screen (the outline can look for its headings) */
  (e: 'ready'): void
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

  bubbleMenuStyle.value = { top: `${topY}px`, left: `${centerX}px` }
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
  { label: 'Tópico', description: 'Criar ou abrir um tópico', icon: FolderOpen, command: () => openSubpageDropdown() },
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
const topicStore = useTopicStore()

// === Subpage dropdown (state) ===
const subpageDropdown = reactive({
  open: false,
  position: { top: 0, left: 0 },
})

// getJSON() of the whole document on every keystroke was the typing cost of big notes
// (prd-performance-caderno RF-F4): an edit only marks the JSON stale; whoever needs it calls readDoc()
let docJSON: Record<string, any> | null = props.modelValue ?? null
let docStale = false

function readDoc(): Record<string, any> {
  if (docStale && editor.value && !editor.value.isDestroyed) {
    docJSON = editor.value.getJSON()
    docStale = false
  }
  return docJSON ?? { type: 'doc', content: [] }
}

const editor = useEditor({
  content: props.modelValue ?? '',
  editable: props.editable !== false,
  extensions: [
    ...useTiptapBase({
      // tabindex: the outline ("Nesta parte") puts the focus on the heading it scrolls to
      starterKit: { heading: { HTMLAttributes: { tabindex: '-1' } } },
      link: { openOnClick: false, HTMLAttributes: { class: 'notion-link' } },
      placeholder: ({ node, pos }) => {
        if (pos === 0 || (node.type.name === 'paragraph' && pos <= 1)) {
          return 'Escreva ou digite / para blocos. Suas notas melhoram cards, quiz e podcast.'
        }
        return ''
      },
    }),
    Callout,
    SubpageBlock.configure({
      onNavigate: (topicId: string) => emit('navigate-topic', topicId),
    }),
    ...(props.pageLinks ? [PageLinks.configure({ onOpen: (page: number) => emit('open-page', page) })] : []),
  ],
  onCreate: ({ editor: ed }) => {
    // The note may have arrived between setup and mount (lazy chunk): the watcher below had no editor yet
    if (props.modelValue && props.modelValue !== docJSON) {
      ed.commands.setContent(props.modelValue, { emitUpdate: false })
      docJSON = props.modelValue
      docStale = false
    }
    void nextTick(() => emit('ready'))
  },
  onUpdate: ({ editor: ed }) => {
    docStale = true
    emit('edit', readDoc, ed.state.doc.content.size)
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
    // Accessible name of the text area (axe aria-input-field-name on the material route)
    attributes: { role: 'textbox', 'aria-label': 'Conteúdo da nota', 'aria-multiline': 'true' },
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

// === Subpage dropdown (functions — depend on editor) ===
function openSubpageDropdown() {
  if (!editor.value || !props.topicId) return

  // Position dropdown near cursor (text deletion already handled by selectSlashItem)
  const coords = editor.value.view.coordsAtPos(editor.value.state.selection.from)
  const wrapperRect = editorWrapperRef.value?.getBoundingClientRect()
  if (wrapperRect) {
    subpageDropdown.position = {
      top: coords.bottom - wrapperRect.top + 8,
      left: coords.left - wrapperRect.left,
    }
  }

  // Delay opening to next frame — ensures the slash menu click event fully completes
  // before the dropdown mounts and registers its click-outside listener
  setTimeout(() => {
    subpageDropdown.open = true
  }, 0)
}

async function onSubpageCreate(name: string) {
  if (!props.topicId) return
  subpageDropdown.open = false
  const created = await topicStore.create({ name, parent_id: props.topicId })
  if (created?.id && editor.value) {
    editor.value.chain().focus().insertSubpage(created.id).run()
  }
}

function onSubpageSelect(topicId: string) {
  subpageDropdown.open = false
  if (editor.value) {
    editor.value.chain().focus().insertSubpage(topicId).run()
  }
}

// External content (another note, a restored draft, AI preview, PDF generation): not a user edit,
// so no autosave. The JSON this editor produced comes back as the same object: a reference check
// replaces the 2 stringifies per edit
watch(() => props.modelValue, (val) => {
  if (!editor.value || val === docJSON) return
  editor.value.commands.setContent(val ?? '', { emitUpdate: false })
  docJSON = val ?? null
  docStale = false
})

watch(() => props.editable, (val) => {
  if (!editor.value) return
  // Reading ↔ editing is not an edit: no update event, no autosave
  editor.value.setEditable(val !== false, false)
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
  readDoc() // the autosave or draft of the last keystrokes may read it after the editor is gone
  editor.value?.destroy()
})
</script>

<style>
/* Rich text of a note (prd-4c-material-v3 RF-F2): the only CSS of the editor, because the content is
   ProseMirror's own DOM (no classes to put utilities on). Tokens only (ADR-027 §1): sizes from the @theme
   scales, colors from the semantic tokens, nothing literal. Off-screen blocks skip style, layout and paint
   (content-visibility): typing in a 300k-character note pays for what is on screen. */
.prose-notion .tiptap {
  outline: none;
  /* E2 (prd-visual-e2 RF-4.3): the reading size of the material, 17/1.7 */
  font-size: var(--text-title);
  line-height: 1.7;
  color: var(--fg);
  overflow-wrap: break-word;
}
.prose-notion .tiptap > * {
  content-visibility: auto;
  contain-intrinsic-size: auto 1.7em;
}
.prose-notion .tiptap > :first-child { margin-top: 0; }
.prose-notion .tiptap p { margin: 0.5em 0; }
.prose-notion .tiptap :is(h1, h2, h3) {
  color: var(--fg-strong);
  font-weight: var(--font-weight-strong);
  letter-spacing: -0.01em;
  scroll-margin-top: calc(var(--topnav-h) + 4.5rem);
  outline: none;
}
.prose-notion .tiptap h1 { font-size: var(--text-page-title); line-height: 1.25; margin: 1.75em 0 0.4em; }
.prose-notion .tiptap h2 { font-size: var(--text-section); line-height: 1.3; margin: 1.5em 0 0.35em; }
.prose-notion .tiptap h3 { font-size: var(--text-body); line-height: 1.4; margin: 1.25em 0 0.25em; }
.prose-notion .tiptap :is(h1, h2, h3):focus-visible { box-shadow: 0 0 0 2px var(--focus-ring); border-radius: var(--radius-tag); }
.prose-notion .tiptap ul { list-style: disc; padding-left: 1.5em; margin: 0.25em 0; }
.prose-notion .tiptap ol { list-style: decimal; padding-left: 1.5em; margin: 0.25em 0; }
.prose-notion .tiptap li { margin-bottom: 0.15em; }
.prose-notion .tiptap li p { margin: 0; }
.prose-notion .tiptap blockquote { border-left: 3px solid var(--line-strong); padding-left: 1em; margin: 0.75em 0; color: var(--fg-muted); }
.prose-notion .tiptap hr { border: none; border-top: 1px solid var(--line-strong); margin: 2em 0; }
.prose-notion .tiptap img { max-width: 100%; border-radius: var(--radius-row); margin: 1.5em 0; }
.prose-notion .tiptap .callout { border-radius: var(--radius-row); padding: 1rem 1.25rem; margin: 1.5em 0; border-left: 3px solid var(--state-info); background: var(--state-info-bg); }
.prose-notion .tiptap .callout[data-callout-type="error"] { background: var(--state-danger-bg); border-left-color: var(--state-danger); }
.prose-notion .tiptap .callout[data-callout-type="insight"] { background: var(--state-success-bg); border-left-color: var(--state-success); }
.prose-notion .tiptap .callout[data-callout-type="gotcha"] { background: var(--state-warning-bg); border-left-color: var(--state-warning); }
.prose-notion .tiptap :is(.notion-link, .page-link) { color: var(--action-fg); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.prose-notion .tiptap .page-link { border-radius: var(--radius-tag); }
.prose-notion .tiptap .page-link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.prose-notion .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; pointer-events: none; height: 0; color: var(--fg-muted); }
.is-reading .prose-notion .tiptap p.is-editor-empty:first-child::before { content: none; }
.prose-notion .tiptap .cloze-chip { background: var(--action-subtle); color: var(--action-fg); padding: 0.1em 0.4em; border-radius: var(--radius-tag); font-weight: 500; }
</style>
