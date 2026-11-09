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
        <ul class="-mx-3 divide-y divide-hairline border-t border-hairline">
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

      <!-- Questões (prd-4e-praticar-v3 RF-F1): the accuracy of the scope and the shortest way to the weakest assunto -->
      <UiSection as="article" class="flex flex-col gap-4" aria-labelledby="mode-quiz" data-testid="practice-quiz">
        <header class="flex items-center gap-3">
          <UiPracticeIcon mode="quiz" size="lg" />
          <div>
            <h2 id="mode-quiz" class="text-section text-fg-strong">Questões</h2>
            <p class="text-meta text-fg-muted">baterias e simulados</p>
          </div>
        </header>
        <UiSkeleton v-if="loading" variant="block" />
        <UiStat
          v-else-if="scopeAccuracy"
          :value="`${scopeAccuracy.accuracy}%`"
          :label="`de acerto em ${plural(scopeAccuracy.answered, 'questão', 'questões')}`"
        />
        <UiStat v-else value="—" label="Faça 10 questões para ver seu acerto" />
        <UiButton block icon-tone="quiz" :icon-left="CircleHelp" data-testid="practice-weak" @click="openQuiz({ topicId: weak?.topic_id ?? (scope || null), quantity: 20 }, 'new_quiz')">
          {{ weak ? '20 questões do pior assunto' : '20 questões' }}
        </UiButton>
        <p v-if="weak" class="-mt-2 text-meta text-fg-muted">{{ weak.name }}<template v-if="weak.questions.accuracy !== null"> · {{ weak.questions.accuracy }}% de acerto</template></p>
        <ul class="-mx-3 divide-y divide-hairline border-t border-hairline">
          <li v-if="inProgress">
            <UiListRow title="Continuar" :meta="inProgress.title" :to="`/simulados/${inProgress.id}`" @click="started('quiz', 'continue')" />
          </li>
          <li><UiListRow title="Escolher matéria" meta="10 a 50 questões" as="button" @click="openQuiz({ topicId: scope || null }, 'one_subject')" /></li>
          <li v-if="examRoot">
            <UiListRow :title="`Simulado do ${examRoot.name}`" :meta="isFree ? `No ${proName} · 30 a 120 questões` : `60 questões · ${timerLabel(suggestedTimer(60))}`" as="button" @click="openQuiz({ topicId: examRoot.id, tab: 'exam' }, 'new_quiz')" />
          </li>
          <li v-if="lastWithErrors">
            <UiListRow title="Refazer as que errei" :meta="`${plural(lastWrong, 'questão', 'questões')} · sem gastar geração`" as="button" :disabled="retrying" data-testid="practice-retry" @click="retryLast">
              <template #trailing><span class="font-semibold tabular-nums text-fg-strong">{{ lastWrong }}</span></template>
            </UiListRow>
          </li>
          <li><UiListRow title="Questões e simulados" :meta="completedMeta" :to="withScope('/simulados', {}, 'caderno', true)" @click="started('quiz', 'history')" /></li>
        </ul>
      </UiSection>

      <!-- Ouvir (RF-F6): the episode of today (or the latest not finished), continue and the library -->
      <UiSection as="article" class="flex flex-col gap-4" aria-labelledby="mode-listen" data-testid="practice-listen">
        <header class="flex items-center gap-3">
          <UiPracticeIcon mode="listen" size="lg" />
          <div>
            <h2 id="mode-listen" class="text-section text-fg-strong">Ouvir</h2>
            <p class="text-meta text-fg-muted">podcast dos pontos fracos</p>
          </div>
        </header>
        <UiSkeleton v-if="loading" variant="block" />
        <!-- Not on the paid plan, nothing to listen to: the demo of the episode instead of "Gerar" (prd-planos-lancamento RF-F3) -->
        <template v-else-if="podcastPaywall && !latest">
          <PodcastDemo compact />
          <UiButton block icon-tone="listen" :icon-left="Headphones" to="/planos" data-testid="practice-listen-plans" @click="toPlans">
            Conhecer o {{ proName }}
          </UiButton>
        </template>
        <UiStat
          v-else
          :value="latest?.duration_seconds ? `${Math.max(1, Math.round(latest.duration_seconds / 60))} min` : '—'"
          :label="latest ? (latest.origin === 'daily' ? 'episódio do dia pronto' : 'episódio para ouvir') : 'nenhum episódio pronto'"
          :hint="latest?.title"
        />
        <UiButton v-if="latest" block icon-tone="listen" :icon-left="Headphones" @click="listen(latest)">
          {{ player.currentPodcast?.id === latest.id ? (player.isPlaying ? 'Tocando agora' : 'Continuar') : 'Ouvir agora' }}
        </UiButton>
        <UiButton v-else-if="!podcastPaywall" block icon-tone="listen" :icon-left="Headphones" :to="withScope('/podcasts', { action: 'generate' }, 'topic_id')" @click="started('listen', 'generate')">
          Gerar um episódio
        </UiButton>
        <ul class="-mx-3 divide-y divide-hairline border-t border-hairline">
          <li v-if="continuing">
            <UiListRow :title="`Continuar · ${continuing.title}`" :meta="`ouvido ${Math.round((continuing.progress ?? 0) * 100)}%`" as="button" @click="listen(continuing, 'continue')" />
          </li>
          <li v-if="latest && !podcastPaywall">
            <UiListRow title="Gerar de um assunto" :meta="podcastQuotaText ?? 'Do caderno, de uma matéria ou de um assunto'" :to="withScope('/podcasts', { action: 'generate' }, 'topic_id')" @click="started('listen', 'generate')" />
          </li>
          <li>
            <UiListRow title="Todos os episódios" :meta="episodesMeta" :to="withScope('/podcasts', {}, 'topic_id')" @click="started('listen', 'library')" />
          </li>
        </ul>
      </UiSection>
    </section>

    <UiSection v-if="recent.length" title="Últimas questões" flush class="px-5 pt-5 sm:px-6" data-testid="practice-history">
      <ul class="-mx-3 divide-y divide-hairline pb-2">
        <li v-for="quiz in recent" :key="quiz.id">
          <UiListRow :to="`/simulados/${quiz.id}/resultado`" :title="historyTitle(quiz)" :meta="historyMeta(quiz)">
            <template #leading><UiPracticeIcon mode="quiz" size="sm" /></template>
            <template #trailing>
              <span class="font-semibold tabular-nums text-fg-strong">{{ Math.round(quiz.score_percent ?? 0) }}%</span>
            </template>
          </UiListRow>
        </li>
      </ul>
    </UiSection>

    <LazyQuizConfigSheet v-if="configLoaded" v-model="config.open" :topic-id="config.topicId" :tab="config.tab" :quantity="config.quantity" @created="onQuizCreated" />
  </div>
