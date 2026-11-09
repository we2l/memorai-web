<template>
  <p
    v-if="text || lapsesText"
    class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-tile bg-soft px-3.5 py-3 text-meta text-fg-muted"
    data-testid="review-origin"
  >
    <span v-if="text">Origem: {{ text }}</span>
    <UiLink v-if="to" :to="to" data-testid="review-origin-link" aria-keyshortcuts="O" @click="$emit('open', origin!.kind)">{{ linkText }} ›</UiLink>
    <!-- The pasted question opens over the session, which stays where it was -->
    <button
      v-else-if="origin?.kind === 'question'"
      type="button"
      class="hit-touch rounded-tag font-semibold text-action-fg underline-offset-2 transition-colors duration-fast hover:text-action-hover hover:underline"
      data-testid="review-origin-link"
      aria-keyshortcuts="O"
      aria-haspopup="dialog"
      @click="$emit('open', 'question'); $emit('view-question', origin.question_id)"
    >
      Ver a questão ›
    </button>
    <span v-if="lapsesText" data-testid="review-lapses">{{ lapsesText }}</span>
  </p>
</template>

<script setup lang="ts">
// Where the card came from (prd-4d-revisao-v3 RF-F3), always visible after the answer, on `bg-soft` (not
// the tinted block): the part of the PDF ("Abrir o trecho"), the note ("Abrir a nota") or the quiz
// question ("Ver a questão"), or the pasted question (prd-questao-errada: "Ver a questão" opens a dialog). Without a recorded origin nothing is guessed. "Você errou este card N vezes"
// from 2 lapses. The material opens with ?from=review and the way back to this session.
import type { CardOrigin } from '~/types'
import { documentTitle } from '~/utils/cardState'
import { reviewOriginLink } from '~/utils/reviewOrigin'

const props = defineProps<{
  origin?: CardOrigin | null
  lapses?: number
  /** Topic of the card (the material route needs a scope) */
  topicId?: string | null
  /** The /revisar URL to come back to */
  backTo: string
}>()
defineEmits<{ (e: 'open', kind: CardOrigin['kind']): void, (e: 'view-question', id: string): void }>()

const text = computed(() => {
  const o = props.origin
  if (!o) return ''
  if (o.kind === 'quiz') return o.question_number ? `questão ${o.question_number} do ${o.title}` : o.title
  if (o.kind === 'question') return o.source ? `questão colada · ${o.source}` : 'questão colada'
  if (o.kind === 'document') {
    const part = o.part && o.part.total > 1 ? ` · parte ${o.part.index} de ${o.part.total}` : ''
    return `${documentTitle(o.document_name)}${part}${o.page ? `, p. ${o.page}` : ''}`
  }
  return o.title || 'sua nota'
})

const linkText = computed(() => ({ document: 'Abrir o trecho', note: 'Abrir a nota', quiz: 'Ver a questão', question: 'Ver a questão' })[props.origin?.kind ?? 'note'])

const to = computed(() => reviewOriginLink(props.origin, props.topicId, props.backTo))

const lapsesText = computed(() => ((props.lapses ?? 0) >= 2 ? `Você errou este card ${props.lapses} vezes` : ''))

defineExpose({ to })
</script>
