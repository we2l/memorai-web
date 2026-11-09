<template>
  <UiSection title="Últimos 6 meses" data-testid="progress-history">
    <template #action>
      <p class="text-meta text-fg-muted" aria-hidden="true">{{ caption }}</p>
    </template>
    <p class="sr-only">Cada dia é um botão: as setas andam pelos dias e Enter mostra o que você estudou.</p>

    <div class="flex max-w-2xl gap-1.5">
      <!-- Weekday names, aligned to the rows -->
      <div class="grid grid-rows-7 gap-0.5 pt-5 text-label text-fg-muted sm:gap-1" aria-hidden="true">
        <span v-for="(d, r) in WEEKDAYS" :key="r" class="flex items-center leading-none">{{ r % 2 ? d : '' }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <!-- Months over their first week -->
        <div class="mb-1 grid h-4 gap-0.5 text-label text-fg-muted sm:gap-1" :class="cols" aria-hidden="true">
          <span v-for="(m, c) in monthLabels" :key="c" class="overflow-visible whitespace-nowrap leading-none">{{ m }}</span>
        </div>
        <div ref="grid" role="grid" :aria-label="`Dias de estudo de ${rangeLabel}`" class="flex flex-col gap-0.5 sm:gap-1" @keydown="onKeydown">
          <div v-for="(row, r) in cells" :key="r" role="row" class="grid gap-0.5 sm:gap-1" :class="cols">
            <template v-for="(cell, c) in row" :key="c">
              <span v-if="!cell" role="gridcell" class="aspect-square" />
              <span v-else role="gridcell" class="aspect-square">
                <button
                  type="button"
                  :data-cell="`${r}-${c}`"
                  :tabindex="focus.r === r && focus.c === c ? 0 : -1"
                  :aria-label="cell.label"
                  :aria-current="cell.today ? 'date' : undefined"
                  class="block size-full rounded-tag transition-shadow duration-fast hover:ring-2 hover:ring-line-strong"
                  :class="[LEVELS[cell.level], cell.today && 'ring-2 ring-fg-strong']"
                  @click="emit('open', cell.date)"
                  @focus="hover(cell, r, c)"
                  @mouseenter="hover(cell, r, c)"
                  @mouseleave="caption = defaultCaption"
                />
              </span>
            </template>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-end gap-1.5 text-label text-fg-muted" aria-hidden="true">
          <span>Menos</span>
          <span v-for="(l, i) in LEVELS" :key="i" class="size-3 rounded-tag" :class="l" />
          <span>Mais</span>
        </div>
      </div>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// History of the last 26 weeks (prd-4f-progresso-v3 RF-F6): weeks in columns and weekdays in rows, 5 levels of
// the action hue (sequential, one hue: track → subtle → action), "Menos · Mais". Every day is a <button> with
// its name ("3 de novembro: 45 revisões"), in a role="grid" walked by the arrows (roving tabindex); today has
// an outline. The days are study days of São Paulo, as the streak (GET /stats/history, sparse: the empty days
// are filled here). Click or Enter opens the panel of the day.
import type { StudyHistory } from '~/types'

const props = defineProps<{ history: StudyHistory }>()
const emit = defineEmits<{ open: [date: string] }>()

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const LEVELS = ['bg-progress-track', 'bg-action-subtle', 'bg-action/40', 'bg-action/70', 'bg-action']
const DAY = 86_400_000

interface Cell { date: string; reviews: number; level: number; label: string; today: boolean }

const utc = (d: string) => Date.parse(`${d}T00:00:00Z`)
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const longDate = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

const end = computed(() => utc(props.history.to))
const start = computed(() => end.value - 181 * DAY)
/** The Sunday on or before the first day */
const gridStart = computed(() => start.value - new Date(start.value).getUTCDay() * DAY)
const weeks = computed(() => Math.floor((end.value - gridStart.value) / DAY / 7) + 1)
// 182 days span 26 or 27 weeks, by the weekday of the first one (literal classes: Tailwind sees them)
const cols = computed(() => (weeks.value > 26 ? 'grid-cols-27' : 'grid-cols-26'))

const byDate = computed(() => new Map(props.history.days.map(d => [d.date, d.reviews])))
const max = computed(() => Math.max(1, props.history.max || 0, ...props.history.days.map(d => d.reviews)))

const cells = computed<(Cell | null)[][]>(() => Array.from({ length: 7 }, (_, r) => Array.from({ length: weeks.value }, (_, c) => {
  const ms = gridStart.value + (c * 7 + r) * DAY
  if (ms < start.value || ms > end.value) return null
  const date = iso(ms)
  const reviews = byDate.value.get(date) ?? 0
  const level = reviews ? Math.min(4, Math.max(1, Math.ceil((reviews * 4) / max.value))) : 0
  const label = `${longDate(ms)}: ${reviews ? plural(reviews, 'revisão', 'revisões') : 'sem estudo'}`
  return { date, reviews, level, label, today: ms === end.value }
})))

const monthLabels = computed(() => Array.from({ length: weeks.value }, (_, c) => {
  const first = gridStart.value + c * 7 * DAY
  const prev = first - 7 * DAY
  const m = new Date(first).getUTCMonth()
  return c === 0 || new Date(prev).getUTCMonth() !== m ? new Date(first).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '') : ''
}))
const rangeLabel = computed(() => `${longDate(start.value)} a ${longDate(end.value)}`)

const defaultCaption = 'Toque num dia para ver o que estudou'
const caption = ref(defaultCaption)

// Roving focus: today first
const todayPos = computed(() => {
  const days = Math.round((end.value - gridStart.value) / DAY)
  return { r: days % 7, c: Math.floor(days / 7) }
})
const focus = ref({ r: 0, c: 0 })
watch(todayPos, (p) => { focus.value = { ...p } }, { immediate: true })

function hover(cell: Cell, r: number, c: number) {
  caption.value = cell.label
  focus.value = { r, c }
}

const grid = ref<HTMLElement | null>(null)
function onKeydown(e: KeyboardEvent) {
  const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
  let { r, c } = focus.value
  if (moves[e.key]) {
    const [dr, dc] = moves[e.key]!
    // Up/down cross the week: the day before Sunday is the Saturday of the previous column
    r += dr
    c += dc
    if (r < 0) { r = 6; c -= 1 }
    if (r > 6) { r = 0; c += 1 }
  } else if (e.key === 'Home') {
    c = 0
  } else if (e.key === 'End') {
    ({ r, c } = todayPos.value)
  } else {
    return
  }
  e.preventDefault()
  if (c < 0 || c >= weeks.value || !cells.value[r]?.[c]) return
  focus.value = { r, c }
  nextTick(() => grid.value?.querySelector<HTMLButtonElement>(`[data-cell="${r}-${c}"]`)?.focus())
}
</script>