</template>

<script setup lang="ts">
// Praticar (prd-navegacao-v3 RF-7, prd-4e-praticar-v3 RF-F1, canvas PraticarV4): the 3 practice modes of the
// same scope, side by side. Revisar: the session size (`session_count` of the scope, /stats due_today for all)
// and the /revisar modes. Questões: the accuracy of the scope (/topics/performance, ≥ 10 answered), "20
// questões do pior assunto", a matéria, the simulado do caderno and "Refazer as que errei" (no AI, no quota).
// Ouvir: the episode of today or the latest one not finished, continue and generate. The scope is the caderno
// of ?topic_id= (from a caderno) or all of them.
import { CircleHelp, Headphones } from 'lucide-vue-next'
import type { BacklogStats, Podcast, Quiz, Stats, TopicPerformance, TopicProgress } from '~/types'
import type { PracticeEntry, PracticeMode } from '~/types/analytics'
import { suggestedTimer, timerLabel } from '~/utils/quizDistribution'

useHead({ title: 'Praticar · Baigi' })

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const topicStore = useTopicStore()
const quizStore = useQuizStore()
const podcastStore = usePodcastStore()
const player = usePlayerStore()
const auth = useAuthStore()
// The trial has the simulado do caderno (RN-03); the podcast only the paid plan (RF-F3)
const isFree = computed(() => !!auth.user && !auth.hasProAccess)
const podcastPaywall = computed(() => !!auth.user && auth.user.plan !== 'pro')
const proName = useProName()

/** '' = all cadernos; else a caderno, matéria or assunto (its subtree) */
const scope = ref((typeof route.query.topic_id === 'string' && route.query.topic_id) || '')
watch(scope, (id) => {
  router.replace({ query: { ...route.query, topic_id: id || undefined } })
  void load()
})

const scopeOptions = computed(() => [{ value: '', label: 'Todos os cadernos' }, ...topicTreeOptions(topicStore.tree)])

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
const inScope = (topicId: string | null | undefined) => !scopeIds.value || (!!topicId && scopeIds.value.has(topicId))

