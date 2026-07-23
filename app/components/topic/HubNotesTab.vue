<template>
  <div class="flex flex-col h-full">
    <!-- View: Material list (when no note is being edited) -->
    <div v-if="!activeNote" class="flex-1 overflow-y-auto p-4">
      <!-- Quick input -->
      <form class="flex flex-col gap-1 mb-4" data-tour="quick-input" @submit.prevent="handleQuickInput">
        <div class="flex gap-2">
          <input
            v-model="quickText"
            class="input-base flex-1 !text-small"
            placeholder="Cole seu material de estudo aqui..."
            @keydown.stop
          />
          <button type="submit" class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] !bg-surface-secondary hover:!bg-[var(--bg-soft)] text-sm shrink-0" :disabled="!quickText.trim()">
            + Adicionar
          </button>
        </div>
        <p class="text-micro text-base-muted pl-1">↳ Suas notas viram contexto pra IA gerar cards, quiz e podcast</p>
      </form>

      <!-- Generate suggestion banner -->
      <div v-if="suggestGenerate" class="mb-4 px-4 py-3 rounded-xl bg-accent-primary-subtle/10 backdrop-blur-sm border border-base flex items-center justify-between gap-3">
        <p class="text-small text-base-primary">Material salvo. Gerar cards com IA?</p>
        <div class="flex gap-2">
          <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('generate-from-note', 5); suggestGenerate = false">Gerar</button>
          <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="suggestGenerate = false">Depois</button>
        </div>
      </div>

      <!-- Material list -->
      <div v-if="notes.length || hasDocuments" class="space-y-1.5">
        <button
          v-for="note in notes"
          :key="note.id"
          class="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 hover:bg-[var(--border-divider)]"
          @click="$emit('open-note', note)"
        >
          <FileText :size="16" class="shrink-0 opacity-60 text-base-muted" />
          <div class="flex-1 min-w-0">
            <p class="text-body font-medium truncate text-base-primary">
              {{ note.title }}
              <span v-if="note.source_document_id" class="text-micro font-semibold text-accent-primary ml-1">✨ IA</span>
            </p>
            <div class="flex items-center gap-2 text-small text-base-muted">
              <span>{{ formatDate(note.updated_at) }}</span>
              <span v-if="cardsFromNote(note.id) > 0" class="text-accent-primary">· {{ cardsFromNote(note.id) }} cards</span>
            </div>
          </div>
        </button>

        <!-- PDFs -->
        <slot name="documents" />
      </div>
      <div v-else class="py-6">
        <div class="text-center mb-4">
          <p class="text-headline text-base-primary mb-2">Pare de esquecer o que estuda</p>
          <p class="text-small text-base-muted">Cole um texto, suba um PDF — a IA transforma em flashcards em segundos.</p>
        </div>
        <div class="space-y-2">
          <slot name="documents" />
          <button class="btn-secondary w-full !py-3 text-small" @click="$emit('create-note')">
            <FileText :size="16" /> Criar nota manualmente
          </button>
        </div>
      </div>
    </div>

    <!-- View: Editor full-screen (when a note is open) -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <!-- Minimal header -->
      <div class="flex items-center justify-between px-4 h-12 shrink-0">
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
        <div class="flex items-center gap-2">
          <span class="text-micro text-base-muted">{{ saving ? 'Salvando...' : '✓ Salvo' }}</span>
          <div class="relative">
            <button
              class="p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-secondary transition-colors"
              title="Opções"
              @click="showMenu = !showMenu"
            >
              <MoreHorizontal :size="16" />
            </button>
            <div v-if="showMenu" class="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-base rounded-xl shadow-lg py-1 z-30">
              <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors" @click="showMenu = false; showGeneratePanel = !showGeneratePanel">
                <Zap :size="14" class="inline mr-2" /> Gerar cards
              </button>
              <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors" @click="showMenu = false; showMindMap = true">
                🧠 Mapa mental
              </button>
              <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors" @click="showMenu = false; $emit('improve-note')">
                ✨ Melhorar com IA
              </button>
              <button class="w-full text-left px-3 py-2 text-small text-danger hover:bg-danger/5 transition-colors" @click="showMenu = false; $emit('delete-note')">
                <Trash2 :size="14" class="inline mr-2" /> Excluir nota
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Generate cards panel (collapsible) -->
      <div v-if="showGeneratePanel" class="px-4 py-3 bg-surface-secondary/50 border-b border-base">
        <div class="max-w-[720px] mx-auto">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-small text-base-primary">Quantos cards?</span>
            <button
              v-for="n in [3, 5, 10]"
              :key="n"
              class="px-3 py-1.5 rounded-lg text-small font-medium transition-colors"
              :class="generateCount === n ? 'bg-accent-primary text-white' : 'bg-[var(--border-divider)] text-base-secondary hover:bg-[var(--border-divider)]/80'"
              @click="generateCount = n"
            >
              {{ n }}
            </button>
          </div>
          <div class="flex items-center justify-between">
            <span v-if="cardsAiRemaining !== null" class="text-micro text-base-muted">
              Restam {{ cardsAiRemaining }}/{{ cardsAiLimit }} este mês
            </span>
            <span v-else class="text-micro text-base-muted">Ilimitado</span>
            <div class="flex gap-2">
              <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="showGeneratePanel = false">Cancelar</button>
              <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('generate-from-note', generateCount); showGeneratePanel = false">
                <Zap :size="12" /> Gerar {{ generateCount }}
              </button>
            </div>
          </div>
        </div>
      </div>

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
            <slot name="editor" />
          </div>
        </div>
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
import { FileText, ArrowLeft, ChevronRight, MoreHorizontal, Zap, Trash2 } from 'lucide-vue-next'
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
  (e: 'generate-from-note', count: number): void
  (e: 'improve-note'): void
  (e: 'delete-note'): void
  (e: 'save-title'): void
  (e: 'update:noteTitle', value: string): void
}>()

const showGeneratePanel = ref(false)
const generateCount = ref(5)
const showMenu = ref(false)
const showMindMap = ref(false)
const quickText = ref('')
const suggestGenerate = ref(false)
const titleRef = ref<HTMLElement>()

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
  // Focus the Tiptap editor (first .tiptap element)
  const tiptap = document.querySelector('.notion-editor .tiptap') as HTMLElement
  tiptap?.focus()
}

function handleQuickInput() {
  if (!quickText.value.trim()) return
  emit('quick-add', quickText.value.trim())
  quickText.value = ''
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
</style>
