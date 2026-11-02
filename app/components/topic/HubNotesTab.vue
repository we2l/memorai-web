<template>
  <div class="flex flex-col h-full">
    <!-- View: Material list (when no note is being edited) -->
    <div v-if="!activeNote" class="flex-1 overflow-y-auto p-4">
      <!-- Start Card: choose how to begin -->
      <TopicStartCard
        class="mb-4"
        @create-note="$emit('create-note')"
        @select-file="$emit('select-file', $event)"
      />

      <!-- Material list -->
      <div v-if="notes.length || hasDocuments" class="space-y-5">
        <div
          v-for="note in notes"
          :key="note.id"
          class="note-card group"
          @click="$emit('open-note', note)"
        >
          <!-- Document thumbnail (mini A4 page with real content) -->
          <div class="note-card__thumb">
            <div v-if="previewOf(note).length" class="note-card__page-content">
              <span class="note-card__page-title">{{ note.title }}</span>
              <div class="note-card__page-divider" />
              <div class="note-card__page-body">
                <span v-for="(line, i) in previewOf(note)" :key="i" class="note-card__page-para">{{ line }}</span>
              </div>
            </div>
            <div v-else class="note-card__page">
              <div class="note-card__line w-[85%]" />
              <div class="note-card__line w-full" />
              <div class="note-card__line w-[65%]" />
              <div class="note-card__line w-full" />
              <div class="note-card__line w-[50%]" />
              <div class="note-card__line w-full opacity-60" />
              <div class="note-card__line w-[75%] opacity-40" />
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 py-1">
            <!-- Title -->
            <h4 class="text-[16px] font-semibold text-base-primary leading-snug line-clamp-2">{{ note.title }}</h4>

            <!-- Meta line -->
            <p class="note-card__meta mt-2.5">
              <span>{{ formatDate(note.updated_at) }}</span>
              <span v-if="getWordCount(note)" class="note-card__meta-sep">{{ getWordCount(note) }} palavras</span>
              <span v-if="hasCards(note)" class="note-card__meta-highlight">
                ⚡ {{ note.flashcards_count || cardsFromNote(note.id) }} cards criados
              </span>
              <span v-if="note.last_ai_transform_at && !hasCards(note)" class="note-card__meta-sep">IA aplicada</span>
            </p>

            <!-- Preview (plain text from the API, 3 lines with fade); no preview yet on a note with text: only title and meta -->
            <div v-if="previewOf(note).length" class="note-card__preview mt-3">
              <span v-for="(line, i) in previewOf(note)" :key="i" class="note-card__preview-para">{{ line }}</span>
            </div>
            <p v-else-if="!note.word_count" class="text-[13px] text-base-muted italic mt-3">
              Nota vazia — clique para editar
            </p>

            <!-- Badge (after preview — IA is a complement, not protagonist) -->
            <div v-if="getBadge(note)" class="mt-3">
              <span :class="['note-badge', getBadge(note)!.variant]">
                <Sparkles v-if="getBadge(note)!.icon === 'sparkles'" :size="10" />
                <Zap v-else-if="getBadge(note)!.icon === 'zap'" :size="10" />
                <FileText v-else-if="getBadge(note)!.icon === 'file-text'" :size="10" />
                <Bookmark v-else-if="getBadge(note)!.icon === 'bookmark'" :size="10" />
                {{ getBadge(note)!.label }}
              </span>
            </div>
          </div>

          <!-- Delete button (hover only) -->
          <button
            class="absolute top-4 right-4 p-1.5 rounded-lg text-base-muted hover:text-[var(--badge-danger-text)] hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
            title="Excluir nota"
            @click.stop="noteToDelete = note"
           aria-label="Excluir nota">
            <Trash2 :size="14" aria-hidden="true" />
          </button>
        </div>

        <!-- PDFs -->
        <slot name="documents" />
      </div>
      <div v-else class="py-6">
        <TopicEmptyStateOnboarding
          @paste="$emit('create-note')"
          @upload-pdf="pdfInput?.click()"
          @import-anki="navigateTo('/importar')"
        />
        <!-- "Enviar PDF" goes through the same upload as the StartCard (select-file), not the note editor -->
        <input ref="pdfInput" type="file" accept=".pdf,application/pdf" class="hidden" @change="onPdfSelected" />
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
           aria-label="Voltar">
            <ArrowLeft :size="16" aria-hidden="true" />
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
          <!-- Honest autosave (RF-F8): "Salvo" only once the server has the text -->
          <span v-if="saveState !== 'error'" class="text-micro text-base-muted mx-1">{{ saveState === 'saving' ? 'Salvando...' : 'Salvo' }}</span>
          <span v-else role="alert" class="inline-flex items-center gap-1 mx-1 text-micro font-medium whitespace-nowrap text-[var(--badge-danger-text)]">
            Não salvo
            <button type="button" class="min-h-[44px] px-1 underline underline-offset-2" @click="$emit('retry-save')">Tentar de novo</button>
          </span>
          <!-- More menu -->
          <div class="relative">
            <button
              class="p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-secondary transition-colors"
              title="Mais opções"
              @click="showMenu = !showMenu"
             aria-label="Mais opções">
              <MoreHorizontal :size="16" aria-hidden="true" />
            </button>
            <div v-if="showMenu" class="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-base rounded-xl shadow-lg py-1 z-30">
              <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors flex items-center gap-2" @click="showMenu = false; $emit('improve-note')">
                <Sparkles :size="14" class="text-[var(--badge-primary-text)]" /> Melhorar com IA
              </button>
              <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors flex items-center gap-2" @click="showMenu = false; $emit('generate-from-note')">
                <Zap :size="14" class="text-[var(--badge-primary-text)]" /> Gerar cards
              </button>
              <button class="w-full text-left px-3 py-2 text-small text-[var(--badge-danger-text)] hover:bg-danger/5 transition-colors flex items-center gap-2" @click="showMenu = false; $emit('delete-note')">
                <Trash2 :size="14" /> Excluir nota
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Unsaved local draft newer than the server copy (RF-F8): the user decides -->
      <div v-if="draftSavedAt" role="status" class="px-4 sm:px-6 py-2.5 bg-[var(--badge-warning-bg)] border-b border-base flex flex-wrap items-center gap-x-3 gap-y-2">
        <p class="text-small text-base-primary flex-1 min-w-[12rem]">Você tem alterações não salvas de {{ draftTime }}.</p>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary !py-1.5 !px-3 !min-h-[2.75rem] text-small" @click="$emit('restore-draft')">Restaurar</button>
          <button type="button" class="btn-ghost !py-1.5 !px-3 !min-h-[2.75rem] text-small" @click="$emit('discard-draft')">Descartar</button>
        </div>
      </div>

      <!-- Generating banner (fixed above editor, does not scroll) -->
      <slot name="generating-banner" />

      <!-- Editor area (scrollable, centered) -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-[720px] mx-auto px-6 pt-12 pb-32">
          <!-- Title as H1 inline -->
          <!-- Read-only while a local draft waits for Restaurar/Descartar: typing first would lose it -->
          <div
            ref="titleRef"
            class="notion-title"
            :contenteditable="draftSavedAt ? 'false' : 'true'"
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
        <span v-if="wordCount >= 200" class="text-small font-medium text-[var(--badge-success-text)] bg-[var(--badge-success-bg)] px-2.5 py-1 rounded-full">Material suficiente pra flashcards ✓</span>
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

    <!-- Confirm delete note modal -->
    <UiConfirmModal
      v-model="showDeleteNoteConfirm"
      title="Excluir nota?"
      :message="`&quot;${noteToDelete?.title || 'Sem título'}&quot; será excluída permanentemente.`"
      confirm-label="Excluir"
      @confirm="confirmDeleteNote"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Bookmark, ChevronRight, FileText, MoreHorizontal, Zap, Trash2, Brain, Sparkles } from 'lucide-vue-next'
