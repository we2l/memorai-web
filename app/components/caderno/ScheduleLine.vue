<template>
  <UiSection flush class="px-2 py-2" aria-label="Cronograma" data-testid="scope-schedule">
    <UiListRow :to="cadernoPath(topicId, { view: 'cronograma' })" :title="title" :meta="meta" data-testid="scope-schedule-link">
      <template #leading>
        <UiIconTile :icon="CalendarDays" tone="neutral" />
      </template>
      <template #trailing>
        <ChevronRight class="size-4.5 text-fg-muted" aria-hidden="true" />
      </template>
    </UiListRow>
  </UiSection>
</template>

<script setup lang="ts">
// The hub's line of the cronograma (prd-cronograma RF-W3): under "Revisar hoje", "Cronograma: hoje Crase · 38% visto"
// (or the next session on a free day), or "Montar cronograma" when there is none. GET /topics/{id}/schedule after the
// summary, out of the hub's closure (lazy): until it answers, the line says "Cronograma" alone, at its final height.
import { CalendarDays, ChevronRight } from 'lucide-vue-next'
import { studyDay } from '~/utils/greeting'
import { buildStudySchedule, dayMonth, nextSession, scheduleInputFromResource, todaySessions, weekdayShort, type StudyScheduleResource } from '~/utils/studySchedule'

const props = defineProps<{ topicId: string }>()

const api = useScheduleApi()
const res = ref<StudyScheduleResource | null>(null)
const failed = ref(false)

async function load() {
  failed.value = false
  try {
    res.value = await api.get(props.topicId)
  } catch (e) {
    failed.value = true
    reportApiError(e, { silent: true })
  }
}
watch(() => props.topicId, () => { res.value = null; void load() }, { immediate: true })

const today = studyDay()
const schedule = computed(() => (res.value?.configured ? buildStudySchedule(scheduleInputFromResource(res.value, today)) : null))

const title = computed(() => {
  if (!res.value) return 'Cronograma'
  if (!res.value.configured) return 'Montar cronograma'
  const s = schedule.value!
  const first = todaySessions(s, today)[0]
  const label = (x: { unit: boolean, subjectName: string, topicName: string }) => (x.unit ? x.subjectName : x.topicName)
  if (first) return `Cronograma: ${s.summary.calendar ? 'hoje ' : ''}${label(first)}`
  const next = nextSession(s, today)
  return next?.date ? `Cronograma: ${weekdayShort(next.date)} ${dayMonth(next.date)} ${label(next)}` : 'Cronograma'
})

const meta = computed(() => {
  if (!res.value) return failed.value ? 'O que estudar em cada dia' : '\u00a0'
  if (!res.value.configured) return res.value.exam ? 'O que estudar em cada dia até a prova' : 'A ordem dos assuntos, com mais tempo no que pesa mais'
  return `${schedule.value!.summary.seenPct}% visto`
})
</script>
