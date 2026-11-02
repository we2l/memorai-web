<template>
  <div class="mx-auto flex max-w-page flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <UiPageHeader title="Praticar" meta="Três jeitos de treinar o mesmo conteúdo. Escolha o que cabe no seu momento." />

    <UiSelect
      v-model="scope"
      :options="scopeOptions"
      label="Praticando"
      class="max-w-sm"
      data-testid="practice-scope"
    />

    <UiErrorState v-if="loadError" title="Não foi possível carregar a prática" @retry="load" />

    <section v-else class="grid gap-4 lg:grid-cols-3" aria-label="Modos de prática">
      <!-- Revisar -->
      <UiSection as="article" class="flex flex-col gap-4" aria-labelledby="mode-review">
        <header class="flex items-center gap-3">
          <UiPracticeIcon mode="review" size="lg" />
          <div>
            <h2 id="mode-review" class="text-section text-fg-strong">Revisar</h2>
            <p class="text-meta text-fg-muted">cards com repetição espaçada</p>
          </div>
        </header>
        <UiSkeleton v-if="loading" variant="block" />
        <UiStat v-else :value="reviewCount" :label="reviewCount === 1 ? 'card para hoje' : 'cards para hoje'" :hint="reviewHint" />
        <UiButton
          variant="primary"
          block
          :to="reviewCount > 0 ? withScope('/revisar') : undefined"
          :loading="loading"
          :disabled="!loading && reviewCount === 0"
          @click="started('review', 'main')"
        >
          {{ reviewCount > 0 || loading ? 'Revisar agora' : 'Nada para revisar hoje' }}
        </UiButton>
        <ul class="-mx-3 divide-y divide-line border-t border-line">
          <li><UiListRow title="5 minutos" meta="Os mais urgentes, para uma pausa curta" :to="withScope('/revisar', { mode: 'blitz' })" @click="started('review', 'blitz')" /></li>
          <li><UiListRow title="Só o que errei" meta="Os seus erros recentes" :to="withScope('/revisar', { errors_only: '1' })" @click="started('review', 'errors_only')" /></li>
          <li>
            <UiListRow title="Recuperar atraso" :meta="backlogMeta" :to="withScope('/revisar', { backlog: '1' })" @click="started('review', 'backlog')" />
          </li>
          <li v-if="subjectOptions.length" class="px-3 py-3">
            <UiSelect
              :model-value="''"
              :options="subjectOptions"
              label="Um assunto"
              placeholder="Escolha o assunto"
              @update:model-value="reviewSubject"
            />
          </li>
        </ul>
      </UiSection>

      <!-- Questões -->
      <UiSection as="article" class="flex flex-col gap-4" aria-labelledby="mode-quiz">
        <header class="flex items-center gap-3">
          <UiPracticeIcon mode="quiz" size="lg" />
          <div>
            <h2 id="mode-quiz" class="text-section text-fg-strong">Questões</h2>
            <p class="text-meta text-fg-muted">baterias e simulados</p>
          </div>
        </header>
        <UiSkeleton v-if="loading" variant="block" />
        <UiStat
          v-else
          :value="quizStats?.average_score != null ? `${Math.round(quizStats.average_score)}%` : '—'"
          label="de acerto"
          :hint="quizStats?.total_completed ? `em ${quizStats.total_completed} simulado${quizStats.total_completed !== 1 ? 's' : ''}` : 'nenhum simulado ainda'"
        />
        <UiButton block icon-tone="quiz" :icon-left="CircleHelp" :to="withScope('/simulados', { action: 'new' }, 'topic_id')" @click="started('quiz', 'new_quiz')">
          Novo simulado
        </UiButton>
        <ul class="-mx-3 divide-y divide-line border-t border-line">
          <li v-if="inProgress">
            <UiListRow title="Continuar simulado" :meta="inProgress.title" :to="`/simulados/${inProgress.id}`" @click="started('quiz', 'continue')" />
          </li>
          <li>
            <UiListRow title="Histórico e evolução" :meta="completedMeta" :to="withScope('/simulados', {}, 'topic_id')" @click="started('quiz', 'history')" />
          </li>
        </ul>
      </UiSection>

      <!-- Ouvir -->
      <UiSection as="article" class="flex flex-col gap-4" aria-labelledby="mode-listen">
        <header class="flex items-center gap-3">
          <UiPracticeIcon mode="listen" size="lg" />
          <div>
            <h2 id="mode-listen" class="text-section text-fg-strong">Ouvir</h2>
            <p class="text-meta text-fg-muted">podcast dos pontos fracos</p>
          </div>
        </header>
        <UiSkeleton v-if="loading" variant="block" />
        <UiStat
          v-else
          :value="latest?.duration_seconds ? `${Math.max(1, Math.round(latest.duration_seconds / 60))} min` : '—'"
          :label="latest ? 'episódio mais recente' : 'nenhum episódio pronto'"
          :hint="latest?.title"
        />
        <UiButton v-if="latest" block icon-tone="listen" :icon-left="Headphones" @click="listen(latest)">
          {{ player.currentPodcast?.id === latest.id ? (player.isPlaying ? 'Tocando agora' : 'Continuar') : 'Ouvir agora' }}
        </UiButton>
        <UiButton v-else block icon-tone="listen" :icon-left="Headphones" :to="withScope('/podcasts', { action: 'generate' }, 'topic_id')" @click="started('listen', 'generate')">
          Gerar um episódio
        </UiButton>
        <ul class="-mx-3 divide-y divide-line border-t border-line">
          <li v-if="player.currentPodcast && player.currentPodcast.id !== latest?.id">
            <UiListRow title="Continuar" :meta="player.currentPodcast.title" as="button" @click="resume" />
          </li>
          <li v-if="latest">
            <UiListRow title="Gerar de um assunto" meta="Do caderno, de um assunto ou dos seus erros" :to="withScope('/podcasts', { action: 'generate' }, 'topic_id')" @click="started('listen', 'generate')" />
          </li>
          <li>
            <UiListRow title="Todos os episódios" :meta="episodesMeta" to="/podcasts" @click="started('listen', 'library')" />
          </li>
        </ul>
      </UiSection>
    </section>

    <UiSection v-if="recent.length" title="Últimos simulados" flush class="px-5 pt-5 sm:px-6">
      <ul class="-mx-3 divide-y divide-line pb-2">
        <li v-for="quiz in recent" :key="quiz.id">
          <UiListRow :to="`/simulados/${quiz.id}/resultado`" :title="quiz.title" :meta="`${quiz.correct_count ?? 0} de ${quiz.total_questions}${quiz.topic ? ` · ${quiz.topic.name}` : ''}`">
            <template #leading><UiPracticeIcon mode="quiz" size="sm" /></template>
            <template #trailing>
              <span class="font-semibold tabular-nums text-fg-strong">{{ Math.round(quiz.score_percent ?? 0) }}%</span>
            </template>
          </UiListRow>
        </li>
      </ul>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// Praticar (prd-navegacao-v3 RF-7, canvas PraticarV4): the 3 practice modes of the same scope, side by side,
