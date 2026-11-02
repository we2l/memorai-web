<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-bold text-page-title text-fg-strong">Podcasts</h1>
        <p class="text-meta text-fg-muted mt-1">Sua biblioteca de revisão em áudio</p>
      </div>
      <UiButton variant="primary" @click="showGenerate = true">
        <Mic :size="14" class="inline" /> Gerar podcast
      </UiButton>
    </div>

    <PodcastGenerateSheet v-model="showGenerate" @generated="onGenerated" />

    <!-- Loading -->
    <div v-if="store.loading && !store.podcasts.length" class="text-center py-12">
      <Loader2 :size="24" class="animate-spin text-fg-muted mx-auto" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!store.podcasts.length" class="text-center py-16">
      <picture class="contents"><source srcset="~/assets/mascots/mascot-baigi-podcast.avif" type="image/avif"><img src="~/assets/mascots/mascot-baigi-podcast.webp" alt="Baigi com fones" class="w-28 h-28 object-contain mx-auto mb-4" width="112" height="112" loading="lazy" decoding="async" /></picture>
      <p class="text-section text-fg">Nenhum podcast ainda</p>
      <p class="text-meta text-fg-muted mt-1 max-w-xs mx-auto">Gere seu primeiro podcast dentro de um caderno e ouça seus pontos fracos!</p>
      <UiButton to="/cadernos" class="mt-5 inline-flex">Ir pra Cadernos</UiButton>
    </div>

    <!-- Podcast list grouped by topic -->
    <template v-else>
      <!-- Currently playing -->
      <div v-if="player.currentPodcast" class="mb-8">
        <p class="text-label mb-3">Tocando agora</p>
        <div
          class="w-full rounded-2xl bg-[var(--bg-card)] border border-line-strong p-5 flex items-center gap-4 hover:border-line-strong transition-colors cursor-pointer shadow-lg"
          @click="player.expand()"
        >
          <div class="w-14 h-14 rounded-xl bg-action-subtle border border-action-fg/20 flex items-center justify-center shrink-0">
            <div class="w-3 h-3 rounded-full bg-action animate-pulse" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-meta text-fg-strong font-medium truncate">{{ player.currentPodcast.title }}</p>
            <p class="text-label text-fg-muted mt-0.5">{{ formatTime(player.currentTime) }} / {{ formatTime(player.duration) }}</p>
          </div>
          <button
            class="w-11 h-11 rounded-full bg-action text-on-action flex items-center justify-center shrink-0 hover:brightness-110 transition-all"
            :aria-label="player.isPlaying ? 'Pausar' : 'Tocar'"
            @click.stop="player.togglePlay()"
          >
            <Pause v-if="player.isPlaying" :size="16" aria-hidden="true" />
            <Play v-else :size="16" class="ml-0.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Grouped by topic -->
      <div v-for="group in groupedPodcasts" :key="group.topicName" class="mb-8">
        <p class="text-meta font-medium text-fg mb-3">{{ group.topicName }}</p>
        <div class="space-y-3">
          <div
            v-for="podcast in group.podcasts"
            :key="podcast.id"
            class="card flex items-center gap-4 hover:border-line-strong transition-colors"
          >
            <!-- Status icon -->
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" :class="statusBg(podcast.status)">
              <Loader2 v-if="isGenerating(podcast.status)" :size="18" class="animate-spin text-fg-muted" />
              <AlertCircle v-else-if="podcast.status === 'failed'" :size="18" class="text-danger" />
              <button v-else :aria-label="player.currentPodcast?.id === podcast.id && player.isPlaying ? `Pausar ${podcast.title}` : `Tocar ${podcast.title}`" @click="playPodcast(podcast)" class="w-full h-full flex items-center justify-center">
                <Pause v-if="player.currentPodcast?.id === podcast.id && player.isPlaying" :size="18" :class="statusText(podcast.status)" aria-hidden="true" />
                <Headphones v-else :size="18" :class="statusText(podcast.status)" aria-hidden="true" />
              </button>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0" :class="podcast.status === 'ready' ? 'cursor-pointer' : ''" @click="podcast.status === 'ready' && playPodcast(podcast)">
              <p class="text-meta text-fg-strong font-medium truncate">{{ podcast.title }}</p>
              <div class="flex items-center gap-2 text-label text-fg-muted mt-0.5">
                <span v-if="podcast.status === 'ready' && podcast.duration_seconds">{{ formatDuration(podcast.duration_seconds) }}</span>
                <span v-if="podcast.status === 'ready' && podcast.format" class="px-1.5 py-0.5 rounded bg-line text-label">{{ podcast.format === 'debate' ? 'Debate' : 'Expositivo' }}</span>
                <span v-if="isGenerating(podcast.status)">{{ statusLabel(podcast.status) }}</span>
                <span v-if="podcast.status === 'failed'" class="text-danger">Falhou</span>
                <span>{{ timeAgo(podcast.created_at) }}</span>
              </div>
            </div>

            <!-- Card count badge + delete -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- The cards of this episode only (prd-caderno-f2-recorte RF-F5) -->
              <UiButton
                v-if="podcast.status === 'ready' && episodeCardsCount(podcast) > 0"
                size="sm"
                :to="reviewPath({ type: 'podcast', id: podcast.id })"
              >
                Revisar {{ episodeCardsCount(podcast) }}<span class="sr-only"> cards do episódio {{ podcast.title }}</span>
              </UiButton>
              <button
                @click.stop="confirmDelete(podcast)"
                class="w-8 h-8 rounded-control flex items-center justify-center text-fg-muted hover:text-danger hover:bg-danger-subtle transition-colors"
                title="Excluir podcast"
               aria-label="Excluir podcast">
                <Trash2 :size="14" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.hasMore" class="flex justify-center mt-2 mb-8">
        <UiButton variant="secondary" type="button"
          class="inline-flex items-center gap-2"
          :disabled="store.loadingMore"
          :aria-busy="store.loadingMore"
          @click="store.loadMore()">
          <Loader2 v-if="store.loadingMore" :size="14" class="animate-spin" aria-hidden="true" />
          Carregar mais
        </UiButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Headphones, Loader2, Play, Pause, AlertCircle, Mic, Trash2 } from 'lucide-vue-next'
