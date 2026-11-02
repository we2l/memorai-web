<template>
  <div class="mx-auto flex max-w-page flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <div class="flex flex-col gap-2">
      <nav aria-label="Caminho" class="flex items-center gap-1 text-meta text-fg-muted">
        <UiLink to="/praticar" variant="muted">Praticar</UiLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Ouvir</span>
      </nav>
      <UiPageHeader title="Ouvir" meta="Os seus pontos fracos em áudio. Ouça e depois revise os cards do episódio.">
        <template #actions>
          <UiButton variant="primary" :icon-left="Mic" data-testid="podcast-generate" @click="openGenerate">Gerar episódio</UiButton>
        </template>
      </UiPageHeader>
      <PodcastDailyEpisodeSwitch class="max-w-xl" />
    </div>

    <!-- ?topic_id= (Praticar or the caderno): the episodes of that scope and its subtree (GET /podcasts?topic_id=) -->
    <div v-if="scopeTopicId" class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-subtle px-3 py-2" role="status" data-testid="podcasts-scope">
      <p class="min-w-0 flex-1 text-meta text-fg">Episódios de <span class="font-semibold text-fg-strong">{{ scopeName || 'este caderno' }}</span></p>
      <UiButton size="sm" variant="ghost" to="/podcasts">Ver todos</UiButton>
    </div>

    <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
      <span class="sr-only">Carregando os episódios…</span>
      <UiSkeleton v-for="i in 4" :key="i" variant="row" />
    </div>

    <!-- An error is never an empty state (03 Q14) -->
    <UiErrorState v-else-if="loadError" title="Não foi possível carregar seus episódios" @retry="load" />

    <UiSection v-else-if="!store.podcasts.length" data-testid="podcasts-empty">
      <div class="flex flex-col items-center gap-5 px-2 py-6 text-center">
        <!-- Preview of the player (static, no image to download) -->
        <div class="flex w-full max-w-sm items-center gap-3 rounded-card border border-line bg-raised p-3 text-left shadow-card" aria-hidden="true">
          <span class="flex size-12 shrink-0 items-center justify-center rounded-control bg-subtle text-listen"><Headphones class="size-6" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-meta font-semibold text-fg-strong">Seus erros de ontem</span>
            <span class="block text-label text-fg-muted">9 cards · 7 min</span>
            <span class="mt-2 block h-1 overflow-hidden rounded-full bg-progress-track"><span class="block h-1 w-2/5 rounded-full bg-fg-strong" /></span>
          </span>
        </div>
        <div>
          <h2 class="text-section text-fg-strong">Seu primeiro episódio</h2>
          <p class="mt-1 max-w-sm text-body text-fg-muted">Um áudio curto com os cards que você mais erra, com transcrição. Para gerar, revise pelo menos 5 cards.</p>
        </div>
        <UiButton :icon-left="Mic" icon-tone="listen" @click="openGenerate">Gerar meu primeiro episódio</UiButton>
      </div>
    </UiSection>

    <div v-else class="grid items-start gap-6 lg:grid-cols-2">
      <div class="flex min-w-0 flex-col gap-6">
        <UiSection v-if="today" title="Para hoje" data-testid="podcasts-today">
          <ul class="-mx-2">
            <PodcastEpisodeRow :podcast="today" :fresh="isFreshDaily(today)" with-topic @toggle="toggle(today)" @open="open(today)" @delete="askDelete(today)" @download="download(today)" />
          </ul>
        </UiSection>

        <UiSection v-if="continuing.length" title="Continuar" data-testid="podcasts-continue">
          <ul class="-mx-2 flex flex-col gap-1">
            <PodcastEpisodeRow v-for="p in continuing" :key="p.id" :podcast="p" with-topic @toggle="toggle(p)" @open="open(p)" @delete="askDelete(p)" @download="download(p)" />
          </ul>
        </UiSection>

        <UiSection v-if="library.length || store.hasMore" title="Biblioteca" data-testid="podcasts-library">
          <div class="flex flex-col gap-5">
            <div v-for="group in groups" :key="group.name">
              <h3 class="mb-1 text-meta font-semibold text-fg-muted">{{ group.name }}</h3>
              <ul class="-mx-2 flex flex-col gap-1">
                <PodcastEpisodeRow v-for="p in group.items" :key="p.id" :podcast="p" @toggle="toggle(p)" @open="open(p)" @delete="askDelete(p)" @download="download(p)" />
              </ul>
            </div>
            <UiButton v-if="store.hasMore" class="self-center" :loading="store.loadingMore" @click="store.loadMore()">Carregar mais</UiButton>
          </div>
        </UiSection>
      </div>

      <!-- Desktop: the player beside the list (the phone opens it in a sheet) -->
      <UiSection v-if="desktop" as="aside" aria-label="Player" class="lg:sticky lg:top-topnav" data-testid="podcasts-player">
        <LazyPodcastPlayerPanel v-if="player.currentPodcast" :primary="false" />
        <div v-else class="flex flex-col items-center gap-2 py-8 text-center">
          <Headphones class="size-8 text-listen" aria-hidden="true" />
          <p class="text-body text-fg">Escolha um episódio para ouvir com a transcrição.</p>
        </div>
      </UiSection>
    </div>

    <LazyPodcastGenerateSheet v-if="generateLoaded" v-model="showGenerate" :topic-id="scopeTopicId ?? undefined" @generated="onGenerated" />
    <LazyUiConfirmModal
      v-if="confirmLoaded"
      v-model="confirmOpen"
      title="Excluir o episódio?"
      :message="toDelete ? `“${toDelete.title}” e o áudio saem da sua biblioteca. Os cards continuam.` : ''"
      confirm-label="Excluir"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