// over the data and routes that already exist. Revisar: the session size (`session_count` of the scope,
// /stats due_today for all) and the /revisar modes. Questões: /quizzes/stats of the scope, the new quiz sheet
// and the history in /simulados. Ouvir: the latest ready episode (plays in the mini-player), generate and the
// library in /podcasts. The scope is the caderno of ?topic_id= (from a caderno) or all of them.
import { CircleHelp, Headphones } from 'lucide-vue-next'
import type { BacklogStats, Podcast, Quiz, QuizStats, Stats, TopicProgress } from '~/types'
import type { PracticeEntry, PracticeMode } from '~/types/analytics'

useHead({ title: 'Praticar · Baigi' })

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const topicStore = useTopicStore()
const quizStore = useQuizStore()
const podcastStore = usePodcastStore()
const player = usePlayerStore()

/** '' = all cadernos; else a caderno, matéria or assunto (its subtree) */
const scope = ref((typeof route.query.topic_id === 'string' && route.query.topic_id) || '')
watch(scope, (id) => {
  router.replace({ query: { ...route.query, topic_id: id || undefined } })
  void load()
})

const scopeOptions = computed(() => {
  const out = [{ value: '', label: 'Todos os cadernos' }]
  const walk = (topics: typeof topicStore.tree, depth: number) => {
    for (const t of topics) {
      out.push({ value: t.id, label: `${'— '.repeat(depth)}${t.name}` })
      if (t.children?.length) walk(t.children, depth + 1)
    }
  }
  walk(topicStore.tree, 0)
  return out
})

/** "Um assunto": the matérias/assuntos below the scope (all of them when the scope is all cadernos). */
const subjectOptions = computed(() => {
  const base = scope.value ? (topicStore.findById(scope.value)?.children ?? []) : topicStore.tree.flatMap(t => t.children ?? [])
  return flattenTopics(base).map(t => ({ value: t.id, label: t.name }))
})