import type { Podcast } from '~/types'

const store = usePodcastStore()
const player = usePlayerStore()
const route = useRoute()
// ?action=generate (search, Praticar): the sheet opens in library mode (it picks the caderno and says
// the requirement before generating)
const showGenerate = ref(route.query.action === 'generate')
const podcastToDelete = ref<Podcast | null>(null)

async function confirmDelete(podcast: Podcast) {
  if (!confirm(`Excluir "${podcast.title}"? O áudio será removido permanentemente.`)) return

  // If currently playing, stop
  if (player.currentPodcast?.id === podcast.id) {
    player.stop()
  }

  try {
    await store.deletePodcast(podcast.id)
  } catch (e) {
    alert('Erro ao excluir podcast.')
  }
}

function onGenerated() {
  store.startPolling()
}

const groupedPodcasts = computed(() => {
  const groups: Record<string, { topicName: string; podcasts: Podcast[] }> = {}
  for (const p of store.podcasts) {
    const name = p.topic_name ?? 'Geral'
    if (!groups[name]) groups[name] = { topicName: name, podcasts: [] }
    groups[name].podcasts.push(p)
  }
  return Object.values(groups)
})

function playPodcast(podcast: Podcast) {
  if (player.currentPodcast?.id === podcast.id) {
    if (player.isPlaying) {
      player.pause()
    } else {
      player.resume()
      player.expand()
    }
  } else {
    player.play(podcast)
    player.expand()
  }
}

function isGenerating(status: string) {
  return ['pending', 'generating_script', 'generating_audio'].includes(status)
}

function statusBg(status: string) {
  if (status === 'ready') return 'bg-accent-primary-subtle'
  if (status === 'failed') return 'bg-[var(--state-danger-bg)]'
  return 'bg-surface-secondary'
}

function statusText(status: string) {
  if (status === 'ready') return 'text-accent-primary'
  return 'text-base-muted'
}

function statusLabel(status: string): string {
  if (status === 'pending') return 'Na fila...'
  if (status === 'generating_script') return 'Gerando roteiro...'
  if (status === 'generating_audio') return 'Gerando áudio...'
  return ''
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}


function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

onMounted(async () => {
  await store.fetchPodcasts()
  store.startPolling()
})

onUnmounted(() => store.stopPolling())
</script>