// Ouvir (prd-4e-praticar-v3 RF-F6, canvas OuvirV2): "Para hoje" (the episódio da manhã of the last 24 h or
// the newest one not finished), "Continuar" (0 < progress < 95%) and the library grouped by caderno, with the
// player and its transcript beside the list on the desktop. One primary: "Gerar episódio". The position comes
// from the server (listened_seconds), so another device continues from the same point.
import { Headphones, Mic } from 'lucide-vue-next'
import type { Podcast } from '~/types'

useHead({ title: 'Ouvir · Baigi' })

const store = usePodcastStore()
const player = usePlayerStore()
const topicStore = useTopicStore()
const route = useRoute()
const desktop = useMediaQuery('(min-width: 1024px)')

// ?action=generate (search, Praticar, Hoje): the sheet opens with the scope of the page
const showGenerate = ref(route.query.action === 'generate')
const generateLoaded = useLoadedOnce(() => showGenerate.value)
const scopeTopicId = computed(() => (typeof route.query.topic_id === 'string' && route.query.topic_id) || null)
const scopeName = computed(() => (scopeTopicId.value ? topicStore.findById(scopeTopicId.value)?.name ?? '' : ''))

const loading = ref(true)
const loadError = ref(false)
async function load() {
  loading.value = !store.podcasts.length || store.topicId !== scopeTopicId.value
  loadError.value = false
  try {
    await store.setScope(scopeTopicId.value)
    store.startPolling()
  } catch (e) {
    loadError.value = true
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}
watch(scopeTopicId, () => { void load() })

const DAY_MS = 24 * 3600_000
const isFreshDaily = (p: Podcast) => p.origin === 'daily' && Date.now() - new Date(p.created_at).getTime() < DAY_MS
const isReady = (p: Podcast) => p.status === 'ready' && !!p.audio_url
const isFinished = (p: Podcast) => !!p.completed_at || (p.progress ?? 0) >= 0.95
const isContinuing = (p: Podcast) => isReady(p) && !isFinished(p) && (p.progress ?? 0) > 0

/** Para hoje: the daily episode of the last 24 h, else the newest ready one not started */
const today = computed<Podcast | null>(() => {
  const ready = store.podcasts.filter(p => isReady(p) && !isFinished(p))
  return ready.find(isFreshDaily) ?? ready.find(p => !isContinuing(p)) ?? null
})
const continuing = computed(() => store.podcasts.filter(p => isContinuing(p) && p.id !== today.value?.id))
const library = computed(() => store.podcasts.filter(p => p.id !== today.value?.id && !continuing.value.some(c => c.id === p.id)))
const groups = computed(() => {
  const map = new Map<string, Podcast[]>()
  for (const p of library.value) {
    const name = p.topic_name ?? 'Sem caderno'
    map.set(name, [...(map.get(name) ?? []), p])
  }
  return [...map.entries()].map(([name, items]) => ({ name, items }))
})

function openGenerate() {
  showGenerate.value = true
}

function onGenerated() {
  store.startPolling()
}

function toggle(p: Podcast) {
  if (player.currentPodcast?.id === p.id) player.togglePlay()
  else player.play(p)
}

/** The row opens the player: in the column on the desktop, in the sheet on the phone. */
function open(p: Podcast) {
  if (player.currentPodcast?.id !== p.id) player.play(p)
  if (!desktop.value) player.expand()
}

const toDelete = ref<Podcast | null>(null)
const confirmOpen = ref(false)
const confirmLoaded = useLoadedOnce(() => confirmOpen.value)
const { run: runDelete, pending: deleting } = useApiAction()
function askDelete(p: Podcast) {
  toDelete.value = p
  confirmOpen.value = true
}
async function confirmDelete() {
  const p = toDelete.value
  if (!p) return
  if (player.currentPodcast?.id === p.id) player.stop()
  await runDelete(() => store.deletePodcast(p.id), { success: 'Episódio excluído.', error: 'Não foi possível excluir o episódio.' })
  confirmOpen.value = false
  toDelete.value = null
}

const { run: runDownload } = useApiAction()
async function download(p: Podcast) {
  const { $api } = useNuxtApp()
  const res = await runDownload(() => $api<{ url: string }>(`/podcasts/${p.id}/download`), { error: 'Não foi possível baixar o áudio.' })
  if (!res) return
  const a = document.createElement('a')
  a.href = res.url
  a.download = `${p.title || 'podcast'}.mp3`
  a.click()
}

onMounted(() => {
  void load()
  if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree()
})
onUnmounted(() => store.stopPolling())
</script>
