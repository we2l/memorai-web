<template>
  <div class="mx-auto flex max-w-page flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <div class="flex flex-col gap-2">
      <nav aria-label="Caminho" class="flex items-center gap-1 text-meta text-fg-muted">
        <UiLink to="/praticar" variant="muted">Praticar</UiLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Questões</span>
      </nav>
      <UiPageHeader title="Questões e simulados" meta="Baterias de um assunto e simulados do caderno, com o acerto de cada vez.">
        <template #actions>
          <UiButton variant="primary" :icon-left="Plus" data-testid="quiz-new" @click="openConfig()">Novas questões</UiButton>
        </template>
      </UiPageHeader>
    </div>

    <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
      <span class="sr-only">Carregando suas questões…</span>
      <UiSkeleton v-for="i in 4" :key="i" variant="row" />
    </div>

    <!-- An error is never an empty state (03 Q14) -->
    <UiErrorState v-else-if="loadError" title="Não foi possível carregar suas questões" @retry="load" />

    <UiSection v-else-if="!quizStore.quizzes.length" data-testid="quizzes-empty">
      <div class="flex flex-col items-center gap-5 px-2 py-6 text-center">
        <!-- Preview of a result (static markup: nothing to download, nothing in the precache) -->
        <div class="w-full max-w-sm rounded-card border border-line bg-raised p-4 text-left shadow-card" aria-hidden="true">
          <p class="text-label text-fg-muted">10 questões em 12 min</p>
          <p class="font-semibold text-fg-strong">Você acertou 7 de 10</p>
          <div class="mt-3 flex flex-col gap-2 text-meta">
            <div class="flex items-center justify-between gap-3"><span class="text-fg">Direitos fundamentais</span><span class="tabular-nums font-semibold text-fg-strong">4 de 5</span></div>
            <div class="flex items-center justify-between gap-3"><span class="text-fg">Controle de constitucionalidade</span><span class="tabular-nums font-semibold text-fg-strong">3 de 5</span></div>
          </div>
          <p class="mt-3 text-label text-fg-muted">3 erros viram cards no assunto certo</p>
        </div>
        <div>
          <h2 class="text-section text-fg-strong">Treine com questões do seu material</h2>
          <p class="mt-1 max-w-sm text-body text-fg-muted">Você vê o acerto por assunto, e os erros viram cards para revisar.</p>
        </div>
        <UiButton :icon-left="CircleHelp" icon-tone="quiz" @click="openConfig(10)">Fazer 10 questões</UiButton>
      </div>
    </UiSection>

    <template v-else>
      <UiSelect v-if="rootOptions.length > 2" v-model="filter" :options="rootOptions" label="Caderno" class="max-w-xs" data-testid="quiz-filter" />

      <UiSection v-if="inProgress.length" title="Em andamento">
        <ul class="-mx-3 -mb-2 divide-y divide-line">
          <li v-for="quiz in inProgress" :key="quiz.id">
            <UiListRow :to="`/simulados/${quiz.id}`" :title="rowTitle(quiz)" :meta="`${plural(quiz.total_questions, 'questão', 'questões')} · continuar de onde parou`">
              <template #leading><UiPracticeIcon mode="quiz" size="sm" /></template>
            </UiListRow>
          </li>
        </ul>
      </UiSection>

      <UiSection title="Histórico" data-testid="quiz-history">
        <p v-if="!completed.length" class="text-meta text-fg-muted">Nenhuma bateria terminada {{ filter ? 'neste caderno' : 'ainda' }}.</p>
        <ul v-else class="-mx-3 -mb-2 divide-y divide-line">
          <li v-for="quiz in completed" :key="quiz.id">
            <UiListRow :to="`/simulados/${quiz.id}/resultado`" :title="rowTitle(quiz)" :meta="rowMeta(quiz)">
              <template #leading><UiPracticeIcon mode="quiz" size="sm" /></template>
              <template #trailing>
                <span class="font-semibold tabular-nums text-fg-strong">{{ Math.round(quiz.score_percent ?? 0) }}%</span>
              </template>
            </UiListRow>
          </li>
        </ul>
        <UiButton v-if="hasMore" class="mt-3" :loading="loadingMore" @click="loadMore">Carregar mais</UiButton>
      </UiSection>
    </template>

    <LazyQuizConfigSheet v-if="configLoaded" v-model="showConfig" :topic-id="configTopic" :scope="configScope" :tab="configTab" :quantity="configQuantity" @created="onQuizCreated" />
  </div>
