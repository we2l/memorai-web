<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-20 sm:p-6 lg:pb-6">
    <UiPageHeader title="Simulados" meta="Teste seu conhecimento com provas geradas por IA" :back="back">
      <template #actions>
        <UiButton variant="primary" :icon-left="Plus" @click="showConfig = true">Novo simulado</UiButton>
      </template>
    </UiPageHeader>

    <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
      <span class="sr-only">Carregando simulados...</span>
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </div>

    <!-- An error is never an empty state (RN-UX-03) -->
    <UiErrorState v-else-if="loadError" title="Não foi possível carregar seus simulados" @retry="load" />

    <UiSection v-else-if="!completed.length && !inProgress.length">
      <UiEmptyState
        mascot="thinking"
        title="Nenhum simulado ainda"
        description="Gere simulados a partir dos seus cadernos e descubra seus pontos fracos."
      >
        <template #action>
          <UiButton @click="showConfig = true">Criar primeiro simulado</UiButton>
        </template>
      </UiEmptyState>
    </UiSection>

    <template v-else>
      <UiSection v-if="stats && stats.evolution.length >= 3" title="Evolução" :level="2">
        <p class="-mt-2 mb-3 text-meta text-fg-muted">Média: {{ Math.round(stats.average_score ?? 0) }}%</p>
        <div class="flex h-20 items-end gap-1.5" role="img" :aria-label="`Notas dos últimos ${stats.evolution.length} simulados`">
          <div
            v-for="(point, i) in stats.evolution"
            :key="i"
            class="flex-1 rounded-t-md bg-progress-neutral"
            :style="{ height: `${Math.max(point.score_percent, 8)}%` }"
            :title="`${Math.round(point.score_percent)}%`"
          />
        </div>
      </UiSection>

      <UiSection v-if="inProgress.length" title="Em andamento">
        <ul class="-mx-3 -mb-2 divide-y divide-line">
          <UiListRow
            v-for="quiz in inProgress"
            :key="quiz.id"
            as="li"
            :title="quiz.title"
            :meta="`${quiz.topic?.name ?? 'Sem caderno'} · ${quiz.total_questions} questões`"
          >
            <template #trailing>
              <UiButton size="sm" :to="`/simulados/${quiz.id}`">Retomar</UiButton>
            </template>
          </UiListRow>
        </ul>
      </UiSection>

      <UiSection v-if="completed.length" :title="inProgress.length ? 'Concluídos' : undefined">
        <ul class="-mx-3 -my-2 divide-y divide-line">
          <li v-for="quiz in completed" :key="quiz.id">
            <UiListRow :to="`/simulados/${quiz.id}/resultado`" :title="quiz.title" :meta="completedMeta(quiz)">
              <template #trailing>
                <UiTag :tone="scoreTone(quiz.score_percent)">{{ Math.round(quiz.score_percent ?? 0) }}%</UiTag>
                <ChevronRight class="size-4" aria-hidden="true" />
              </template>
            </UiListRow>
          </li>
        </ul>
      </UiSection>
    </template>

    <QuizConfigSheet v-model="showConfig" :topic-id="scopeTopicId" @created="onQuizCreated" />
  </div>
</template>

<script setup lang="ts">
import { Plus, ChevronRight } from 'lucide-vue-next'
import type { Quiz } from '~/types'
import { cadernoPath } from '~/utils/scope'

definePageMeta({ layout: 'default' })

const route = useRoute()
const quizStore = useQuizStore()
const topicStore = useTopicStore()

// /simulados?topic_id= (from the caderno): the sheet opens already with that scope (RF-F1)
const scopeTopicId = computed(() => (typeof route.query.topic_id === 'string' && route.query.topic_id) || null)
const showConfig = ref(!!scopeTopicId.value)
watch(scopeTopicId, (id) => { if (id) showConfig.value = true })

const scopeName = computed(() => (scopeTopicId.value ? topicStore.findById(scopeTopicId.value)?.name : null) ?? null)
const back = computed(() => (scopeTopicId.value ? { to: cadernoPath(scopeTopicId.value), label: scopeName.value ?? 'Caderno' } : undefined))

const loading = ref(true)
const loadError = ref(false)
const stats = computed(() => quizStore.stats)
const inProgress = computed(() => quizStore.quizzes.filter(q => q.status === 'in_progress'))
const completed = computed(() => quizStore.quizzes.filter(q => q.status === 'completed'))

async function load() {
  loading.value = true
  loadError.value = false
  const [list, statsRes] = await Promise.allSettled([quizStore.fetchQuizzes(), quizStore.fetchStats()])
  if (list.status === 'rejected') {
    loadError.value = true
    reportApiError(list.reason, { silent: true })
  }
  // The chart is decorative: without stats the list still shows
  if (statsRes.status === 'rejected') reportApiError(statsRes.reason, { silent: true })
  loading.value = false
}

onMounted(() => {
  void load()
  if (!topicStore.tree.length) void topicStore.fetchTree()
})

function onQuizCreated(quiz: Quiz) {
  showConfig.value = false
  navigateTo(`/simulados/${quiz.id}`)
}

function completedMeta(quiz: Quiz) {
  const parts = [quiz.topic?.name, `${quiz.correct_count}/${quiz.total_questions} certas`]
  if (quiz.time_spent_seconds) parts.push(formatTime(quiz.time_spent_seconds))
  return parts.filter(Boolean).join(' · ')
}

function scoreTone(score: number | null) {
  const s = score ?? 0
  if (s >= 70) return 'success'
  if (s >= 50) return 'warning'
  return 'danger'
}
</script>
