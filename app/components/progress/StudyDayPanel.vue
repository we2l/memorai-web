<template>
  <UiDialog :model-value="!!date" :title="title" :placement="desktop ? 'center' : 'bottom'" size="md" @update:model-value="(v: boolean) => { if (!v) emit('close') }">
    <div class="flex flex-col gap-5" data-testid="study-day">
      <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
        <span class="sr-only">Carregando o dia…</span>
        <UiSkeleton variant="row" />
        <UiSkeleton variant="row" />
      </div>
      <UiErrorState v-else-if="error" title="Não foi possível carregar o dia" @retry="load" />
      <template v-else-if="day">
        <p class="text-body text-fg-strong" data-testid="study-day-summary">
          <template v-if="day.reviews">
            <span class="font-semibold">{{ plural(day.reviews, 'revisão', 'revisões') }}</span>
            <template v-if="day.remembered_percent !== null"> · lembrou {{ day.remembered_percent }}%</template>
          </template>
          <template v-else>Nenhuma revisão neste dia.</template>
        </p>

        <section v-if="day.by_topic.length" aria-label="Assuntos revisados">
          <h3 class="mb-1 text-meta font-semibold text-fg-muted">Assuntos</h3>
          <ul class="-mx-3 divide-y divide-line">
            <li v-for="t in day.by_topic" :key="t.topic_id">
              <UiListRow :to="cadernoPath(t.topic_id)" :title="t.name" :meta="t.root_name && t.root_name !== t.name ? t.root_name : undefined" @click="emit('close')">
                <template #trailing><span class="tabular-nums text-fg-strong">{{ t.reviews }}</span></template>
              </UiListRow>
            </li>
          </ul>
        </section>

        <section v-if="day.quizzes.length" aria-label="Questões do dia">
          <h3 class="mb-1 text-meta font-semibold text-fg-muted">Questões</h3>
          <ul class="-mx-3 divide-y divide-line">
            <li v-for="q in day.quizzes" :key="q.id">
              <UiListRow :to="`/simulados/${q.id}/resultado`" :title="q.title" @click="emit('close')">
                <template #trailing><span v-if="q.score_percent !== null" class="font-semibold tabular-nums text-fg-strong">{{ Math.round(q.score_percent) }}%</span></template>
              </UiListRow>
            </li>
          </ul>
        </section>

        <section v-if="day.podcasts_completed.length" aria-label="Episódios ouvidos">
          <h3 class="mb-1 text-meta font-semibold text-fg-muted">Episódios ouvidos até o fim</h3>
          <ul class="flex flex-col gap-1 text-body text-fg">
            <li v-for="p in day.podcasts_completed" :key="p.id">{{ p.title }}</li>
          </ul>
        </section>
      </template>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
// What was studied on a day of the history (prd-4f-progresso-v3 RF-F6): GET /stats/day, reviews and "lembrou",
// the topics (links to the hub), the quizzes and the episodes heard to the end. A sheet on the phone, a dialog
// on the desktop.
import type { StudyDay } from '~/types'
import { cadernoPath } from '~/utils/scope'

const props = defineProps<{ date: string | null }>()
const emit = defineEmits<{ close: [] }>()

const { $api } = useNuxtApp()
const desktop = useMediaQuery('(min-width: 768px)')
const day = shallowRef<StudyDay | null>(null)
const loading = ref(false)
const error = ref(false)

const title = computed(() => (props.date
  ? new Date(`${props.date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  : ''))

async function load() {
  if (!props.date) return
  const date = props.date
  loading.value = true
  error.value = false
  try {
    const res = await $api<{ data: StudyDay }>('/stats/day', { params: { date } })
    if (props.date === date) day.value = res.data
  } catch (e) {
    error.value = true
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}

watch(() => props.date, (d) => {
  day.value = null
  if (d) {
    useAnalytics().track('heatmap_day_open', {})
    void load()
  }
}, { immediate: true })
</script>
