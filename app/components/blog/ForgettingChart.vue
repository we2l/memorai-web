<template>
  <figure>
    <svg :viewBox="`0 0 ${W} ${H}`" class="h-auto w-full text-action" role="img" :aria-label="label">
      <g class="text-line" stroke="currentColor" stroke-width="1">
        <line v-for="p in [100, 75, 50, 25]" :key="p" :x1="PAD_L" :x2="W - PAD_R" :y1="y(p)" :y2="y(p)" />
      </g>
      <g class="fill-fg-muted text-label" font-size="11">
        <text v-for="p in [100, 75, 50, 25]" :key="`t${p}`" :x="PAD_L - 6" :y="y(p) + 4" text-anchor="end">{{ p }}%</text>
        <text v-for="d in ticks" :key="`d${d}`" :x="x(d)" :y="H - 6" text-anchor="middle">{{ d }}d</text>
      </g>
      <polyline v-if="compare" :points="line(compare)" fill="none" class="text-fg-muted" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" />
      <polyline :points="line(points)" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
      <circle v-if="marker" :cx="x(marker.day)" :cy="y(marker.percent)" r="5" class="fill-fg-strong" />
    </svg>
    <figcaption class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-fg-muted">
      <span><span class="mr-1 inline-block h-0.5 w-5 bg-action align-middle" aria-hidden="true" />{{ legend }}</span>
      <span v-if="compare"><span class="mr-1 inline-block h-0.5 w-5 border-t-2 border-dashed border-fg-muted align-middle" aria-hidden="true" />{{ compareLegend }}</span>
    </figcaption>
    <div class="sr-only">
    <table>
      <caption>{{ label }}</caption>
      <thead><tr><th>Dia</th><th>{{ legend }}</th><th v-if="compare">{{ compareLegend }}</th></tr></thead>
      <tbody>
        <tr v-for="p in tablePoints" :key="p.day"><td>{{ p.day }}</td><td>{{ p.percent }}%</td><td v-if="compare">{{ compareAt(p.day) ? `${compareAt(p.day)!.percent}%` : '—' }}</td></tr>
      </tbody>
    </table>
    </div>
  </figure>
</template>

<script setup lang="ts">
// The forgetting curve of the calculator (RF-T1): SVG drawn with currentColor from tokens, plus a table for screen
// readers (every 7 days). Day 0 = the last time studied.
const props = defineProps<{
  points: { day: number, percent: number }[]
  compare?: { day: number, percent: number }[] | null
  marker?: { day: number, percent: number } | null
  label: string
  legend: string
  compareLegend?: string
}>()

const W = 600
const H = 240
const PAD_L = 44
const PAD_R = 12
const PAD_T = 12
const PAD_B = 26
const maxDay = computed(() => props.points[props.points.length - 1]?.day ?? 60)
const ticks = computed(() => [0, 1, 2, 3, 4].map(i => Math.round(maxDay.value * i / 4)))
const x = (d: number) => PAD_L + (d / maxDay.value) * (W - PAD_L - PAD_R)
const y = (p: number) => PAD_T + (1 - p / 100) * (H - PAD_T - PAD_B)
const line = (pts: { day: number, percent: number }[]) => pts.map(p => `${x(p.day).toFixed(1)},${y(p.percent).toFixed(1)}`).join(' ')
const step = computed(() => Math.max(7, Math.round(maxDay.value / 8)))
const tablePoints = computed(() => props.points.filter(p => p.day % step.value === 0))
const compareAt = (day: number) => props.compare?.find(c => c.day === day)
</script>