import { previewLines } from '~/utils/notePreview'
import type { Note, NoteSummary } from '~/types'
import type { NoteSaveState } from '~/composables/useNoteEditor'

const props = defineProps<{
  /** List items, without content (prd-performance-caderno RF-F1) */
  notes: NoteSummary[]
  /** Open note: the summary while GET /notes/{id} loads, then the full note */
  activeNote: NoteSummary | Note | null
  noteTitle: string
  saveState?: NoteSaveState
  /** savedAt of a local draft to offer (null: none). */
  draftSavedAt?: number | null
  hasDocuments: boolean
  breadcrumbTopic: string
  cardsFromNote: (noteId: string) => number
  cardsAiRemaining: number | null
  cardsAiLimit: number | null
}>()

const emit = defineEmits<{
  (e: 'open-note', note: NoteSummary): void
  (e: 'close-editor'): void
  (e: 'create-note'): void
  (e: 'generate-from-note', count?: number): void
  (e: 'improve-note'): void
  (e: 'delete-note'): void
  (e: 'save-title'): void
  (e: 'retry-save'): void
  (e: 'restore-draft'): void
  (e: 'discard-draft'): void
  (e: 'update:noteTitle', value: string): void
  (e: 'select-file', file: File): void
}>()

const showMenu = ref(false)
const showMindMap = ref(false)
const titleRef = ref<HTMLElement>()
const pdfInput = ref<HTMLInputElement>()

