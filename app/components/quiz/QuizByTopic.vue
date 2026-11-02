<template>
  <UiSection title="Desempenho por assunto" data-testid="quiz-by-topic">
    <!-- Desktop: a table; phone: 2 lines per assunto, no horizontal scroll -->
    <table class="hidden w-full text-body sm:table">
      <thead>
        <tr class="border-b border-line text-left text-label text-fg-muted">
          <th scope="col" class="py-2 pr-3 font-medium">Assunto</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Acertos</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">Nesta bateria</th>
          <th scope="col" class="py-2 pl-3 text-right font-medium">Histórico</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <tr v-for="row in rows" :key="row.topic_id">
          <th scope="row" class="py-3 pr-3 text-left font-medium">
            <UiLink :to="cadernoPath(row.topic_id)">{{ row.name }}</UiLink>
          </th>
          <td class="px-3 py-3 text-right tabular-nums text-fg-strong">{{ row.correct }} de {{ row.answered }}</td>
          <td class="px-3 py-3 text-right tabular-nums font-semibold text-fg-strong">{{ row.accuracy }}%</td>
          <td class="py-3 pl-3 text-right tabular-nums text-fg">
            <template v-if="row.history_accuracy !== null">
              {{ row.history_accuracy }}%
              <span v-if="trend(row) !== 'same'" :class="trend(row) === 'up' ? 'text-success' : 'text-danger'" aria-hidden="true">{{ trend(row) === 'up' ? '▲' : '▼' }}</span>
              <span class="sr-only">{{ trendText(row) }}</span>
            </template>
            <span v-else class="text-fg-muted">—<span class="sr-only">sem 10 questões no histórico</span></span>
          </td>
        </tr>
      </tbody>
    </table>
    <ul class="divide-y divide-line sm:hidden">
      <li v-for="row in rows" :key="row.topic_id" class="py-3">
        <UiLink :to="cadernoPath(row.topic_id)" class="font-medium">{{ row.name }}</UiLink>
        <p class="mt-0.5 text-meta text-fg">
          <span class="font-semibold text-fg-strong">{{ row.correct }} de {{ row.answered }} · {{ row.accuracy }}%</span>
          <template v-if="row.history_accuracy !== null"> · histórico {{ row.history_accuracy }}% <span v-if="trend(row) !== 'same'" :class="trend(row) === 'up' ? 'text-success' : 'text-danger'" aria-hidden="true">{{ trend(row) === 'up' ? '▲' : '▼' }}</span><span class="sr-only">, {{ trendText(row) }}</span></template>
        </p>
      </li>
    </ul>
    <p class="mt-3 text-label text-fg-muted">Histórico: o seu acerto no assunto antes desta bateria, com pelo menos 10 questões.</p>
  </UiSection>
</template>

<script setup lang="ts">
// Result by assunto (prd-4e-praticar-v3 RF-F4.2, RF-B5): `by_topic` of GET /quizzes/{id}, the accuracy here
// against the history without this quiz (≥ 10 answered, else "—"). Each assunto links to its hub.
import type { QuizTopicResult } from '~/types'
import { cadernoPath } from '~/utils/scope'

defineProps<{ rows: QuizTopicResult[] }>()

function trend(row: QuizTopicResult): 'up' | 'down' | 'same' {
  if (row.history_accuracy === null || row.accuracy === row.history_accuracy) return 'same'
  return row.accuracy > row.history_accuracy ? 'up' : 'down'
}

function trendText(row: QuizTopicResult) {
  const t = trend(row)
  if (t === 'same') return 'igual ao histórico'
  return t === 'up' ? 'nesta bateria acima do histórico' : 'nesta bateria abaixo do histórico'
}
</script>
