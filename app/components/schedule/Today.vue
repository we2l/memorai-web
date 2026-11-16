<template>
  <UiSection variant="primary" :aria-labelledby="headingId" class="flex flex-col gap-4" data-testid="schedule-today">
    <p :id="headingId" tabindex="-1" class="text-label outline-none font-semibold uppercase tracking-logo text-fg-muted">{{ heading }}</p>

    <template v-if="first">
      <div>
        <p class="flex items-center gap-2 text-section text-fg-strong" data-testid="schedule-today-subject">
          <UiSubjectMark :index="subjectIndex(first.subjectId)" size="md" />
          <span class="min-w-0 break-words">{{ first.subjectName }}</span>
        </p>
        <p class="mt-1 text-body text-fg">{{ detail(first) }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UiButton variant="primary" :to="cadernoPath(first.subjectId)" data-testid="schedule-study" @click="$emit('study', first)">Estudar agora</UiButton>
        <!-- loading (aria-disabled) and not disabled: the focus stays on the button while the answer comes -->
        <UiButton variant="outline" :loading="busy && last === 'done'" :aria-disabled="busy ? 'true' : undefined" data-testid="schedule-done" @click="mark('done')">Feito</UiButton>
        <UiButton variant="ghost" :loading="busy && last === 'skipped'" :aria-disabled="busy ? 'true' : undefined" data-testid="schedule-skip" @click="mark('skipped')">Pular</UiButton>
      </div>
      <p v-if="after" class="text-meta text-fg-muted" data-testid="schedule-today-after">{{ afterText }}</p>
    </template>

    <template v-else>
      <p class="text-body text-fg-strong" data-testid="schedule-today-free">{{ doneToday ? 'Feito por hoje. Bom trabalho.' : 'Hoje é folga no cronograma.' }}</p>
      <p v-if="after" class="text-meta text-fg-muted">{{ afterText }}</p>
    </template>
  </UiSection>
</template>

<script setup lang="ts">
// HOJE of the cronograma (prd-cronograma RF-W2; estudo §5.1): the one primary block of the screen. The first session
// of today (or the head of the queue, without an exam date), "Estudar agora" to the matéria's hub, Feito and Pular,
// and what comes after. A free day or a day already done says so, with the next session.
import { dayMonth, durationLabel, sessionTopicLabel, weekdayShort, type StudySession } from '~/utils/studySchedule'

const props = defineProps<{
  /** Today's sessions (or the head of the queue) */
  sessions: StudySession[]
  /** The next session after today's, for the free day */
  next: StudySession | null
  today: string
  calendar: boolean
  doneToday: number
  /** Order of the matérias (their dots) */
  subjectOrder: string[]
  busy?: boolean
}>()

const emit = defineEmits<{
  (e: 'mark', session: StudySession, status: 'done' | 'skipped'): void
  (e: 'study', session: StudySession): void
}>()

const headingId = useId()
const last = ref<'done' | 'skipped' | null>(null)

function mark(status: 'done' | 'skipped') {
  if (props.busy || !first.value) return
  last.value = status
  emit('mark', first.value, status)
}

/** After Feito/Pular (or Desfazer) the block changes: a focus that lost its button comes back to the heading. */
function keepFocus() {
  void nextTick(() => {
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) document.getElementById(headingId)?.focus()
  })
}
watch(() => props.sessions[0]?.id ?? null, keepFocus)
defineExpose({ keepFocus })
const first = computed(() => props.sessions[0] ?? null)
const after = computed(() => props.sessions[1] ?? (first.value ? null : props.next))
const heading = computed(() => (props.calendar ? `Hoje · ${weekdayShort(props.today)} ${dayMonth(props.today)}` : 'Próxima sessão'))
const subjectIndex = (id: string) => Math.max(0, props.subjectOrder.indexOf(id))

function detail(s: StudySession): string {
  return [s.unit && s.parts === 1 ? null : sessionTopicLabel(s), durationLabel(s.minutes), s.start ? `às ${s.start}` : null, s.pass === 2 ? 'reforço' : null]
    .filter(Boolean).join(' · ')
}

const afterText = computed(() => {
  const s = after.value
  if (!s) return ''
  const what = `${s.subjectName} · ${s.unit && s.parts === 1 ? durationLabel(s.minutes) : `${sessionTopicLabel(s)} · ${durationLabel(s.minutes)}`}`
  if (first.value) return `Depois: ${what}`
  return s.date ? `Próxima: ${weekdayShort(s.date)} ${dayMonth(s.date)} · ${what}` : `Próxima: ${what}`
})
</script>
