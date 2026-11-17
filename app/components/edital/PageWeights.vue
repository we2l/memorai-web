<template>
  <!-- Only with the quadro de provas of the edital (RF-W5 item 6): without it, the section does not exist -->
  <UiSection aria-labelledby="edital-weights-title" data-testid="edital-page-weights">
    <h2 id="edital-weights-title" class="text-section text-fg-strong">Peso das matérias</h2>
    <p class="mt-1 text-meta text-fg-muted">Do quadro de provas do edital<template v-if="page"> (p. {{ page }})</template>.</p>
    <table class="mt-4 w-full text-left">
      <thead>
        <tr class="border-b border-hairline">
          <th scope="col" class="py-2 pr-4 text-meta font-semibold text-fg-muted">Matéria</th>
          <th scope="col" class="py-2 text-right text-meta font-semibold text-fg-muted">Questões ou pontos</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-hairline">
        <tr v-for="w in weights" :key="w.subject">
          <th scope="row" class="py-2.5 pr-4 text-body font-normal text-fg-strong">{{ w.subject }}</th>
          <td class="py-2.5 text-right text-body font-semibold tabular-nums text-fg-strong">{{ formatPoints(w.points) }}</td>
        </tr>
      </tbody>
    </table>
  </UiSection>
</template>

<script setup lang="ts">
defineProps<{ weights: { subject: string, points: number }[], page?: number }>()

function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}
</script>
