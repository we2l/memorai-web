<template>
  <UiSection v-if="exam?.readiness?.score != null" variant="tinted" aria-label="Prontidão para a prova" data-testid="progress-exam-card">
    <div class="flex items-start justify-between gap-3">
      <p class="pt-1 text-label font-semibold text-action-fg">{{ exam.title }} · {{ when }}</p>
      <span class="inline-flex shrink-0 items-center gap-1.5 rounded-chip bg-raised px-2.5 py-1 text-label font-semibold text-fg-strong shadow-0">
        <CalendarDays class="size-3.5" aria-hidden="true" />{{ shortDate }}
      </span>
    </div>
    <ExamReadinessScore :readiness="exam.readiness" class="mt-3" />
  </UiSection>
</template>

<script setup lang="ts">
// The exam card of Progresso (prd-prontidao-prova RF-F3; E2 of ADR-035): the nearest exam with a readiness number, as
// the one lilac block of the screen: number, band and parts. The primary of the screen stays "Revisar para a prova";
// the actions and "Como calculamos" live in the exam's row of the agenda. Nothing without a number (the row says
// what is left).
import { CalendarDays } from 'lucide-vue-next'
import type { Exam } from '~/types'

const props = defineProps<{ exams: Exam[] }>()

const exam = computed(() => [...props.exams].filter(e => !e.is_past && e.readiness?.score != null).sort((a, b) => a.days_remaining - b.days_remaining)[0] ?? null)
const when = computed(() => {
  const d = exam.value?.days_remaining ?? 0
  return d === 0 ? 'é hoje' : d === 1 ? 'é amanhã' : `em ${d} dias`
})
const shortDate = computed(() => (exam.value
  ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${exam.value.exam_date.slice(0, 10)}T12:00:00Z`)).replace('.', '')
  : ''))
</script>
