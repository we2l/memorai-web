<template>
  <UiSection title="Por matéria" data-testid="schedule-subjects">
    <table class="w-full text-left">
      <thead class="sr-only sm:not-sr-only">
        <tr class="text-label font-semibold text-fg-muted">
          <th scope="col" class="pb-2 font-semibold">Matéria</th>
          <th scope="col" class="pb-2 text-right font-semibold">Peso</th>
          <th scope="col" class="pb-2 text-right font-semibold">Vistos</th>
          <th v-if="calendar" scope="col" class="pb-2 text-right font-semibold">Horas</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-hairline">
        <tr v-for="(s, i) in subjects" :key="s.id" class="align-top" :data-testid="`schedule-subject-${s.id}`">
          <th scope="row" class="py-2.5 pr-3 font-normal">
            <span class="flex items-start gap-2">
              <UiSubjectMark :index="i" class="mt-1.5" />
              <span class="min-w-0">
                <span class="block break-words text-body text-fg-strong">{{ s.name }}</span>
                <span class="block text-meta text-fg-muted">{{ sourceText(s) }}</span>
              </span>
            </span>
          </th>
          <td class="py-2.5 text-right text-body tabular-nums text-fg-strong">{{ fmt(s.weight) }}</td>
          <td class="py-2.5 pl-3 text-right text-body tabular-nums text-fg-strong">{{ s.seen }}/{{ s.topics }}</td>
          <td v-if="calendar" class="py-2.5 pl-3 text-right text-body tabular-nums text-fg-strong">{{ hours(s.doneMinutes) }}/{{ hours(s.plannedMinutes) }}</td>
        </tr>
      </tbody>
    </table>
  </UiSection>
</template>

<script setup lang="ts">
// "Por matéria" of the cronograma (estudo §4.3, §5.2): the effective weight (points × level) with its origin, the
// assuntos seen in the first contact over the total and the hours done over planned (planned = done + what is on
// the calendar until the exam). Numbers in black, the dot of the matéria beside its name.
import type { ScheduleSubjectSummary } from '~/utils/studySchedule'

defineProps<{ subjects: ScheduleSubjectSummary[], calendar: boolean }>()

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const hours = (minutes: number) => fmt(Math.round((minutes / 60) * 10) / 10)

function sourceText(s: ScheduleSubjectSummary): string {
  const level = s.level === 'beginner' ? ' · do zero' : s.level === 'mastered' ? ' · domina' : ''
  if (s.source === 'edital') return `Peso do edital${level}`
  if (s.source === 'manual') return s.editalPoints !== null ? `Seu peso · no edital: ${fmt(s.editalPoints)} ${s.editalPoints === 1 ? 'ponto' : 'pontos'}${level}` : `Seu peso${level}`
  return `Peso pelo tamanho${level}`
}
</script>
