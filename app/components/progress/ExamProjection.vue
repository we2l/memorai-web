<template>
  <div class="min-w-0" data-testid="exam-projection">
    <p v-if="projection" class="text-meta text-fg">
      <span class="sr-only">{{ ariaLabel }}</span>
      <span aria-hidden="true">
        Projeção: <span class="font-semibold tabular-nums text-fg-strong">{{ projection.keep_pace }}%</span> se mantiver o ritmo ·
        <span class="font-semibold tabular-nums text-fg-strong">{{ projection.stop_today }}%</span> se parar hoje
      </span>
    </p>
    <p v-else class="text-meta text-fg-muted">Revise alguns cards dos assuntos da prova para ver a projeção.</p>
    <template v-if="projection">
      <UiButton size="sm" variant="ghost" class="-ml-3" :aria-expanded="open" :aria-controls="explainId" @click="toggle">
        Como calculamos
      </UiButton>
      <p v-if="open" :id="explainId" class="mt-1 max-w-prose rounded-row bg-soft px-3 py-2 text-meta text-fg">
        Para cada card dos assuntos da prova, calculamos a chance de você lembrar dele no dia, pelo histórico das suas revisões.
        "Se parar hoje" é a média sem nenhuma revisão até lá. "Mantendo o ritmo" supõe que você revise o que vencer e veja
        {{ projection.new_per_day }} cards novos por dia; é um piso, porque não conta revisões a mais nem a Reta final.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
// Projection on the exam day (prd-4f-progresso-v3 RF-F4, §5.1): two numbers, keeping the pace and stopping
// today, with "Como calculamos" in plain words (no formula); without enough data (projection null), what to do.
import type { ExamProjection } from '~/types'

const props = defineProps<{ projection: ExamProjection | null | undefined; examTitle: string }>()

const explainId = useId()
const open = ref(false)
const ariaLabel = computed(() => props.projection
  ? `Projeção na prova ${props.examTitle}: ${props.projection.keep_pace}% mantendo o ritmo, ${props.projection.stop_today}% se parar hoje`
  : undefined)

function toggle() {
  open.value = !open.value
  if (open.value) useAnalytics().track('projection_explain_open', {})
}
</script>
