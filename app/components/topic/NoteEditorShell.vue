<template>
  <div class="flex min-h-full flex-col">
    <div class="flex flex-1 flex-col bg-raised">
      <!-- Editor header: back to the scope (its hub), the path, the map, the autosave and ⋯ -->
      <div class="sticky top-0 z-sticky flex h-12 shrink-0 items-center justify-between border-b border-line bg-raised px-4 md:top-topnav">
        <div class="flex min-w-0 items-center gap-2">
          <UiIconButton :icon="ArrowLeft" :label="`Voltar a ${breadcrumbTopic}`" size="sm" :to="backTo" />
          <nav class="flex min-w-0 items-center gap-1 text-meta text-fg-muted" aria-label="Caminho">
            <NuxtLink :to="backTo" class="max-w-32 truncate hover:text-fg-strong">{{ breadcrumbTopic }}</NuxtLink>
            <ChevronRight class="size-3 shrink-0" aria-hidden="true" />
            <span class="max-w-40 truncate text-fg" aria-current="page">{{ activeNote.title || 'Sem título' }}</span>
          </nav>
        </div>
        <div class="flex items-center gap-1">
          <UiButton size="sm" variant="ghost" :icon-left="Brain" icon-tone="action" title="Mapa mental" @click="showMindMap = true">
            <span class="max-lg:sr-only">Mapa</span>
          </UiButton>
          <!-- Honest autosave (RF-F8): "Salvo" only once the server has the text -->
          <span v-if="saveState !== 'error'" class="mx-1 text-label text-fg-muted">{{ saveState === 'saving' ? 'Salvando...' : 'Salvo' }}</span>
          <span v-else role="alert" class="mx-1 inline-flex items-center gap-1 text-label font-medium whitespace-nowrap text-danger">
            Não salvo
            <button type="button" class="min-h-touch px-1 underline underline-offset-2" @click="$emit('retry-save')">Tentar de novo</button>
          </span>
          <UiMenu :items="menuItems" label="Mais opções" />
        </div>
      </div>

      <!-- Unsaved local draft newer than the server copy (RF-F8): the user decides -->
      <div v-if="draftSavedAt" role="status" class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-warning-subtle px-4 py-2.5 sm:px-6">
        <p class="min-w-48 flex-1 text-meta text-fg-strong">Você tem alterações não salvas de {{ draftTime }}.</p>
        <div class="flex gap-2">
          <UiButton size="sm" @click="$emit('restore-draft')">Restaurar</UiButton>
          <UiButton size="sm" variant="ghost" @click="$emit('discard-draft')">Descartar</UiButton>
        </div>
      </div>

      <!-- Generating banner (fixed above editor, does not scroll) -->
      <slot name="generating-banner" />

      <!-- Panel of the PDF this note came from (status, cards, viewer) -->
      <slot name="documents" />

      <!-- Editor area (centered) -->
      <div class="flex-1">
        <div class="mx-auto max-w-prose px-6 pt-12 pb-32">
          <!-- Title as H1 inline -->
          <!-- Read-only while a local draft waits for Restaurar/Descartar: typing first would lose it -->
          <div
            ref="titleRef"
            class="notion-title"
            role="textbox"
            tabindex="0"
            aria-label="Título da nota"
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

      <!-- Footer: intelligent word count + concepts (stays above the BottomNav and the mini-player) -->
      <div class="sticky bottom-[calc(var(--nav-h)+var(--miniplayer-h))] z-sticky flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-raised px-4 py-2.5">
        <span v-if="wordCount >= 200" class="text-meta text-fg">{{ wordCount }} palavras · ~{{ conceptCount }} conceitos encontrados</span>
        <span v-else-if="wordCount >= 100" class="text-meta text-fg-muted">{{ wordCount }} palavras · Quase lá — mais um pouco pra IA funcionar</span>
        <span v-else-if="wordCount > 0" class="text-meta text-fg-muted">{{ wordCount }} palavras · Continue escrevendo...</span>
        <span v-else class="text-meta text-fg-muted">0 palavras</span>
        <!-- Cards that came from this note: review only them (F2, scope=note:) or see them in the library -->
        <span v-if="noteCards > 0" class="flex flex-wrap items-center justify-end gap-2">
          <UiButton v-if="noteSession > 0" size="sm" :to="reviewPath({ type: 'note', id: activeNote.id })" data-testid="note-review">
            Revisar {{ noteSession === 1 ? 'este 1' : `estes ${noteSession}` }}
          </UiButton>
          <UiButton size="sm" variant="ghost" :to="cardsTo" data-testid="note-cards">
            Ver e editar os {{ noteCards }} cards
          </UiButton>
        </span>
        <UiTag v-else-if="wordCount >= 200" tone="success">Material suficiente pra flashcards ✓</UiTag>
      </div>

      <!-- Selection toolbar (create card from selection) -->
      <slot name="selection-toolbar" />
    </div>

    <!-- Mind Map Modal -->
    <LazyTopicNoteMindMapModal
      v-if="mindMapLoaded"
      v-model="showMindMap"
      :note-id="activeNote.id"
      :note-title="activeNote.title"
    />
  </div>
