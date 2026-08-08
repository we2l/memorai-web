<template>
  <div class="flex flex-col h-full">
    <!-- View: Material list (when no note is being edited) -->
    <div v-if="!activeNote" class="flex-1 overflow-y-auto p-4">
      <!-- Material input (unified: text + PDF) -->
      <TopicMaterialInput
        :uploading="false"
        :upload-progress="0"
        class="mb-4"
        @submit-text="handleQuickInput"
        @select-file="$emit('select-file', $event)"
      />

      <!-- Generate suggestion banner -->
      <div v-if="suggestGenerate" class="mb-4 px-4 py-3 rounded-xl bg-accent-primary-subtle/10 backdrop-blur-sm border border-base flex items-center justify-between gap-3">
        <p class="text-small text-base-primary">Material salvo. Gerar cards com IA?</p>
        <div class="flex gap-2">
          <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('generate-from-note', 5); suggestGenerate = false">Gerar</button>
          <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="suggestGenerate = false">Depois</button>
        </div>
      </div>

      <!-- Material list -->
      <div v-if="notes.length || hasDocuments" class="space-y-4">
        <div
          v-for="note in notes"
          :key="note.id"
          class="group relative w-full text-left p-5 rounded-2xl bg-[var(--bg-card)] border border-base shadow-sm transition-all duration-150 hover:border-[var(--color-accent-primary)]/30 hover:shadow-lg hover:translate-y-[-1px] cursor-pointer"
          @click="$emit('open-note', note)"
        >
          <div class="flex gap-4">
            <!-- LEFT: document thumbnail (larger, more document-like) -->
            <div class="hidden sm:flex w-[120px] h-[140px] shrink-0 rounded-xl bg-[var(--border-base)]/10 border border-[var(--border-base)]/60 p-3.5 flex-col justify-between">
              <div class="space-y-[5px]">
                <div class="h-[4px] w-full rounded-full bg-[var(--border-base)]/80" />
                <div class="h-[4px] w-[75%] rounded-full bg-[var(--border-base)]/80" />
                <div class="h-[4px] w-full rounded-full bg-[var(--border-base)]/60" />
                <div class="h-[4px] w-[60%] rounded-full bg-[var(--border-base)]/60" />
              </div>
              <div class="space-y-[5px]">
                <div class="h-[4px] w-full rounded-full bg-[var(--border-base)]/40" />
                <div class="h-[4px] w-[85%] rounded-full bg-[var(--border-base)]/40" />
                <div class="h-[4px] w-full rounded-full bg-[var(--border-base)]/25" />
                <div class="h-[4px] w-[45%] rounded-full bg-[var(--border-base)]/25" />
              </div>
            </div>

            <!-- RIGHT: content -->
            <div class="flex-1 min-w-0">
              <!-- Title -->
              <h4 class="text-[17px] font-bold text-base-primary leading-snug line-clamp-2">{{ note.title }}</h4>

              <!-- Date -->
              <p class="text-[12px] text-base-muted mt-1.5">{{ formatDate(note.updated_at) }}</p>

              <!-- Badges -->
              <div v-if="hasCards(note) || note.source_document_id || noteMature(note) || noteOutdated(note)" class="flex items-center gap-2 mt-2.5 flex-wrap">
                <span v-if="hasCards(note)" class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full bg-emerald-500/10 text-emerald-600">
                  <Check :size="11" /> Estudado
                </span>
                <span v-if="note.source_document_id" class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full bg-purple-500/10 text-purple-600">
                  <Sparkles :size="11" /> AI melhoria
                </span>
                <span v-if="!hasCards(note) && !note.source_document_id && noteMature(note)" class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-soft)]">
                  <Sparkles :size="11" /> AI sugestão
                </span>
                <span v-if="noteOutdated(note)" class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full bg-amber-500/10 text-amber-600">
                  Atualizar
                </span>
              </div>

              <!-- Preview (always visible, gives life to the card) -->
              <p v-if="note.plain_preview" class="text-[13px] text-base-secondary/80 mt-3 line-clamp-2 leading-relaxed">
                {{ note.plain_preview }}
              </p>
            </div>

            <!-- 3 dots (hover) -->
            <button
              class="absolute top-4 right-4 p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop
            >
              <MoreHorizontal :size="16" />
            </button>
          </div>
        </div>

        <!-- PDFs -->
        <slot name="documents" />
      </div>
      <div v-else class="py-6">
        <TopicEmptyStateOnboarding
          @paste="$emit('create-note')"
          @upload-pdf="$emit('create-note')"
          @import-anki="navigateTo('/importar')"
        />
      </div>
    </div>

    <!-- View: Editor full-screen (when a note is open) -->
    <div v-else class="flex-1 flex flex-col overflow-hidden bg-[var(--bg-card)]">
      <!-- Editor header -->
      <div class="flex items-center justify-between px-4 h-12 shrink-0 border-b border-base">
        <div class="flex items-center gap-2 min-w-0">
          <button
            class="p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-secondary transition-colors"
            title="Voltar"
            @click="$emit('close-editor')"
          >
            <ArrowLeft :size="16" />
          </button>
          <nav class="flex items-center gap-1 text-small text-base-muted min-w-0">
            <span class="truncate max-w-[120px]">{{ breadcrumbTopic }}</span>
            <ChevronRight :size="12" class="shrink-0 opacity-50" />
            <span class="truncate max-w-[160px] text-base-secondary">{{ activeNote.title || 'Sem título' }}</span>
          </nav>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="p-1.5 rounded-lg text-base-muted hover:text-accent-primary hover:bg-[var(--color-primary-50)] transition-colors flex items-center gap-1"
            title="Mapa mental"
            @click="showMindMap = true"
          >
            <Brain :size="16" />
            <span class="text-small hidden lg:inline">Mapa</span>
          </button>
          <span class="text-micro text-base-muted mx-1">{{ saving ? 'Salvando...' : '✓' }}</span>
          <!-- More menu -->
          <div class="relative">
            <button
              class="p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-secondary transition-colors"
              title="Mais opções"
              @click="showMenu = !showMenu"
            >
              <MoreHorizontal :size="16" />
            </button>
            <div v-if="showMenu" class="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-base rounded-xl shadow-lg py-1 z-30">
              <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors flex items-center gap-2" @click="showMenu = false; $emit('improve-note')">
                <Sparkles :size="14" class="text-[var(--color-accent-soft)]" /> Melhorar com IA
              </button>
              <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors flex items-center gap-2" @click="showMenu = false; $emit('generate-from-note')">
                <Zap :size="14" class="text-[var(--color-accent-soft)]" /> Transformar em flashcards
              </button>
              <button class="w-full text-left px-3 py-2 text-small text-danger hover:bg-danger/5 transition-colors flex items-center gap-2" @click="showMenu = false; $emit('delete-note')">
                <Trash2 :size="14" /> Excluir nota
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Generating banner (fixed above editor, does not scroll) -->
      <slot name="generating-banner" />

      <!-- Editor area (scrollable, centered) -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-[720px] mx-auto px-6 pt-12 pb-32">
          <!-- Title as H1 inline -->
          <div
            ref="titleRef"
            class="notion-title"
            contenteditable="true"
            :data-placeholder="'Sem título'"
            @input="onTitleInput"
            @keydown.enter.prevent="focusEditor"
            @blur="$emit('save-title')"
          />

          <!-- Editor -->
          <div class="mt-6">
            <slot name="improve-bar" />
            <slot name="editor" />
          </div>
        </div>
      </div>

      <!-- Footer: intelligent word count + concepts -->
      <div class="px-4 py-2.5 border-t border-base flex items-center justify-between shrink-0">
        <span v-if="wordCount >= 200" class="text-small text-base-secondary">{{ wordCount }} palavras · ~{{ conceptCount }} conceitos encontrados</span>
        <span v-else-if="wordCount >= 100" class="text-small text-base-muted">{{ wordCount }} palavras · Quase lá — mais um pouco pra IA funcionar</span>
        <span v-else-if="wordCount > 0" class="text-small text-base-muted">{{ wordCount }} palavras · Continue escrevendo...</span>
        <span v-else class="text-small text-base-muted">0 palavras</span>
        <span v-if="wordCount >= 200" class="text-small font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">Material suficiente pra flashcards ✓</span>
      </div>

      <!-- Selection toolbar (create card from selection) -->
      <slot name="selection-toolbar" />
    </div>

    <!-- Mind Map Modal -->
    <TopicNoteMindMapModal
      v-if="activeNote"
      v-model="showMindMap"
      :note-id="activeNote.id"
      :note-title="activeNote.title"
    />
  </div>
