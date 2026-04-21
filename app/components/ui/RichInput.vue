<template>
  <div class="border border-base rounded-lg overflow-hidden bg-surface-secondary">
    <div v-if="editor" class="flex items-center gap-0.5 px-2 py-1.5 border-b border-base">
      <button
        v-for="btn in toolbar"
        :key="btn.label"
        type="button"
        class="p-1 rounded text-small transition-colors"
        :class="btn.active() ? 'bg-accent-primary-subtle text-accent-primary' : 'text-base-muted hover:bg-surface-tertiary'"
        :title="btn.label"
        @click="btn.action"
      >
        <component :is="btn.icon" :size="14" />
      </button>

      <div class="w-px h-4 bg-surface-tertiary mx-1" />

      <!-- Mic -->
      <button
        type="button"
        class="p-1 rounded text-small transition-colors"
        :class="recording ? 'bg-danger/15 text-danger' : 'text-base-muted hover:bg-surface-tertiary'"
        :title="recording ? 'Parar gravação' : 'Gravar áudio'"
        @click="toggleRecording"
      >
        <Mic :size="14" />
      </button>
      <span v-if="recording" class="text-micro text-danger animate-pulse ml-1">● {{ recordingTime }}s</span>
    </div>

    <EditorContent
      :editor="editor"
      class="rich-input px-3 py-2 text-small text-base-primary overflow-y-auto"
      :style="{ minHeight: minHeight + 'px', maxHeight: maxHeight + 'px' }"
    />

    <!-- Audio preview -->
    <div v-if="localAudioUrl" class="px-3 py-2 border-t border-base">
      <UiAudioPlayer :src="localAudioUrl" removable @remove="removeAudio" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { ClozeMarker, markToCloze, clozeToMark, getNextClozeIndex } from '~/extensions/cloze-marker'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Mic, ImagePlus, Brackets } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: string
  audioBlob?: Blob | null
  existingAudioUrl?: string | null
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  enableImage?: boolean
  enableCloze?: boolean
}>(), {
  modelValue: '',
  audioBlob: null,
  existingAudioUrl: null,
  placeholder: '',
  minHeight: 80,
  maxHeight: 200,
  enableImage: true,
  enableCloze: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:audioBlob', value: Blob | null): void
  (e: 'focus'): void
}>()

// Convert cloze syntax to marks for editor display
function toEditorContent(val: string): string {
  return props.enableCloze ? clozeToMark(val) : val
}

// Convert marks back to cloze syntax for storage
function toStorageContent(html: string): string {
  return props.enableCloze ? markToCloze(html) : html
}

const editor = useEditor({
  content: toEditorContent(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    Underline.configure({}),
    Placeholder.configure({ placeholder: props.placeholder }),
    ...(props.enableImage ? [Image.configure({ inline: false, allowBase64: false })] : []),
    ...(props.enableCloze ? [ClozeMarker] : []),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', toStorageContent(editor.getHTML()))
  },
  onFocus: () => {
    emit('focus')
  },
})

watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const editorContent = toStorageContent(editor.value.getHTML())
  if (editorContent !== val) {
    editor.value.commands.setContent(toEditorContent(val || ''))
  }
})

function insertCloze(event?: MouseEvent) {
  if (!editor.value) return
  const { from, to } = editor.value.state.selection
  if (from === to) return // No selection

  const html = editor.value.getHTML()
  const useLastIndex = event?.shiftKey
  const nextIndex = useLastIndex
    ? Math.max(1, getNextClozeIndex(html) - 1)
    : getNextClozeIndex(html)

  editor.value.chain().focus().setCloze(nextIndex).run()
}