const scopeIds = computed(() => {
  if (!scope.value) return null
  const t = topicStore.findById(scope.value)
  return new Set(t ? flattenTopics([t]).map(x => x.id) : [scope.value])
})

const loading = ref(true)
const loadError = ref(false)
const stats = ref<Stats | null>(null)
const progress = ref<TopicProgress[]>([])
const backlog = ref<BacklogStats | null>(null)
const quizStats = ref<QuizStats | null>(null)

let request = 0
async function load() {
  const id = ++request
  loading.value = true
  loadError.value = false
  const topicId = scope.value || undefined
  const [statsRes, progressRes, backlogRes, quizStatsRes, quizzesRes] = await Promise.allSettled([
    $api<{ data: Stats }>('/stats'),
    $api<{ data: TopicProgress[] }>('/topics/progress'),
    $api<{ data: BacklogStats }>('/review/backlog-stats'),
    quizStore.fetchStats(topicId),
    quizStore.fetchQuizzes(topicId),
  ])
  if (id !== request) return
  // The number of Revisar is the one block that must load; the others degrade to "—"
  if (statsRes.status === 'rejected' || progressRes.status === 'rejected') {
    loadError.value = true
    reportApiError(statsRes.status === 'rejected' ? statsRes.reason : (progressRes as PromiseRejectedResult).reason, { silent: true })
  } else {
    stats.value = statsRes.value.data
    progress.value = progressRes.value.data
  }
  backlog.value = backlogRes.status === 'fulfilled' ? backlogRes.value.data : null
  quizStats.value = quizStatsRes.status === 'fulfilled' ? quizStatsRes.value : null
  for (const r of [backlogRes, quizStatsRes, quizzesRes]) if (r.status === 'rejected') reportApiError(r.reason, { silent: true })
  loading.value = false
}

// "Revisar hoje · N" is the session it opens, the same number as the caderno and the Hoje (F1)
const reviewCount = computed(() => {
  if (!scope.value) return stats.value?.due_today ?? 0
  return progress.value.find(p => p.id === scope.value)?.session_count ?? 0
})
const reviewHint = computed(() => (reviewCount.value ? undefined : 'tudo em dia'))
const backlogMeta = computed(() => {
  const n = backlog.value?.overdue_count ?? 0
  return !scope.value && n ? `${n} atrasados, espalhados nos próximos dias` : 'Os atrasados, espalhados nos próximos dias'
})

const inProgress = computed<Quiz | undefined>(() => quizStore.quizzes.find(q => q.status === 'in_progress'))
const completed = computed(() => quizStore.quizzes.filter(q => q.status === 'completed'))
const recent = computed(() => completed.value.slice(0, 3))
const completedMeta = computed(() => {
  const n = completed.value.length
  return n ? `${n} simulado${n !== 1 ? 's' : ''} feito${n !== 1 ? 's' : ''}` : 'Seus resultados ficam aqui'
})

const scopedPodcasts = computed(() => {
  const ids = scopeIds.value
  return podcastStore.podcasts.filter(p => !ids || (p.topic_id && ids.has(p.topic_id)))
})
const latest = computed<Podcast | undefined>(() => scopedPodcasts.value.find(p => p.status === 'ready' && p.audio_url))
const episodesMeta = computed(() => {
  const n = podcastStore.podcasts.filter(p => p.status === 'ready').length
  return n ? `${n} episódio${n !== 1 ? 's' : ''}` : 'A sua biblioteca de áudio'
})

/** A route of the scope: /revisar?topic_id=, /simulados?topic_id=… (the key the page reads). */
function withScope(path: string, extra: Record<string, string> = {}, key = 'topic_id') {
  const params = new URLSearchParams(extra)
  if (scope.value) params.set(key, scope.value)
  const q = params.toString()
  return q ? `${path}?${q}` : path
}

function started(mode: PracticeMode, entry: PracticeEntry) {
  useAnalytics().track('practice_mode_started', { mode, entry, scope: scope.value ? 'topic' : 'all' })
}

function reviewSubject(id: string) {
  if (!id) return
  started('review', 'one_subject')
  void navigateTo(reviewPath(id))
}

function listen(podcast: Podcast) {
  started('listen', 'main')
  if (player.currentPodcast?.id === podcast.id) {
    if (!player.isPlaying) player.resume()
    return
  }
  player.play(podcast)
}

function resume() {
  started('listen', 'continue')
  if (!player.isPlaying) player.resume()
}

onMounted(() => {
  void load()
  if (!topicStore.tree.length) void topicStore.fetchTree()
  podcastStore.fetchPodcasts().catch((e: unknown) => reportApiError(e, { silent: true }))
})
</script>
