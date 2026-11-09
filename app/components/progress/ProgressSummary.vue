<template>
  <section aria-label="Resumo" class="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" data-testid="progress-summary">
    <div v-for="m in metrics" :key="m.key" class="rounded-card bg-raised p-4 shadow-1" :data-testid="`progress-metric-${m.key}`">
      <UiIconTile :icon="m.icon" :tone="m.tone" size="sm" />
      <p class="mt-3"><UiNumber :value="m.value" :unit="m.unit" size="s" /></p>
      <p class="mt-1 text-meta text-fg-muted">{{ m.label }}<template v-if="m.hint"> · <span class="font-semibold" :class="m.hintTone">{{ m.hint }}</span></template></p>
    </div>
  </section>
</template>

<script setup lang="ts">
// Summary of Progresso, E2 (prd-visual-e2 RF-5.4; prd-4f-progresso-v3 RF-F2): four cards with the icon of the metric
// (ADR-035 §1, the color only identifies), the number in the Fraunces and the label: mastery of the scope with its
// 30-day change (in words, with the sign), accuracy in questions (≥ 10), "lembrou ao revisar" in 30 days and the
// streak with the record.
import { Check, Flame, Layers, TrendingUp } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { IconTileTone } from '~/components/ui/IconTile.vue'
import type { ProgressSummaryData } from '~/types'

const props = defineProps<{ data: ProgressSummaryData; scopeName?: string | null }>()

const mastery = computed(() => props.data.mastery.percent)
const deltaText = computed(() => {
  const d = props.data.mastery.delta_30d
  if (d === null || d === undefined) return undefined
  if (d === 0) return 'igual a 30 dias atrás'
  return `${d > 0 ? '▲ +' : '▼ −'}${Math.abs(d)} ${Math.abs(d) === 1 ? 'ponto' : 'pontos'} em 30 dias`
})

const metrics = computed<{ key: string; icon: Component; tone: IconTileTone; value: string; unit?: string; label: string; hint?: string; hintTone?: string }[]>(() => [
  {
    key: 'mastery', icon: Layers, tone: 'action', value: mastery.value !== null ? `${mastery.value}%` : '—',
    label: props.scopeName ? `de domínio em ${props.scopeName}` : 'de domínio',
    hint: deltaText.value, hintTone: (props.data.mastery.delta_30d ?? 0) > 0 ? 'text-success' : 'text-fg-muted',
  },
  {
    key: 'accuracy', icon: TrendingUp, tone: 'accuracy', value: props.data.questions.accuracy !== null ? `${props.data.questions.accuracy}%` : '—',
    label: props.data.questions.accuracy !== null ? `de acerto em ${plural(props.data.questions.answered, 'questão', 'questões')}` : 'Faça 10 questões para ver o acerto',
  },
  {
    key: 'retention', icon: Check, tone: 'goal', value: props.data.retention_30d !== null ? `${props.data.retention_30d}%` : '—',
    label: props.data.retention_30d !== null ? 'lembrou ao revisar (30 dias)' : 'Revise para ver quanto lembra',
  },
  {
    key: 'streak', icon: Flame, tone: 'streak', value: String(props.data.streak), unit: props.data.streak === 1 ? 'dia' : 'dias',
    label: props.data.streak_longest ? `de sequência · recorde ${props.data.streak_longest}` : 'de sequência',
  },
])
</script>
