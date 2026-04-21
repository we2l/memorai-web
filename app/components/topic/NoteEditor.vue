<template>
  <div class="border border-base rounded-lg overflow-hidden">
    <!-- Toolbar -->
    <div v-if="editor" class="flex flex-wrap gap-1 p-2 border-b border-base bg-surface-secondary">
      <button v-for="btn in toolbar" :key="btn.label" class="p-1.5 rounded text-small transition-colors" :class="btn.active?.() ? 'bg-accent-primary-subtle text-accent-primary' : 'text-base-muted hover:bg-surface-tertiary'" :title="btn.label" @click="btn.action">
        <component :is="btn.icon" :size="16" />
      </button>
    </div>

    <!-- Editor -->
    <EditorContent :editor="editor" class="prose-editor p-4 min-h-[200px] max-h-[60vh] overflow-y-auto text-base-primary" />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Callout } from '~/extensions/callout'
import { Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3, List, ListOrdered, Quote, AlertTriangle, Lightbulb, ShieldAlert, ImagePlus } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
}>()

const editor = useEditor({
  content: props.modelValue ?? '',
  extensions: [
    StarterKit,
    Underline,
    Callout,
    Image.configure({ inline: false, allowBase64: false }),
    Placeholder.configure({ placeholder: 'Comece a escrever...' }),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getJSON())
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

const toolbar = computed(() => {
  if (!editor.value) return []
  const e = editor.value
  return [
    { label: 'Negrito', icon: Bold, active: () => e.isActive('bold'), action: () => e.chain().focus().toggleBold().run() },
    { label: 'Itálico', icon: Italic, active: () => e.isActive('italic'), action: () => e.chain().focus().toggleItalic().run() },
    { label: 'Sublinhado', icon: UnderlineIcon, active: () => e.isActive('underline'), action: () => e.chain().focus().toggleUnderline().run() },
    { label: 'Título 1', icon: Heading1, active: () => e.isActive('heading', { level: 1 }), action: () => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Título 2', icon: Heading2, active: () => e.isActive('heading', { level: 2 }), action: () => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Título 3', icon: Heading3, active: () => e.isActive('heading', { level: 3 }), action: () => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Lista', icon: List, active: () => e.isActive('bulletList'), action: () => e.chain().focus().toggleBulletList().run() },
    { label: 'Lista numerada', icon: ListOrdered, active: () => e.isActive('orderedList'), action: () => e.chain().focus().toggleOrderedList().run() },
    { label: 'Citação', icon: Quote, active: () => e.isActive('blockquote'), action: () => e.chain().focus().toggleBlockquote().run() },
    { label: 'Imagem', icon: ImagePlus, active: () => false, action: () => triggerImageUpload() },
    { label: '❌ Erro', icon: AlertTriangle, active: () => e.isActive('callout', { type: 'error' }), action: () => e.isActive('callout') ? e.chain().focus().unsetCallout().run() : e.chain().focus().setCallout('error').run() },
    { label: '💡 Insight', icon: Lightbulb, active: () => e.isActive('callout', { type: 'insight' }), action: () => e.isActive('callout') ? e.chain().focus().unsetCallout().run() : e.chain().focus().setCallout('insight').run() },
    { label: '⚠ Pegadinha', icon: ShieldAlert, active: () => e.isActive('callout', { type: 'gotcha' }), action: () => e.isActive('callout') ? e.chain().focus().unsetCallout().run() : e.chain().focus().setCallout('gotcha').run() },
  ]
})

// Image upload
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

onBeforeUnmount(() => {
  if (imageInput.value) imageInput.value.remove()
  editor.value?.destroy()
})
</script>

<style>
.prose-editor .tiptap {
  outline: none;
}
.prose-editor .tiptap p { margin: 0.5em 0; }
.prose-editor .tiptap h1 { font-size: 1.5em; font-weight: 700; margin: 0.75em 0 0.25em; }
.prose-editor .tiptap h2 { font-size: 1.25em; font-weight: 600; margin: 0.75em 0 0.25em; }
.prose-editor .tiptap h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0 0.25em; }
.prose-editor .tiptap ul { list-style: disc; padding-left: 1.5em; }
.prose-editor .tiptap ol { list-style: decimal; padding-left: 1.5em; }
.prose-editor .tiptap blockquote { border-left: 3px solid var(--color-primary-500); padding-left: 1em; opacity: 0.8; }
.prose-editor .tiptap .callout { border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0.5em 0; }
.prose-editor .tiptap .callout[data-callout-type="error"] { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444; }
.prose-editor .tiptap .callout[data-callout-type="insight"] { background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22C55E; }
.prose-editor .tiptap .callout[data-callout-type="gotcha"] { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #F59E0B; }
.prose-editor .tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  pointer-events: none;
  height: 0;
  opacity: 0.4;
}
.prose-editor .tiptap img {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 0.5em 0;
}
</style>