// "14:32" today, "31/10 às 14:32" on another day (drafts live up to 7 days)
const draftTime = computed(() => {
  if (!props.draftSavedAt) return ''
  const d = new Date(props.draftSavedAt)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time}`
})

function onPdfSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('select-file', file)
}
const noteToDelete = ref<NoteSummary | null>(null)
const showDeleteNoteConfirm = computed({
  get: () => noteToDelete.value !== null,
  set: (v) => { if (!v) noteToDelete.value = null },
})

async function confirmDeleteNote() {
  if (!noteToDelete.value) return
  const noteStore = useNoteStore()
  const topicStore = useTopicStore()
  const toast = useToast()
  await noteStore.remove(noteToDelete.value.id)
  toast.show('Nota excluída.', 'success')
  noteToDelete.value = null
  await topicStore.fetchTree()
}

function noteMature(note: NoteSummary): boolean {
  if (!note.plain_preview) return false
  return note.plain_preview.length >= 148
}

function noteOutdated(note: NoteSummary): boolean {
  return !!(note.flashcards_count > 0 && note.cards_generated_at && note.updated_at > note.cards_generated_at)
}

function hasCards(note: NoteSummary): boolean {
  return (note.flashcards_count > 0) || (props.cardsFromNote(note.id) > 0)
}

function cardCount(note: NoteSummary): number {
  return note.flashcards_count || props.cardsFromNote(note.id)
}

function getBadge(note: NoteSummary): { label: string; variant: string; icon: 'sparkles' | 'zap' | 'file-text' | 'bookmark' } | null {
  if (note.last_ai_transform_at && !note.cards_generated_at) {
    return { label: 'IA encontrou melhorias', variant: 'note-badge--accent', icon: 'sparkles' }
  }
  const count = cardCount(note)
  if (count >= 10) {
    return { label: `${count} flashcards prontos`, variant: 'note-badge--green', icon: 'zap' }
  }
  if (count > 0) {
    return { label: `${count} cards criados`, variant: 'note-badge--green', icon: 'zap' }
  }
  if (note.source_document_id) {
    return { label: 'Gerado do PDF', variant: 'note-badge--purple', icon: 'file-text' }
  }
  if (noteMature(note) && !hasCards(note)) {
    return { label: 'Material suficiente para cards', variant: 'note-badge--accent', icon: 'bookmark' }
  }
  return null
}

function estimateWords(note: NoteSummary): number {
  if (!note.plain_preview) return 0
  const previewWords = note.plain_preview.split(/\s+/).length
  // If preview is truncated (150 chars), estimate real total
  return note.plain_preview.length >= 148 ? previewWords * 3 : previewWords
}

// Preview lines from plain_preview, memoized per note object (a save replaces the item)
const previewCache = new WeakMap<NoteSummary, string[]>()

function previewOf(note: NoteSummary): string[] {
  let lines = previewCache.get(note)
  if (!lines) {
    lines = previewLines(note)
    previewCache.set(note, lines)
  }
  return lines
}

// Word count from the API (word_count), null if not meaningful
function getWordCount(note: NoteSummary): number | null {
  return note.word_count >= 10 ? note.word_count : null
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
  if (wordCountInterval) clearInterval(wordCountInterval)
  wordCountInterval = null
  if (id) {
    // The API count while GET /notes/{id} loads; the editor's own count once it is on screen
    wordCount.value = props.activeNote?.word_count ?? 0
    nextTick(updateWordCount)
    wordCountInterval = setInterval(updateWordCount, 2000)
  }
}, { immediate: true })

// The full note replaces the list summary (same id) when its content arrives
watch(() => props.activeNote, (note, prev) => {
  if (note && prev && note.id === prev.id) setTimeout(updateWordCount, 100)
})

onUnmounted(() => {
  if (wordCountInterval) clearInterval(wordCountInterval)
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Close menus on outside click
function handleClick(e: MouseEvent) {
  if (showMenu.value) showMenu.value = false
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
  color: var(--text-heading);
  outline: none;
  word-break: break-word;
}

.notion-title:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
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

/* === Note card — document-like, premium === */
/* Off-screen cards skip layout and paint (prd-performance-caderno RF-F5); the size is remembered once rendered */
.note-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 218px;
  position: relative;
  display: flex;
  gap: 20px;
  padding: 22px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 16px;
  cursor: pointer;
  transition: all 150ms ease-out;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.note-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--color-accent-primary) 20%, var(--border-base));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07), 0 2px 8px rgba(0, 0, 0, 0.03);
}

/* Document thumbnail — mini A4 with real content (~15% larger) */
.note-card__thumb {
  display: none;
  width: 112px;
  height: 140px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 14px 11px;
  overflow: hidden;
  transition: all 150ms ease-out;
}

:root.dark .note-card__thumb {
  background: color-mix(in srgb, var(--bg-card) 100%, transparent);
}

.note-card:hover .note-card__thumb {
  border-color: color-mix(in srgb, var(--color-accent-primary) 25%, var(--border-base));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

@media (min-width: 640px) {
  .note-card__thumb {
    display: block;
  }
}

/* Thumbnail — real content render */
.note-card__page-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
  pointer-events: none;
}

.note-card__page-title {
  display: block;
  font-size: 7.5px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-heading);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.note-card__page-divider {
  height: 1px;
  background: var(--border-base);
  opacity: 0.5;
  margin: 4px 0;
}

.note-card__page-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
}

.note-card__page-para {
  display: block;
  font-size: 5.5px;
  line-height: 1.5;
  color: var(--text-muted);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.note-card__page-text {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 6px;
  line-height: 1.5;
  color: var(--text-muted);
}

/* Thumbnail — fallback placeholder */
.note-card__page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 4px;
}

.note-card__line {
  height: 3px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--border-base) 70%, transparent);
}

/* Meta line */
.note-card__meta {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.note-card__meta-sep::before {
  content: ' · ';
  opacity: 0.5;
}

.note-card__meta-highlight {
  font-weight: 500;
  color: var(--color-accent-soft);
}

.note-card__meta-highlight::before {
  content: ' · ';
  opacity: 0.5;
  color: var(--text-muted);
  font-weight: 400;
}

/* Preview — editor-like typography with structure */
.note-card__preview {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-body);
  max-height: 4.8em; /* ~3 full lines */
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
}

.note-card__preview-para {
  display: block;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-body);
}

/* Badges */
.note-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 100px;
  letter-spacing: 0.01em;
}

.note-badge--green {
  background: color-mix(in srgb, var(--badge-success-text) 6%, transparent);
  color: var(--badge-success-text);
}

.note-badge--purple {
  background: color-mix(in srgb, var(--color-accent-primary) 6%, transparent);
  color: var(--color-accent-primary);
}

.note-badge--accent {
  background: color-mix(in srgb, var(--color-accent-primary) 6%, transparent);
  color: var(--color-accent-soft);
}

</style>
