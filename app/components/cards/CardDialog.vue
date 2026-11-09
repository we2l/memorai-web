<template>
  <UiDialog v-model="open" title="Card" size="lg">
    <template v-if="card">
      <div class="flex flex-wrap items-center gap-2 text-label text-fg-muted">
        <UiTag v-if="card.suspended_at" data-testid="card-paused">Pausado</UiTag>
        <UiTag v-else :tone="state.tone">{{ state.label }}</UiTag>
        <span v-if="due">{{ due }}</span>
        <span v-if="card.lapses > 0">· errou {{ card.lapses }} {{ card.lapses === 1 ? 'vez' : 'vezes' }}</span>
        <span v-if="card.topic_name">· {{ card.topic_name }}</span>
      </div>
      <p class="mt-4 text-label font-medium text-fg-muted">Pergunta</p>
      <div class="mt-1 break-words text-body text-fg-strong" v-html="frontHtml" />
      <p class="mt-4 border-t border-hairline pt-4 text-label font-medium text-fg-muted">Resposta</p>
      <div class="mt-1 break-words text-body text-fg" v-html="backHtml" />
      <p v-if="card.tags?.length" class="mt-4 flex flex-wrap gap-1.5">
        <UiTag v-for="t in card.tags" :key="t">{{ t }}</UiTag>
      </p>
      <p v-if="originText" class="mt-4 flex flex-wrap items-center gap-x-2 rounded-row bg-soft px-3 py-2 text-meta text-fg-muted">
        <span>Origem: {{ originText }}</span>
        <UiLink v-if="originTo" :to="originTo" data-testid="card-origin-link">Abrir a origem ›</UiLink>
      </p>
    </template>
    <template #footer>
      <UiButton variant="ghost" class="mr-auto" @click="$emit('delete', card!)">Excluir</UiButton>
      <!-- A card paused in the review (prd-revisao-v5-fase-b RF-F8): back to the sessions -->
      <UiButton v-if="card?.suspended_at" :loading="resuming" data-testid="card-resume" @click="resume">Retomar</UiButton>
      <UiButton variant="primary" @click="$emit('edit', card!)">Editar</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// A card of the library opened (prd-4c-material-v3 RF-F11): the question and the answer (sanitized HTML),
// its state, tags and origin with "Abrir a origem" (the material of the note or PDF, or the quiz result).
import type { LibraryCard } from '~/types'
import { cardState, dueLabel, originShort } from '~/utils/cardState'

const props = defineProps<{ card: LibraryCard | null; topicId: string }>()
const emit = defineEmits<{ (e: 'edit', card: LibraryCard): void; (e: 'delete', card: LibraryCard): void; (e: 'resumed', card: LibraryCard): void }>()
const open = defineModel<boolean>({ required: true })

const { $api } = useNuxtApp()
const { run, pending: resuming } = useApiAction()
async function resume() {
  const card = props.card
  if (!card) return
  const res = await run(() => $api<{ data: LibraryCard }>(`/flashcards/${card.id}/suspend`, { method: 'DELETE' }), {
    success: 'Card retomado: ele volta às revisões.',
    error: 'Não foi possível retomar o card.',
  })
  if (!res) return
  useAnalytics().track('library_card_resumed', {})
  emit('resumed', { ...card, suspended_at: null })
}

const { sanitize } = useSanitize()
const frontHtml = computed(() => sanitize(props.card?.front ?? ''))
const backHtml = computed(() => sanitize(props.card?.back ?? ''))
const state = computed(() => cardState(props.card ?? { state: 'new', due: null }))
const due = computed(() => (props.card ? dueLabel(props.card) : ''))
const originText = computed(() => originShort(props.card?.origin))
const originTo = computed(() => {
  const o = props.card?.origin
  if (!o) return null
  if (o.kind === 'quiz') return `/simulados/${o.quiz_id}/resultado`
  // The pasted question is the card itself (statement, alternatives, key): "Ver a questão" lives in the review
  if (o.kind === 'question') return null
  const topic = (o.kind === 'note' && o.topic_id) || props.card?.topic_id || props.topicId
  return cadernoPath(topic, { note: o.note_id })
})
</script>
