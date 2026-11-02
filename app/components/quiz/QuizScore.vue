<template>
  <UiSection as="header" class="flex flex-col gap-3" data-testid="quiz-score">
    <p class="text-meta text-fg-muted">{{ summary }}</p>
    <h1 class="text-page-title-sm text-fg-strong sm:text-page-title">Você acertou {{ correct }} de {{ total }}</h1>
    <div class="flex flex-wrap items-baseline gap-x-5 gap-y-2">
      <span class="text-stat tabular-nums text-fg-strong">{{ percent }}%</span>
      <!-- The change against the last time, in words and with an arrow (never the color alone) -->
      <p v-if="previous" class="flex items-center gap-1.5 text-meta font-semibold" :class="deltaTone" data-testid="quiz-delta">
        <component :is="deltaIcon" class="size-4 shrink-0" aria-hidden="true" />
        {{ deltaText }}
      </p>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Score of a finished quiz (prd-4e-praticar-v3 RF-F4.1): "20 questões em 31 min", "Você acertou 13 de 20",
// the percent and the change against the previous quiz of the same topic (`previous.delta`).
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-vue-next'
import type { Quiz } from '~/types'

const props = defineProps<{ quiz: Quiz; scopeName?: string | null }>()

const total = computed(() => props.quiz.total_questions)
const correct = computed(() => props.quiz.correct_count ?? 0)
const percent = computed(() => Math.round(props.quiz.score_percent ?? 0))
const previous = computed(() => props.quiz.previous ?? null)

const summary = computed(() => {
  const parts = [plural(total.value, 'questão', 'questões')]
  const secs = props.quiz.time_spent_seconds ?? 0
  if (secs >= 60) parts[0] += ` em ${Math.round(secs / 60)} min`
  if (props.scopeName) parts.push(props.scopeName)
  return parts.join(' · ')
})

const delta = computed(() => previous.value?.delta ?? 0)
const deltaIcon = computed(() => (delta.value > 0 ? ArrowUpRight : delta.value < 0 ? ArrowDownRight : ArrowRight))
const deltaTone = computed(() => (delta.value > 0 ? 'text-success' : delta.value < 0 ? 'text-danger' : 'text-fg-muted'))
const deltaText = computed(() => {
  const d = delta.value
  if (d === 0) return `Igual à última vez neste assunto (${previous.value!.score_percent}%)`
  const n = Math.abs(d)
  return `${d > 0 ? '+' : '−'}${plural(n, 'ponto', 'pontos')} em relação à última vez neste assunto`
})
</script>
