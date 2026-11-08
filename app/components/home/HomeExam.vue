<template>
  <UiSection v-if="exam" aria-label="Próxima prova" data-testid="home-exam" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="min-w-0">
        <p class="flex flex-wrap items-center gap-2 font-semibold text-fg-strong">
          {{ exam.title }} {{ when }}
          <UiTag v-if="exam.reta_final_active" tone="action">Reta final</UiTag>
        </p>
        <!-- 2nd line: the pace and the projection on the day if it is kept (prd-4f-progresso-v3 RF-F11) -->
        <p class="text-meta text-fg-muted" data-testid="home-exam-pace">{{ pace }}<template v-if="exam.projection"> · Projeção: <span class="font-semibold tabular-nums text-fg-strong">{{ exam.projection.keep_pace }}%</span> se mantiver o ritmo</template></p>
      </div>
      <UiLink to="/progresso#provas" standalone @click="track">Ver provas →</UiLink>
    </div>
    <!-- The onboarding's exam stuck on the sample (prd-revisao-v5-fase-b RF-F12) -->
    <LazyExamMoveOffer
      v-if="offer?.move_offer"
      :exam-id="offer.id"
      :exam-title="offer.title"
      :target="offer.move_offer"
      origin="home"
      @moved="examStore.fetchUpcoming()"
    />
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

const offer = computed(() => props.exams.find(e => e.move_offer) ?? null)
const examStore = useExamStore()

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
