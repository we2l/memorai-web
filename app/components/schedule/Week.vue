<template>
  <UiSection :aria-labelledby="headingId" data-testid="schedule-week">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 :id="headingId" class="text-title font-semibold text-fg-strong">{{ rangeLabel }}</h2>
      <div class="flex items-center gap-1">
        <UiIconButton :icon="ChevronLeft" label="Semana anterior" :disabled="!canBack" data-testid="schedule-week-prev" @click="move(-1)" />
        <UiButton variant="ghost" size="sm" :disabled="isCurrent" data-testid="schedule-week-today" @click="monday = firstMonday">Hoje</UiButton>
        <UiIconButton :icon="ChevronRight" label="Próxima semana" :disabled="!canForward" data-testid="schedule-week-next" @click="move(1)" />
      </div>
    </div>

    <ol class="week-grid mt-4" :class="grid && 'is-grid'" :aria-label="`Sessões de ${rangeLabel}`">
      <li
        v-for="d in days"
        :key="d.date"
        class="week-day flex min-w-0 gap-3 py-3"
        :class="grid && 'lg:flex-col lg:gap-2 lg:rounded-tile lg:bg-soft lg:p-3'"
        :aria-current="d.date === today ? 'date' : undefined"
        :data-testid="`schedule-day-${d.date}`"
      >
        <p class="w-14 shrink-0 text-meta" :class="grid && 'lg:w-auto'">
          <span class="font-semibold text-fg-strong">{{ weekdayShort(d.date) }}</span>
          <span class="text-fg-muted"> {{ dayMonth(d.date) }}</span>
          <span v-if="d.date === today" class="block text-label font-semibold text-action-fg">hoje</span>
        </p>
        <div class="min-w-0 flex-1">
          <p v-if="!d.day" class="text-meta text-fg-muted">—</p>
          <p v-else-if="d.day.phase === 'final'" class="text-meta text-fg">Reta final: revisão e simulados</p>
          <p v-else-if="!d.day.sessions.length" class="text-meta text-fg-muted">Folga</p>
          <ul v-else class="flex flex-col gap-1">
            <li v-for="s in d.day.sessions" :key="s.id">
              <UiMenu v-if="interactive" :items="menuFor(s)" align="start">
                <template #trigger="{ props: trigger }">
                  <button
                    v-bind="trigger as Record<string, unknown>"
                    type="button"
                    class="flex w-full min-h-touch items-start gap-2 rounded-row px-1 py-1 text-left transition-colors duration-fast hover:bg-hover"
                    :aria-label="`${s.subjectName}, ${sessionTopicLabel(s)}, ${durationLabel(s.minutes)}${s.start ? ` às ${s.start}` : ''}. Opções`"
                  >
                    <UiSubjectMark :index="subjectIndex(s.subjectId)" class="mt-1.5" />
                    <SessionText :s="s" />
                  </button>
                </template>
              </UiMenu>
              <div v-else class="flex items-start gap-2 px-1 py-1">
                <UiSubjectMark :index="subjectIndex(s.subjectId)" class="mt-1.5" />
                <SessionText :s="s" />
              </div>
            </li>
          </ul>
        </div>
        <p v-if="d.day?.minutes" class="shrink-0 text-meta text-fg-muted" :class="grid && 'lg:mt-auto'">{{ durationLabel(d.day.minutes) }}</p>
      </li>
    </ol>
  </UiSection>
</template>

<script setup lang="ts">
// Week by week of the cronograma (prd-cronograma RF-W2; estudo §5.1, §5.2): a list of the 7 days on the phone and a
// grid of 7 columns from 1024 px, ‹ Hoje › to walk the weeks between today and the exam. Each session shows the
// matéria (its dot), the assunto, the length and the hour; in the caderno it opens a menu with Feito, Pular and
// "Abrir a matéria". The final stretch says what it is for; a day without hours says "Folga".
import { defineComponent, h } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import { addDays, dayMonth, durationLabel, sessionTopicLabel, weekDays, weekdayShort, weekStart, type StudySchedule, type StudySession } from '~/utils/studySchedule'

const props = withDefaults(defineProps<{
  schedule: StudySchedule
  today: string
  /** Feito / Pular / Abrir a matéria on each session (the caderno) */
  interactive?: boolean
  /** 7 columns from 1024 px (the caderno); false keeps the list (the free tool's reading column) */
  grid?: boolean
}>(), { interactive: false, grid: true })

const emit = defineEmits<{ (e: 'mark', session: StudySession, status: 'done' | 'skipped'): void }>()

const headingId = useId()
const firstMonday = computed(() => weekStart(props.today))
const lastMonday = computed(() => weekStart(props.schedule.days.at(-1)?.date ?? props.today))
const monday = ref(firstMonday.value)
watch(firstMonday, (v) => { monday.value = v })

const days = computed(() => weekDays(props.schedule, monday.value))
const isCurrent = computed(() => monday.value === firstMonday.value)
const canBack = computed(() => monday.value > firstMonday.value)
const canForward = computed(() => monday.value < lastMonday.value)
const rangeLabel = computed(() => {
  const end = addDays(monday.value, 6)
  const [, m1, d1] = monday.value.split('-')
  const [, m2, d2] = end.split('-')
  return m1 === m2 ? `Semana ${Number(d1)}–${Number(d2)}/${m1}` : `Semana ${d1}/${m1}–${d2}/${m2}`
})

const order = computed(() => new Map(props.schedule.bySubject.map((s, i) => [s.id, i])))
const subjectIndex = (id: string) => order.value.get(id) ?? 0

function move(step: number) {
  monday.value = addDays(monday.value, step * 7)
}

function menuFor(s: StudySession): MenuItem[] {
  return [
    { label: 'Feito', onSelect: () => emit('mark', s, 'done') },
    { label: 'Pular', meta: 'vai para o fim da rodada', onSelect: () => emit('mark', s, 'skipped') },
    { label: 'Abrir a matéria', to: cadernoPath(s.subjectId), separator: true },
  ]
}

/** "Língua Portuguesa" over "Crase · 1 h · 19:00" */
const SessionText = defineComponent({
  props: { s: { type: Object as () => StudySession, required: true } },
  setup(p) {
    return () => h('span', { class: 'min-w-0 flex-1' }, [
      h('span', { class: 'block break-words text-body-sm font-semibold text-fg-strong' }, p.s.subjectName),
      h('span', { class: 'block break-words text-meta text-fg-muted' }, [
        p.s.unit && p.s.parts === 1 ? durationLabel(p.s.minutes) : `${sessionTopicLabel(p.s)} · ${durationLabel(p.s.minutes)}`,
        p.s.start ? ` · ${p.s.start}` : '',
        p.s.pass === 2 ? ' · reforço' : '',
      ]),
    ])
  },
})
</script>

<style scoped>
/* A list split by hairlines on the phone; 7 equal columns from 1024 px (the hub's breakpoint) */
.week-grid > li + li { border-top: 1px solid var(--hairline); }
@media (min-width: 64rem) {
  .week-grid.is-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.5rem; }
  .week-grid.is-grid > li + li { border-top: 0; }
  .week-grid.is-grid .week-day { min-height: 10rem; }
}
</style>