</template>

<script setup lang="ts">
// Questões e simulados (prd-4e-praticar-v3 RF-F5): the history ("Questões · Direito Constitucional · ontem",
// "13 de 20 · 7 erros", the accuracy), a filter by caderno and one primary, "Novas questões". ?topic_id=
// (caderno, Hoje, review), ?tab=exam, ?count= and ?scope=document:|note: open the sheet already filled.
import { CircleHelp, Plus } from 'lucide-vue-next'
import type { Quiz } from '~/types'
import { flattenTopics } from '~/utils/topics'

useHead({ title: 'Questões · Baigi' })

const route = useRoute()
const router = useRouter()
const quizStore = useQuizStore()
const topicStore = useTopicStore()
const { $api } = useNuxtApp()

const q = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '')
const configTopic = ref<string | null>(q('topic_id') || null)
const configScope = ref<string | null>(/^(document|note):/.test(q('scope')) ? q('scope') : null)
const configTab = ref<'battery' | 'exam'>(q('tab') === 'exam' ? 'exam' : 'battery')
const configQuantity = ref<number | undefined>(Number(q('count')) || undefined)
const showConfig = ref(!!configTopic.value || !!configScope.value || q('action') === 'new')
const configLoaded = useLoadedOnce(() => showConfig.value)

function openConfig(quantity?: number) {
  configQuantity.value = quantity
  showConfig.value = true
}
watch(() => route.query.topic_id, (id) => {
  if (typeof id !== 'string' || !id) return
  configTopic.value = id
  showConfig.value = true
})

function onQuizCreated(quiz: Quiz) {
  showConfig.value = false
  void navigateTo(`/simulados/${quiz.id}`)
}

// History: GET /quizzes (15 per page, in progress first)
const loading = ref(true)
const loadError = ref(false)
const page = ref(1)
const hasMore = ref(false)
const loadingMore = ref(false)

async function fetchPage(n: number) {
  const res = await $api<{ data: Quiz[]; meta?: { last_page: number } }>('/quizzes', { params: { page: n } })
  hasMore.value = (res.meta?.last_page ?? 1) > n
  page.value = n
  return res.data
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    quizStore.quizzes = await fetchPage(1)
  } catch (e) {
    loadError.value = true
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    const more = await fetchPage(page.value + 1)
    const known = new Set(quizStore.quizzes.map(x => x.id))
    quizStore.quizzes.push(...more.filter(x => !known.has(x.id)))
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível carregar mais.' })
  } finally {
    loadingMore.value = false
  }
}

// Filter by caderno: the quiz's topic inside the caderno's subtree
const filter = ref(q('caderno'))
watch(filter, (v) => { void router.replace({ query: { ...route.query, caderno: v || undefined } }) })
const rootOptions = computed(() => [{ value: '', label: 'Todos os cadernos' }, ...topicStore.tree.map(t => ({ value: t.id, label: t.name }))])
const filterIds = computed(() => {
  const root = filter.value ? topicStore.findById(filter.value) : null
  return root ? new Set(flattenTopics([root]).map(t => t.id)) : null
})
const visible = computed(() => quizStore.quizzes.filter(x => !filterIds.value || (x.topic && filterIds.value.has(x.topic.id))))
const inProgress = computed(() => visible.value.filter(x => x.status === 'in_progress'))
const completed = computed(() => visible.value.filter(x => x.status === 'completed'))

function rowTitle(quiz: Quiz) {
  const kind = quiz.kind === 'exam' ? 'Simulado' : quiz.retry_of ? 'Refazer erros' : 'Questões'
  const parts = [kind, quiz.topic?.name ?? 'Sem caderno']
  if (quiz.completed_at) parts.push(relativeDate(quiz.completed_at))
  return parts.join(' · ')
}

function rowMeta(quiz: Quiz) {
  const wrong = quiz.total_questions - (quiz.correct_count ?? 0)
  const parts = [`${quiz.correct_count ?? 0} de ${quiz.total_questions}`]
  if (wrong > 0) parts.push(quiz.cards_created_at ? `${plural(wrong, 'erro', 'erros')} · cards criados` : plural(wrong, 'erro', 'erros'))
  if (quiz.topic?.in_trash) parts.push('caderno na lixeira')
  return parts.join(' · ')
}

onMounted(() => {
  void load()
  if (!topicStore.tree.length) void topicStore.fetchTree()
})
</script>
