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
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Mic } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: string
  audioBlob?: Blob | null
  existingAudioUrl?: string | null
  placeholder?: string
  minHeight?: number
  maxHeight?: number
}>(), {
  modelValue: '',
  audioBlob: null,
  existingAudioUrl: null,
  placeholder: '',
  minHeight: 80,
  maxHeight: 200,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:audioBlob', value: Blob | null): void
  (e: 'focus'): void
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    Underline.configure({}),
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  onFocus: () => {
    emit('focus')
  },
})

watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  if (editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val || '')
  }
})

const toolbar = computed(() => {
  if (!editor.value) return []
  const e = editor.value
  return [
    { label: 'Negrito', icon: Bold, active: () => e.isActive('bold'), action: () => e.chain().focus().toggleBold().run() },
    { label: 'Itálico', icon: Italic, active: () => e.isActive('italic'), action: () => e.chain().focus().toggleItalic().run() },
    { label: 'Sublinhado', icon: UnderlineIcon, active: () => e.isActive('underline'), action: () => e.chain().focus().toggleUnderline().run() },
    { label: 'Lista', icon: List, active: () => e.isActive('bulletList'), action: () => e.chain().focus().toggleBulletList().run() },
    { label: 'Lista numerada', icon: ListOrdered, active: () => e.isActive('orderedList'), action: () => e.chain().focus().toggleOrderedList().run() },
  ]
})

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
</style>
