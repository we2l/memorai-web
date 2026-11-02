<template>
  <p
    v-if="text || lapsesText"
    class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-subtle px-3.5 py-2.5 text-meta text-fg-muted"
    data-testid="review-origin"
  >
    <span v-if="text">Origem: {{ text }}</span>
    <UiLink v-if="to" :to="to" data-testid="review-origin-link" aria-keyshortcuts="O" @click="$emit('open', origin!.kind)">{{ linkText }} ›</UiLink>
    <span v-if="lapsesText" data-testid="review-lapses">{{ lapsesText }}</span>
  </p>
</template>

<script setup lang="ts">
// Where the card came from (prd-4d-revisao-v3 RF-F3), always visible after the answer, on `bg-subtle` (not
// the tinted block): the part of the PDF ("Abrir o trecho"), the note ("Abrir a nota") or the quiz
// question ("Ver a questão"). Without a recorded origin nothing is guessed. "Você errou este card N vezes"
// from 2 lapses. The material opens with ?from=review and the way back to this session.
import type { CardOrigin } from '~/types'
import { documentTitle } from '~/utils/cardState'

const props = defineProps<{
  origin?: CardOrigin | null
  lapses?: number
  /** Topic of the card (the material route needs a scope) */
  topicId?: string | null
  /** The /revisar URL to come back to */
  backTo: string
}>()
defineEmits<{ (e: 'open', kind: CardOrigin['kind']): void }>()

const text = computed(() => {
  const o = props.origin
  if (!o) return ''
  if (o.kind === 'quiz') return o.question_number ? `questão ${o.question_number} do ${o.title}` : o.title
  if (o.kind === 'document') {
    const part = o.part && o.part.total > 1 ? ` · parte ${o.part.index} de ${o.part.total}` : ''
    return `${documentTitle(o.document_name)}${part}${o.page ? `, p. ${o.page}` : ''}`
  }
  return o.title || 'sua nota'
})

const linkText = computed(() => ({ document: 'Abrir o trecho', note: 'Abrir a nota', quiz: 'Ver a questão' })[props.origin?.kind ?? 'note'])

const to = computed(() => {
  const o = props.origin
  if (!o) return null
  if (o.kind === 'quiz') return `/simulados/${o.quiz_id}/resultado${o.question_number ? `#q${o.question_number}` : ''}`
  const topic = (o.kind === 'note' && o.topic_id) || props.topicId
  if (!topic) return null
  return `${cadernoPath(topic, { note: o.note_id })}?from=review&back=${encodeURIComponent(props.backTo)}`
})

const lapsesText = computed(() => ((props.lapses ?? 0) >= 2 ? `Você errou este card ${props.lapses} vezes` : ''))

defineExpose({ to })
</script>