</template>

<script setup lang="ts">
import { FileText, ArrowLeft, ChevronRight, MoreHorizontal, Zap, Trash2, Brain, Sparkles, Check } from 'lucide-vue-next'
import type { Note } from '~/types'

const props = defineProps<{
  notes: Note[]
  activeNote: Note | null
  noteTitle: string
  saving: boolean
  hasDocuments: boolean
  breadcrumbTopic: string
  cardsFromNote: (noteId: string) => number
  cardsAiRemaining: number | null
  cardsAiLimit: number | null
}>()

const emit = defineEmits<{
  (e: 'open-note', note: Note): void
  (e: 'close-editor'): void
  (e: 'quick-add', text: string): void
  (e: 'create-note'): void
  (e: 'generate-from-note', count?: number): void
  (e: 'improve-note'): void
  (e: 'delete-note'): void
  (e: 'save-title'): void
  (e: 'update:noteTitle', value: string): void
  (e: 'select-file', file: File): void
}>()

const showMenu = ref(false)
const showMindMap = ref(false)
const suggestGenerate = ref(false)
const titleRef = ref<HTMLElement>()

function noteMature(note: Note): boolean {
  if (!note.plain_preview) return false
  return note.plain_preview.length >= 148
}

function noteOutdated(note: Note): boolean {
  return !!(note.flashcards_count > 0 && note.cards_generated_at && note.updated_at > note.cards_generated_at)
}

