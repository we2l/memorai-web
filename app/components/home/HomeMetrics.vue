<template>
  <ul v-if="items.length" class="grid grid-cols-1 gap-4 px-1 sm:grid-cols-3" aria-label="Seus números" data-testid="home-metrics">
    <li v-for="m in items" :key="m.key" :data-testid="`home-metric-${m.key}`">
      <UiMetricTile :icon="m.icon" :tone="m.tone" :value="m.value" :label="m.label" />
    </li>
  </ul>
</template>

<script setup lang="ts">
// The loose metrics of Hoje, A2 (prd-visual-a2 RF-2.3, §3.2.6 rule 3): three UiMetricTile under the goal, no card.
// The streak (/stats.streak), the days studied in the week (days with reviews in /stats/history?days=7, the
// owner's choice over "metas na semana", which the API does not keep per day) and what was remembered in 30 days
// (/stats/progress retention_30d). A metric without data leaves; never a "0" or "0%".
import { CalendarCheck, Flame, TrendingUp } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { Stats, StudyHistory } from '~/types'
import type { IconTileTone } from '~/components/ui/IconTile.vue'

const props = defineProps<{ stats: Stats | null; history: StudyHistory | null; retention: number | null }>()

interface Metric { key: string; icon: Component; tone: IconTileTone; value: string | number; label: string }

const items = computed<Metric[]>(() => {
  const out: Metric[] = []
  const streak = props.stats?.streak ?? 0
  if (streak > 0) out.push({ key: 'streak', icon: Flame, tone: 'streak', value: streak, label: streak === 1 ? 'dia seguido' : 'dias seguidos' })
  const days = props.history ? props.history.days.filter(d => d.reviews > 0).length : 0
  if (days > 0) out.push({ key: 'week', icon: CalendarCheck, tone: 'goal', value: days, label: days === 1 ? 'dia estudado na semana' : 'dias estudados na semana' })
  if (props.retention) out.push({ key: 'retention', icon: TrendingUp, tone: 'accuracy', value: `${Math.round(props.retention)}%`, label: 'lembrados em 30 dias' })
  return out
})
</script>
