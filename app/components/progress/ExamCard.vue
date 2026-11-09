<template>
  <UiSection v-if="exam?.projection" variant="tinted" aria-label="Projeção da prova" data-testid="progress-exam-card">
    <div class="flex items-start justify-between gap-3">
      <p class="pt-1 text-label font-semibold text-action-fg">{{ exam.title }} · {{ when }}</p>
      <span class="inline-flex shrink-0 items-center gap-1.5 rounded-chip bg-raised px-2.5 py-1 text-label font-semibold text-fg-strong shadow-0">
        <CalendarDays class="size-3.5" aria-hidden="true" />{{ shortDate }}
      </span>
    </div>
    <p class="mt-2.5 text-section text-fg-strong">
      <em class="pe-it">Mantendo o ritmo</em>, você chega à prova lembrando
      <UiNumber :value="`${exam.projection.keep_pace}%`" size="s" class="pe-num" />
    </p>
    <div class="mt-3.5 flex flex-wrap gap-2">
      <span class="inline-flex min-h-7 items-center rounded-chip bg-raised px-2.75 text-label font-semibold text-fg">Se parar hoje: {{ exam.projection.stop_today }}%</span>
      <span v-if="exam.projection.new_per_day" class="inline-flex min-h-7 items-center rounded-chip bg-raised px-2.75 text-label font-semibold text-fg">{{ plural(exam.projection.new_per_day, 'card novo', 'cards novos') }} por dia até lá</span>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// The exam card of Progresso, E2 (prd-visual-e2 RF-5.4; the E1 of ADR-035): the nearest exam with a projection, as the
// one lilac block of the screen: "Mantendo o ritmo, você chega à prova lembrando 90%" (the italic only on the exam
// card), and "Se parar hoje". Nothing without a projection (the list of exams says what to do).
import { CalendarDays } from 'lucide-vue-next'
import type { Exam } from '~/types'

const props = defineProps<{ exams: Exam[] }>()

const exam = computed(() => [...props.exams].filter(e => !e.is_past && e.projection).sort((a, b) => a.days_remaining - b.days_remaining)[0] ?? null)
const when = computed(() => {
  const d = exam.value?.days_remaining ?? 0
  return d === 0 ? 'é hoje' : d === 1 ? 'é amanhã' : `em ${d} dias`
})
const shortDate = computed(() => (exam.value
  ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${exam.value.exam_date.slice(0, 10)}T12:00:00Z`)).replace('.', '')
  : ''))
</script>

<style scoped>
.pe-it { font-family: var(--font-it); font-weight: 500; font-size: 1.08em; letter-spacing: -0.01em; }
.pe-num { color: var(--action-fg); vertical-align: -0.12em; }
</style>