function hasCards(note: Note): boolean {
  return (note.flashcards_count > 0) || (props.cardsFromNote(note.id) > 0)
}

function estimateWords(note: Note): number {
  if (!note.plain_preview) return 0
  const previewWords = note.plain_preview.split(/\s+/).length
  // If preview is truncated (150 chars), estimate real total
  return note.plain_preview.length >= 148 ? previewWords * 3 : previewWords
}

// Set title text on mount / note change
watch(() => props.activeNote?.id, () => {
  nextTick(() => {
    if (titleRef.value && props.noteTitle) {
      if (titleRef.value.textContent !== props.noteTitle) {
        titleRef.value.textContent = props.noteTitle
      }
    }
  })
}, { immediate: true })

watch(() => props.noteTitle, (val) => {
  if (titleRef.value && titleRef.value.textContent !== val) {
    titleRef.value.textContent = val ?? ''
  }
})

function onTitleInput(event: Event) {
  const text = (event.target as HTMLElement).textContent ?? ''
  emit('update:noteTitle', text)
}

function focusEditor() {
  const tiptap = document.querySelector('.notion-editor .tiptap') as HTMLElement
  tiptap?.focus()
}

const wordCount = ref(0)
const conceptCount = computed(() => Math.floor(wordCount.value / 45))
let wordCountInterval: ReturnType<typeof setInterval> | null = null

function updateWordCount() {
  const tiptap = document.querySelector('.notion-editor .tiptap') as HTMLElement
  if (tiptap) {
    const text = tiptap.textContent ?? ''
    wordCount.value = text.trim() ? text.trim().split(/\s+/).length : 0
  }
}

watch(() => props.activeNote?.id, (id) => {
  if (id) {
    nextTick(updateWordCount)
    wordCountInterval = setInterval(updateWordCount, 2000)
  } else {
    if (wordCountInterval) clearInterval(wordCountInterval)
  }
}, { immediate: true })

onUnmounted(() => {
  if (wordCountInterval) clearInterval(wordCountInterval)
})

function handleQuickInput(text: string) {
  if (!text) return
  emit('quick-add', text)
  suggestGenerate.value = true
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Close menu on outside click
function handleClick(e: MouseEvent) {
  if (showMenu.value) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClick, true)
})
</script>

<style scoped>
/* Notion-like title */
.notion-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-heading, #1F2343);
  outline: none;
  word-break: break-word;
}

.notion-title:empty::before {
  content: attr(data-placeholder);
  color: var(--color-text-muted, #8A90A8);
  opacity: 0.6;
  pointer-events: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
