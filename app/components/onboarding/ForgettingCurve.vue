<template>
  <figure class="flex flex-col gap-3" data-testid="guest-curve">
    <figcaption class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span class="text-body font-semibold text-fg-strong">Quanto você lembra de um card</span>
      <UiTag tone="neutral" data-testid="guest-curve-estimate">Estimativa</UiTag>
    </figcaption>

    <svg :viewBox="`0 0 ${W} ${H}`" class="h-auto w-full" role="img" :aria-label="alt" data-testid="guest-curve-svg">
      <!-- Grid: 100%, 75% and 50% (the axis starts at 50%, written on it) -->
      <g class="text-fg-muted">
        <template v-for="t in TICKS" :key="t">
          <line :x1="X0" :x2="X1" :y1="y(t)" :y2="y(t)" class="stroke-line" stroke-width="1" />
          <text :x="X0 - 6" :y="y(t) + 4" text-anchor="end" class="fill-fg-muted" font-size="11">{{ Math.round(t * 100) }}%</text>
        </template>
        <text v-for="d in dayTicks" :key="`d${d}`" :x="x(d)" :y="H - 6" :text-anchor="d === 0 ? 'start' : d === curve.days ? 'end' : 'middle'" class="fill-fg-muted" font-size="11">{{ d === 0 ? 'hoje' : `${d} d` }}</text>
      </g>
      <!-- Without reviews: the forgetting of a card remembered once -->
      <polyline :points="points(curve.without)" fill="none" class="stroke-fg-muted" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" data-testid="guest-curve-without" />
      <!-- With the Baigi: back to the top on each due day, falling slower each time -->
      <polyline :points="points(curve.with)" fill="none" class="stroke-action" stroke-width="2.5" stroke-linejoin="round" data-testid="guest-curve-with" />
      <circle v-for="d in curve.reviews" :key="`r${d}`" :cx="x(d)" :cy="y(1)" r="3.5" class="fill-action" />
    </svg>

    <ul class="flex flex-col gap-1 text-meta text-fg">
      <li class="flex items-center gap-2">
        <span class="inline-block h-0.5 w-5 shrink-0 bg-action" aria-hidden="true" />
        <span><span class="font-semibold text-fg-strong">Com o Baigi:</span> revisando no dia certo, fica acima de {{ withMin }}%</span>
      </li>
      <li class="flex items-center gap-2">
        <span class="inline-block w-5 shrink-0 border-t-2 border-dashed border-fg-muted" aria-hidden="true" />
        <span><span class="font-semibold text-fg-strong">Sem revisar:</span> cai para uns {{ withoutEnd }}% em {{ curve.days }} dias</span>
      </li>
    </ul>
    <p class="text-label text-fg-muted">Calculado pelo FSRS-6, o algoritmo do Baigi, com os parâmetros padrão. Para cada pessoa e cada card, a curva muda com as respostas.</p>
  </figure>
</template>

<script setup lang="ts">
// The forgetting curve of the visitor's result (prd-revisao-v5-fase-a RF-F8, D11), in place of the list "10 min,
// 2 dias, 11 dias…": two lines from the API (FsrsService::forgettingCurve), "Sem revisar" and "Com o Baigi", with the
// review days marked. Plain SVG, no chart library. The numbers are the default FSRS-6, said as an estimate; the axis
// starts at 50% and says so on its labels. Explains why the card comes back, never threatens.
import type { ForgettingCurve } from '~/utils/guestProgress'

const props = defineProps<{ curve: ForgettingCurve }>()

const W = 320
const H = 168
const X0 = 40
const X1 = W - 8
const Y_TOP = 10
const Y_BOTTOM = H - 24
const R_MIN = 0.5
const TICKS = [1, 0.75, 0.5]

const x = (day: number) => X0 + (day / props.curve.days) * (X1 - X0)
const y = (r: number) => Y_TOP + ((1 - Math.max(R_MIN, r)) / (1 - R_MIN)) * (Y_BOTTOM - Y_TOP)
const points = (series: [number, number][]) => series.map(([d, r]) => `${x(d).toFixed(1)},${y(r).toFixed(1)}`).join(' ')

const dayTicks = computed(() => [0, 10, 20, props.curve.days])
const withoutEnd = computed(() => Math.round((props.curve.without.at(-1)?.[1] ?? 0) * 100))
const withMin = computed(() => Math.floor(Math.min(...props.curve.with.map(([, r]) => r)) * 100))
const alt = computed(() => `Estimativa: sem revisar, a chance de lembrar cai para uns ${withoutEnd.value}% em ${props.curve.days} dias. Com o Baigi, revisando nos dias ${props.curve.reviews.join(' e ')}, fica acima de ${withMin.value}%.`)
</script>
