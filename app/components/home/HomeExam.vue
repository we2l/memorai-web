<template>
  <UiSection v-if="exam" aria-label="Próxima prova" data-testid="home-exam">
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="min-w-0">
        <p class="flex flex-wrap items-center gap-2 font-semibold text-fg-strong">
          {{ exam.title }} {{ when }}
          <UiTag v-if="exam.reta_final_active" tone="action">Reta final</UiTag>
        </p>
        <!-- 2nd line: the pace today; the projection of mastery on the day comes with F6 (PRD §8, Q1) -->
        <p class="text-meta text-fg-muted">{{ pace }}</p>
      </div>
      <UiLink to="/progresso#provas" standalone @click="track">Ver provas →</UiLink>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Next exam on Hoje (prd-4a-hoje-v3 RF-F2): the closest one at any distance (the old 14-day cut is gone),
// with the date and the pace it asks for. A compact white row; nothing when there is no exam.
import type { ExamUpcoming } from '~/types'

const props = defineProps<{ exams: ExamUpcoming[] }>()

const exam = computed(() => [...props.exams]
  .filter(e => e.days_remaining >= 0)
  .sort((a, b) => a.days_remaining - b.days_remaining)[0] ?? null)

const when = computed(() => {
  const d = exam.value?.days_remaining ?? 0
  if (d === 0) return 'é hoje'
  if (d === 1) return 'é amanhã'
  return `em ${d} dias`
})

const pace = computed(() => {
  const n = exam.value?.cards_per_day ?? 0
  return n > 0 ? `Ritmo: ${plural(n, 'card', 'cards')} por dia até lá` : 'Nada atrasado para essa prova'
})

function track() {
  useAnalytics().track('home_exam_click', {})
}
</script>