const toolbar = computed(() => {
  if (!editor.value) return []
  const e = editor.value
  const items = [
    { label: 'Negrito', icon: Bold, active: () => e.isActive('bold'), action: () => e.chain().focus().toggleBold().run() },
    { label: 'Itálico', icon: Italic, active: () => e.isActive('italic'), action: () => e.chain().focus().toggleItalic().run() },
    { label: 'Sublinhado', icon: UnderlineIcon, active: () => e.isActive('underline'), action: () => e.chain().focus().toggleUnderline().run() },
    { label: 'Lista', icon: List, active: () => e.isActive('bulletList'), action: () => e.chain().focus().toggleBulletList().run() },
    { label: 'Lista numerada', icon: ListOrdered, active: () => e.isActive('orderedList'), action: () => e.chain().focus().toggleOrderedList().run() },
  ]
  if (props.enableImage) {
    items.push({ label: 'Imagem', icon: ImagePlus, active: () => false, action: () => triggerImageUpload() })
  }
  if (props.enableCloze) {
    items.push({ label: 'Lacuna (Ctrl+Shift+C)', icon: Brackets, active: () => e.isActive('clozeMarker'), action: (event: MouseEvent) => insertCloze(event) })
  }
  return items
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

// Keyboard shortcut for cloze
onMounted(() => {
  if (props.enableCloze) {
    document.addEventListener('keydown', handleClozeShortcut)
  }
})

function handleClozeShortcut(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
    if (!editor.value?.isFocused) return
    e.preventDefault()
    insertCloze()
  }
}

// Audio recording — stores blob locally, upload happens on card save
const recording = ref(false)
const recordingTime = ref(0)
const localAudioUrl = ref<string | null>(null)
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let timerInterval: ReturnType<typeof setInterval> | null = null

watch(() => props.audioBlob, (blob) => {
  if (blob) {
    localAudioUrl.value = URL.createObjectURL(blob)
  } else if (!props.existingAudioUrl) {
    localAudioUrl.value = null
  }
}, { immediate: true })

watch(() => props.existingAudioUrl, (url) => {
  if (url && !props.audioBlob) {
    localAudioUrl.value = url
  }
}, { immediate: true })

async function toggleRecording() {
  if (recording.value) {
    mediaRecorder?.stop()
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      recording.value = false
      if (timerInterval) clearInterval(timerInterval)
      recordingTime.value = 0

      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      localAudioUrl.value = URL.createObjectURL(blob)
      emit('update:audioBlob', blob)
    }

    mediaRecorder.start()
    recording.value = true
    recordingTime.value = 0
    timerInterval = setInterval(() => recordingTime.value++, 1000)
  } catch {
    alert('Não foi possível acessar o microfone.')
  }
}

function removeAudio() {
  if (localAudioUrl.value) URL.revokeObjectURL(localAudioUrl.value)
  localAudioUrl.value = null
  emit('update:audioBlob', null)
}

onBeforeUnmount(() => {
  mediaRecorder?.stop()
  if (timerInterval) clearInterval(timerInterval)
  if (localAudioUrl.value) URL.revokeObjectURL(localAudioUrl.value)
  if (imageInput.value) imageInput.value.remove()
  if (props.enableCloze) document.removeEventListener('keydown', handleClozeShortcut)
  editor.value?.destroy()
})
</script>

<style>
.rich-input .tiptap {
  outline: none;
}
.rich-input .tiptap p {
  margin: 0.25em 0;
}
.rich-input .tiptap ul { list-style: disc; padding-left: 1.5em; }
.rich-input .tiptap ol { list-style: decimal; padding-left: 1.5em; }
.rich-input .tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  pointer-events: none;
  height: 0;
  color: var(--text-muted);
}
.rich-input .tiptap img {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 0.5em 0;
}
.rich-input .tiptap .cloze-chip {
  background: var(--color-primary-100, rgba(59, 130, 246, 0.15));
  border-radius: 4px;
  padding: 1px 4px;
  border: 1px solid var(--color-primary-300, rgba(59, 130, 246, 0.3));
  position: relative;
}
.rich-input .tiptap .cloze-chip::after {
  content: attr(data-cloze-index);
  font-size: 0.6em;
  font-weight: 700;
  color: var(--color-primary-600, #2563eb);
  vertical-align: super;
  margin-left: 2px;
}
</style>