const loading = ref(true)
const loadError = ref(false)
const stats = ref<Stats | null>(null)
const progress = ref<TopicProgress[]>([])
const backlog = ref<BacklogStats | null>(null)
const performance = ref<TopicPerformance[]>([])

let request = 0
async function load() {
  const id = ++request
  loading.value = true
  loadError.value = false
  const [statsRes, progressRes, backlogRes, perfRes, quizzesRes, podcastsRes] = await Promise.allSettled([
    $api<{ data: Stats }>('/stats'),
    $api<{ data: TopicProgress[] }>('/topics/progress'),
    $api<{ data: BacklogStats }>('/review/backlog-stats'),
    $api<{ data: TopicPerformance[] }>('/topics/performance'),
    quizStore.fetchQuizzes(),
    podcastStore.setScope(scope.value || null),
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
  performance.value = perfRes.status === 'fulfilled' ? perfRes.value.data : []
  for (const r of [backlogRes, perfRes, quizzesRes, podcastsRes]) if (r.status === 'rejected') reportApiError(r.reason, { silent: true })
  loading.value = false
}

// "Revisar hoje · N" is the session it opens, the same number as the caderno and the Hoje (F1)
const reviewCount = computed(() => {
  if (!scope.value) return stats.value?.due_today ?? 0
  return progress.value.find(p => p.id === scope.value)?.session_count ?? 0
})
const reviewHint = computed(() => (reviewCount.value ? undefined : 'tudo em dia'))
const backlogMeta = computed(() => {
  // "Só o atraso" (prd-revisao-v5-fase-b RF-B3): the overdue cards, the closest to being forgotten first
  const n = backlog.value?.backlog?.overdue ?? backlog.value?.overdue_count ?? 0
  return !scope.value && n ? `${n} atrasados, os mais perto de esquecer primeiro` : 'Os atrasados, os mais perto de esquecer primeiro'
})

// Questões: the accuracy of the scope (all cadernos = the sum of the roots), only with ≥ 10 answered
const scopeAccuracy = computed(() => {
  const rows = scope.value ? performance.value.filter(r => r.topic_id === scope.value) : performance.value.filter(r => r.depth === 0)
  const answered = rows.reduce((a, r) => a + r.questions.answered, 0)
  const correct = rows.reduce((a, r) => a + (r.questions.correct ?? 0), 0)
  return answered >= 10 ? { answered, accuracy: Math.round((correct * 100) / answered) } : null
})
/**
 * The weakest assunto of the scope, by the rule of the API (PerformanceService::markWeak): the lowest
 * accuracy below 60% among those with ≥ 10 answered; without any, the lowest mastery below 40% with ≥ 20
 * cards. On a tie the deepest (an assunto over its matéria).
 */
const weak = computed<TopicPerformance | null>(() => {
  // An assunto or matéria below the scope (all cadernos: never a caderno itself)
  const rows = performance.value.filter(r => inScope(r.topic_id) && r.topic_id !== scope.value && (scope.value || r.depth > 0))
  const withAccuracy = rows.filter(r => r.questions.accuracy !== null)
  const pick = (list: TopicPerformance[], value: (r: TopicPerformance) => number) =>
    [...list].sort((a, b) => value(a) - value(b) || b.depth - a.depth)[0] ?? null
  if (withAccuracy.length) return pick(withAccuracy.filter(r => r.questions.accuracy! < 60), r => r.questions.accuracy!)
  return pick(rows.filter(r => r.mastery !== null && r.cards >= 20 && r.mastery < 40), r => r.mastery!)
})
/** The caderno of the simulado: the root of the scope, or the one with the most cards */
const examRoot = computed(() => {
  if (scope.value) {
    const t = topicStore.findById(scope.value)
    if (!t) return null
    return t.parent_id ? (topicStore.findById(t.parent_id)?.parent_id ? null : t) : t
  }
  const roots = performance.value.filter(r => r.depth === 0).sort((a, b) => b.cards - a.cards)
  const top = roots[0]
  return top ? { id: top.topic_id, name: top.name } : null
})

const scopedQuizzes = computed(() => quizStore.quizzes.filter(q => inScope(q.topic?.id)))
const inProgress = computed<Quiz | undefined>(() => scopedQuizzes.value.find(q => q.status === 'in_progress'))
const completed = computed(() => scopedQuizzes.value.filter(q => q.status === 'completed'))
const recent = computed(() => completed.value.slice(0, 3))
const lastWithErrors = computed(() => completed.value.find(q => q.total_questions - (q.correct_count ?? 0) > 0) ?? null)
const lastWrong = computed(() => (lastWithErrors.value ? lastWithErrors.value.total_questions - (lastWithErrors.value.correct_count ?? 0) : 0))
const completedMeta = computed(() => {
  const n = completed.value.length
  return n ? `${n} ${n === 1 ? 'bateria feita' : 'baterias feitas'}` : 'Seus resultados ficam aqui'
})

function historyTitle(quiz: Quiz) {
  return [quiz.kind === 'exam' ? 'Simulado' : 'Questões', quiz.topic?.name, quiz.completed_at ? relativeDate(quiz.completed_at) : null].filter(Boolean).join(' · ')
}
function historyMeta(quiz: Quiz) {
  const wrong = quiz.total_questions - (quiz.correct_count ?? 0)
  return [`${quiz.correct_count ?? 0} de ${quiz.total_questions}`, wrong ? (quiz.cards_created_at ? `${plural(wrong, 'erro', 'erros')} · cards criados` : plural(wrong, 'erro', 'erros')) : null].filter(Boolean).join(' · ')
}

// The sheet of questions opens here, already filled (RF-F1)
const config = reactive({ open: false, topicId: null as string | null, tab: 'battery' as 'battery' | 'exam', quantity: undefined as number | undefined })
const configLoaded = useLoadedOnce(() => config.open)
function openQuiz(opts: { topicId: string | null; tab?: 'battery' | 'exam'; quantity?: number }, entry: PracticeEntry) {
  started('quiz', entry)
  config.topicId = opts.topicId
  config.tab = opts.tab ?? 'battery'
  config.quantity = opts.quantity
  config.open = true
}
function onQuizCreated(quiz: Quiz) {
  config.open = false
  void navigateTo(`/simulados/${quiz.id}`)
}

const { run: runRetry, pending: retrying } = useApiAction()
async function retryLast() {
  const source = lastWithErrors.value
  if (!source) return
  started('quiz', 'continue')
  const retry = await runRetry(() => quizStore.retryErrors(source.id), { error: 'Não foi possível montar as questões de novo.' })
  if (!retry) return
  useAnalytics().track('quiz_retry_errors', { errors: lastWrong.value })
  await navigateTo(`/simulados/${retry.id}`)
}

// Ouvir: GET /podcasts?topic_id= of the scope (server side, the subtree)
const isDone = (p: Podcast) => !!p.completed_at || (p.progress ?? 0) >= 0.95
const ready = computed(() => podcastStore.podcasts.filter(p => p.status === 'ready' && p.audio_url && !isDone(p)))
const latest = computed<Podcast | undefined>(() => ready.value.find(p => p.origin === 'daily' && Date.now() - new Date(p.created_at).getTime() < 86_400_000) ?? ready.value.find(p => !(p.progress ?? 0)) ?? ready.value[0])
const continuing = computed(() => ready.value.find(p => (p.progress ?? 0) > 0 && p.id !== latest.value?.id) ?? null)
const episodesMeta = computed(() => {
  const n = podcastStore.podcasts.filter(p => p.status === 'ready').length
  return n ? `${n} episódio${n !== 1 ? 's' : ''}` : 'A sua biblioteca de áudio'
})
const usage = useFeatureUsage()
const podcastQuotaText = computed(() => {
  const q = usage.usage.value?.features?.podcast
  return q && q.limit !== null ? `${q.used} de ${q.limit} este mês` : null
})

/** A route of the scope: /revisar?topic_id=, /podcasts?topic_id=… (the key the page reads). */
function withScope(path: string, extra: Record<string, string> = {}, key = 'topic_id', rootOnly = false) {
  const params = new URLSearchParams(extra)
  const value = rootOnly ? (scope.value && !topicStore.findById(scope.value)?.parent_id ? scope.value : '') : scope.value
  if (value) params.set(key, value)
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

function listen(podcast: Podcast, entry: PracticeEntry = 'main') {
  started('listen', entry)
  if (player.currentPodcast?.id === podcast.id) {
    if (!player.isPlaying) player.resume()
    return
  }
  player.play(podcast)
}

function toPlans() {
  useAnalytics().track('upgrade_clicked', { feature: 'podcast', billing: null, source: 'podcast_demo' })
}

onMounted(() => {
  void load()
  void usage.fetchUsage()
  if (!topicStore.tree.length) void topicStore.fetchTree()
})
</script>