</template>

<script setup lang="ts">
// The note open (prd-4b-caderno-v3 §3.3: moved from HubNotesTab without redesign; the 4c redesigns it):
// header with the way back to the scope, honest autosave and ⋯ (improve, cards, delete), the local
// draft offer, the title, the improve bar and the editor (slots), and the footer with "Revisar estes N"
// (scope=note:, F2) and "Ver e editar os N cards" (the card library filtered by the note).
import { ArrowLeft, ChevronRight, Zap, Trash2, Brain, Sparkles } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { RouteLocationRaw } from 'vue-router'
import type { Note, NoteSummary } from '~/types'
import type { NoteSaveState } from '~/composables/useNoteEditor'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{
  /** Open note: the summary while GET /notes/{id} loads, then the full note */
  activeNote: NoteSummary | Note
  noteTitle: string
  saveState?: NoteSaveState
  /** savedAt of a local draft to offer (null: none). */
  draftSavedAt?: number | null
  breadcrumbTopic: string
  /** The hub of the scope */
  backTo: RouteLocationRaw
  /** The card library with only this note's cards */
  cardsTo: RouteLocationRaw
  /** Cards that came from the note and the size of its own session */
  noteCards: number
  noteSession: number
}>()

const emit = defineEmits<{
  (e: 'generate-from-note', count?: number): void
  (e: 'improve-note'): void
  (e: 'delete-note'): void
  (e: 'save-title'): void
  (e: 'retry-save'): void
  (e: 'restore-draft'): void
  (e: 'discard-draft'): void
  (e: 'update:noteTitle', value: string): void
}>()

const menuItems: MenuItem[] = [
  { label: 'Melhorar com IA', icon: Sparkles, onSelect: () => emit('improve-note') },
  { label: 'Gerar cards', icon: Zap, onSelect: () => emit('generate-from-note') },
  { label: 'Excluir nota', icon: Trash2, tone: 'danger', separator: true, onSelect: () => emit('delete-note') },
]

const showMindMap = ref(false)
const mindMapLoaded = useLoadedOnce(() => showMindMap.value)
const titleRef = ref<HTMLElement>()

// "14:32" today, "31/10 às 14:32" on another day (drafts live up to 7 days)
const draftTime = computed(() => {
  if (!props.draftSavedAt) return ''
  const d = new Date(props.draftSavedAt)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time}`
})
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

</script>


<style scoped>
/* Notion-like title */
.notion-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--fg-strong);
  outline: none;
  word-break: break-word;
}

.notion-title:empty::before {
  content: attr(data-placeholder);
  color: var(--fg-muted);
  opacity: 0.6;
  pointer-events: none;
}

</style>
