<template>
  <div class="flex h-full">
    <!-- Left: material list -->
    <div
      class="w-full lg:w-[35%] lg:border-r border-base flex flex-col transition-all duration-300 ease-in-out"
      :class="[activeNote && 'max-lg:hidden', activeNote && readMode && 'lg:!w-0 lg:overflow-hidden lg:!border-0 lg:!p-0']"
    >
      <div class="p-4">
        <!-- Quick input -->
        <form class="flex gap-2 mb-4" data-tour="quick-input" @submit.prevent="handleQuickInput">
          <input
            v-model="quickText"
            class="input-base flex-1 !text-small"
            placeholder="Cole seu material de estudo aqui..."
            @keydown.stop
          />
          <button type="submit" class="btn-primary !py-2 !px-3.5 !min-h-[2.75rem] text-small shrink-0" :disabled="!quickText.trim()">
            Adicionar
          </button>
        </form>

        <!-- Generate suggestion banner -->
        <div v-if="suggestGenerate" class="mb-4 px-4 py-3 rounded-xl bg-accent-primary-subtle border border-accent-primary/15 flex items-center justify-between gap-3">
          <p class="text-small text-accent-primary">Material salvo. Gerar cards com IA?</p>
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
            class="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3"
            :class="activeNote?.id === note.id ? 'bg-accent-primary-subtle text-accent-primary' : 'hover:bg-surface-tertiary text-base-secondary'"
            @click="$emit('open-note', note)"
          >
            <FileText :size="16" class="shrink-0 opacity-60" />
            <div class="flex-1 min-w-0">
              <p class="text-body font-medium truncate">
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
    </div>

    <!-- Right: editor (desktop split, mobile fullscreen) -->
    <div v-if="activeNote" class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-base">
        <div class="flex items-center gap-2">
          <button class="btn-secondary !p-1.5 !min-h-[2.75rem] lg:hidden" @click="$emit('close-editor')">
            <ArrowLeft :size="16" />
          </button>
          <button
            class="btn-secondary !py-1.5 !px-3 !min-h-[2.75rem] text-small flex items-center gap-1.5"
            @click="readMode = !readMode"
          >
            <component :is="readMode ? Pencil : BookOpen" :size="14" />
            {{ readMode ? 'Editar' : 'Modo leitura' }}
          </button>
        </div>
        <div v-if="!readMode" class="flex items-center gap-2">
          <button class="btn-secondary !py-1.5 !px-3 !min-h-[2.75rem] text-small" @click="showGeneratePanel = !showGeneratePanel">
            <Zap :size="14" /> Gerar cards
          </button>
          <button class="btn-secondary !py-1.5 !px-3 !min-h-[2.75rem] text-small" @click="$emit('improve-note')">
            ✨ Melhorar
          </button>
        </div>
      </div>

      <!-- Generate cards selector -->
      <div v-if="showGeneratePanel && !readMode" class="px-4 py-3 bg-surface-secondary/50 border-b border-base">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-small text-base-primary">Quantos cards?</span>
          <button
            v-for="n in [3, 5, 10]"
            :key="n"
            class="px-3 py-1.5 rounded-lg text-small font-medium transition-colors"
            :class="generateCount === n ? 'bg-accent-primary text-surface' : 'bg-surface-tertiary text-base-secondary hover:bg-surface-tertiary/80'"
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

      <div class="flex-1 overflow-y-auto p-4 flex flex-col">
        <template v-if="readMode">
          <h1 class="text-title text-base-primary mb-4">{{ noteTitle }}</h1>
          <div class="prose-memorai">
            <slot name="read-content" />
          </div>
        </template>
        <template v-else>
          <input
            :value="noteTitle"
            class="text-title bg-transparent border-b border-dashed border-base outline-none text-base-primary pb-1 w-full hover:border-accent-primary focus:border-accent-primary transition-colors mb-4 shrink-0"
            placeholder="Título do material"
            @input="$emit('update:noteTitle', ($event.target as HTMLInputElement).value)"
            @blur="$emit('save-title')"
          />
          <div class="relative flex-1">
            <slot name="editor" />
          </div>
        </template>
      </div>

      <!-- Footer (only in edit mode) -->
      <div v-if="!readMode" class="flex items-center justify-between px-4 py-3 border-t border-base">
        <button class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small text-danger" @click="$emit('delete-note')">
          <Trash2 :size="14" /> Excluir
        </button>
        <span class="text-micro text-base-muted">{{ saving ? 'Salvando...' : 'Salvo' }}</span>
      </div>
    </div>

    <!-- No note selected (desktop only) -->
    <div v-else class="hidden lg:flex flex-1 items-center justify-center text-base-muted text-small">
      Selecione um material pra editar
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText, Zap, ArrowLeft, Trash2, Pencil, BookOpen } from 'lucide-vue-next'
import type { Note } from '~/types'

const props = defineProps<{
  notes: Note[]
  activeNote: Note | null
  noteTitle: string
  saving: boolean
  hasDocuments: boolean
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

const quickText = ref('')
const suggestGenerate = ref(false)
const readMode = ref(true)

// Reset to read mode when switching notes
watch(() => props.activeNote?.id, () => { readMode.value = true })

function handleQuickInput() {
  if (!quickText.value.trim()) return
  emit('quick-add', quickText.value.trim())
  quickText.value = ''
  suggestGenerate.value = true
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>
