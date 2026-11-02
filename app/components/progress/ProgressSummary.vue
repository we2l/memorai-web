<template>
  <section aria-label="Resumo" class="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4" data-testid="progress-summary">
    <UiStat
      :value="mastery !== null ? `${mastery}%` : '—'"
      :label="scopeName ? `de domínio em ${scopeName}` : 'de domínio'"
      :hint="deltaText"
    />
    <UiStat
      :value="data.questions.accuracy !== null ? `${data.questions.accuracy}%` : '—'"
      :label="data.questions.accuracy !== null ? `de acerto em ${plural(data.questions.answered, 'questão', 'questões')}` : 'Faça 10 questões para ver o acerto'"
    />
    <UiStat
      :value="data.retention_30d !== null ? `${data.retention_30d}%` : '—'"
      :label="data.retention_30d !== null ? 'lembrou ao revisar (30 dias)' : 'Revise para ver quanto lembra'"
    />
    <UiStat
      :value="plural(data.streak, 'dia', 'dias')"
      :label="data.streak_longest ? `de sequência · recorde ${data.streak_longest}` : 'de sequência'"
      :tone="data.streak > 0 ? 'streak' : 'default'"
    />
  </section>
</template>

<script setup lang="ts">
// Summary of Progresso (prd-4f-progresso-v3 RF-F2): mastery of the scope with its 30-day change (in words, with
// the sign), accuracy in questions (≥ 10), "lembrou ao revisar" in 30 days and the streak with the record. The
// numbers stay in the strong ink (v4); only the streak wears its flame, with words beside it.
import type { ProgressSummaryData } from '~/types'

const props = defineProps<{ data: ProgressSummaryData; scopeName?: string | null }>()

const mastery = computed(() => props.data.mastery.percent)
const deltaText = computed(() => {
  const d = props.data.mastery.delta_30d
  if (d === null || d === undefined) return undefined
  if (d === 0) return 'igual a 30 dias atrás'
  return `${d > 0 ? '▲ +' : '▼ −'}${Math.abs(d)} ${Math.abs(d) === 1 ? 'ponto' : 'pontos'} em 30 dias`
})
</script>
