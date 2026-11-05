<template>
  <article class="min-w-0" aria-labelledby="material-title" data-testid="material-reader" :data-mode="editing ? 'edit' : 'read'">
    <!-- Unsaved local draft newer than the server copy: the user decides -->
    <div v-if="draftSavedAt" role="status" class="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-row bg-warning-subtle px-4 py-3">
      <p class="min-w-48 flex-1 text-meta text-fg-strong">Você tem alterações não salvas de {{ draftTime }}.</p>
      <div class="flex gap-2">
        <UiButton size="sm" @click="$emit('restore-draft')">Restaurar</UiButton>
        <UiButton size="sm" variant="ghost" @click="$emit('discard-draft')">Descartar</UiButton>
      </div>
    </div>

    <h1 id="material-title" class="relative text-page-title-sm text-fg-strong sm:text-page-title">
      <template v-if="editing">
        <span v-if="!title" class="pointer-events-none absolute inset-x-0 top-0 text-fg-disabled" aria-hidden="true">Sem título</span>
        <span
          ref="titleRef"
          class="relative block min-h-10 outline-none"
          role="textbox"
          tabindex="0"
          aria-label="Título da nota"
          :contenteditable="draftSavedAt ? 'false' : 'true'"
          data-testid="material-title-input"
          @input="onTitleInput"
          @keydown.enter.prevent="focusEditor"
          @blur="$emit('save-title')"
        />
      </template>
      <template v-else>{{ title || 'Sem título' }}</template>
    </h1>

    <div class="mt-2 flex flex-col gap-1">
      <slot name="source" />
      <p class="text-label text-fg-muted">{{ wordsText }}</p>
    </div>

    <!-- The PDF still writing the note: what exists is shown, only the note refreshes -->
    <p v-if="generatingText" class="mt-4 flex items-center gap-2 text-meta text-fg" role="status">
      <UiSpinner size="sm" /> {{ generatingText }}
    </p>

    <slot name="notices" />

    <div ref="textRoot" class="relative mt-8 max-w-prose" data-testid="material-text">
      <slot name="improve-bar" />
      <div v-if="loading" class="space-y-3" aria-busy="true">
        <span class="sr-only">Carregando o texto…</span>
        <UiSkeleton variant="text" :lines="6" />
      </div>
      <LazyTopicNoteEditor
        v-else
        :model-value="content"
        :editable="editable"
        :topic-id="topicId"
        :page-links="pageLinks"
        @edit="(read: () => Record<string, any>, size: number) => $emit('edit', read, size)"
        @open-page="(page: number) => $emit('open-page', page)"
        @navigate-topic="(t: string) => $emit('navigate-topic', t)"
        @ready="$emit('ready')"
      />
      <MaterialSelectionActions :root="textRoot" :mobile="mobile" @action="(a: SelectionAction, text: string) => $emit('selection', a, text)" />
    </div>

    <slot name="footer" />
  </article>
</template>

<script setup lang="ts">
// The text of the material (prd-4c-material-v3 RF-F2): reading or editing the open note, the title as
// the screen's <h1>, the source line and the number of words from the server (no periodic count of the
// editor text: the old 2 s interval read the whole textContent). Reading by default for a PDF note,
// editing for a manual one; the page owns the mode ("Editar"/"Concluir edição", E). The selection
// actions (card, 3 cards with AI, tira-dúvidas) work in both modes.
import type { SelectionAction } from '~/components/material/SelectionActions.vue'

const props = defineProps<{
  title: string
  content: Record<string, any> | null
  /** The mode chosen ("Editar" pressed) */
  editing: boolean
  /** The editor accepts typing: editing and nothing else holding the text (generation, improve, draft) */
  editable: boolean
  loading?: boolean
  topicId: string
  pageLinks?: boolean
  wordCount: number
  draftSavedAt?: number | null
  /** "Escrevendo a nota · lote 3 de 12" while the PDF job writes it */
  generatingText?: string
  mobile?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'save-title'): void
  (e: 'edit', read: () => Record<string, any>, size: number): void
  (e: 'open-page', page: number): void
  (e: 'selection', action: SelectionAction, text: string): void
  (e: 'navigate-topic', topicId: string): void
  (e: 'restore-draft'): void
  (e: 'discard-draft'): void
  (e: 'ready'): void
}>()

const titleRef = ref<HTMLElement | null>(null)
const textRoot = ref<HTMLElement | null>(null)

const wordsText = computed(() => {
  const n = props.wordCount
  if (!n) return 'Sem texto ainda'
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? 'palavra' : 'palavras'} · cerca de ${Math.max(1, Math.round(n / 200))} min de leitura`
})

// "14:32" today, "31/10 às 14:32" on another day (drafts live up to 7 days)
const draftTime = computed(() => {
  if (!props.draftSavedAt) return ''
  const d = new Date(props.draftSavedAt)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time}`
})

// The editable title only holds what the user typed: the prop fills it when it differs (open, restore)
watch([() => props.title, titleRef], ([val, el]) => {
  if (el && el.textContent !== val) el.textContent = val ?? ''
}, { immediate: true, flush: 'post' })

function onTitleInput(event: Event) {
  emit('update:title', (event.target as HTMLElement).textContent ?? '')
}

function focusEditor() {
  textRoot.value?.querySelector<HTMLElement>('.ProseMirror')?.focus()
}

defineExpose({ textRoot })
</script>
