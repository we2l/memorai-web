<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-display">Podcasts</h1>
        <p class="text-small text-base-muted mt-1">Sua biblioteca de revisão em áudio</p>
      </div>
      <button class="btn-primary" @click="showGenerate = true">
        🎙️ Gerar podcast
      </button>
    </div>

    <PodcastGenerateSheet v-model="showGenerate" @generated="onGenerated" />

    <!-- Loading -->
    <div v-if="store.loading && !store.podcasts.length" class="text-center py-12">
      <Loader2 :size="24" class="animate-spin text-base-muted mx-auto" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!store.podcasts.length" class="text-center py-16">
      <div class="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
        <Headphones :size="36" class="text-accent-primary" />
      </div>
      <p class="text-title text-base-secondary">Nenhum podcast ainda</p>
      <p class="text-small text-base-muted mt-1 max-w-xs mx-auto">Gere seu primeiro podcast dentro de um caderno e ouça seus pontos fracos!</p>
      <NuxtLink to="/topics" class="btn-primary mt-5 inline-flex">Ir pra Cadernos</NuxtLink>
    </div>

    <!-- Podcast list grouped by topic -->
    <template v-else>
      <!-- Currently playing -->
      <div v-if="player.currentPodcast" class="mb-6">
        <p class="text-micro text-accent-primary uppercase tracking-wide mb-3">Tocando agora</p>
        <button
          class="w-full card flex items-center gap-4 border-accent-primary/30 hover:border-accent-primary/50 transition-colors text-left"
          @click="player.expand()"
        >
          <div class="w-12 h-12 rounded-xl bg-accent-primary/15 flex items-center justify-center shrink-0">
            <div class="w-3 h-3 rounded-full bg-accent-primary animate-pulse" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-small text-base-primary font-medium truncate">{{ player.currentPodcast.title }}</p>
            <p class="text-micro text-base-muted">{{ formatTime(player.currentTime) }} / {{ formatTime(player.duration) }}</p>
          </div>
          <button
            class="w-9 h-9 rounded-full bg-accent-primary flex items-center justify-center shrink-0"
            @click.stop="player.togglePlay()"
          >
            <Pause v-if="player.isPlaying" :size="16" class="text-white" />
            <Play v-else :size="16" class="text-white ml-0.5" />
          </button>
        </button>
      </div>

      <!-- Grouped by topic -->
      <div v-for="group in groupedPodcasts" :key="group.topicName" class="mb-8">
        <p class="text-small font-medium text-base-secondary mb-3">{{ group.topicName }}</p>
        <div class="space-y-3">
          <div
            v-for="podcast in group.podcasts"
            :key="podcast.id"
            class="card flex items-center gap-4 hover:border-base-muted/30 transition-colors"
          >
            <!-- Status icon -->
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" :class="statusBg(podcast.status)">
              <Loader2 v-if="isGenerating(podcast.status)" :size="18" class="animate-spin" :class="statusText(podcast.status)" />
              <AlertCircle v-else-if="podcast.status === 'failed'" :size="18" class="text-danger" />
              <button v-else @click="playPodcast(podcast)" class="w-full h-full flex items-center justify-center">
                <Pause v-if="player.currentPodcast?.id === podcast.id && player.isPlaying" :size="18" :class="statusText(podcast.status)" />
                <Play v-else :size="18" :class="statusText(podcast.status)" class="ml-0.5" />
              </button>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0" :class="podcast.status === 'ready' ? 'cursor-pointer' : ''" @click="podcast.status === 'ready' && playPodcast(podcast)">
              <p class="text-small text-base-primary font-medium truncate">{{ podcast.title }}</p>
              <div class="flex items-center gap-2 text-micro text-base-muted mt-0.5">
                <span v-if="podcast.status === 'ready' && podcast.duration_seconds">{{ formatDuration(podcast.duration_seconds) }}</span>
                <span v-if="podcast.status === 'ready' && podcast.format" class="px-1.5 py-0.5 rounded bg-surface-tertiary text-micro">{{ podcast.format === 'debate' ? 'Debate' : 'Expositivo' }}</span>
                <span v-if="isGenerating(podcast.status)">{{ statusLabel(podcast.status) }}</span>
                <span v-if="podcast.status === 'failed'" class="text-danger">Falhou</span>
                <span>{{ timeAgo(podcast.created_at) }}</span>
              </div>
            </div>

            <!-- Card count badge -->
            <div v-if="podcast.card_ids?.length && podcast.status === 'ready'" class="text-micro text-base-muted shrink-0">
              {{ podcast.card_ids.length }} cards
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Headphones, Loader2, Play, Pause, AlertCircle } from 'lucide-vue-next'
import type { Podcast } from '~/types'

const store = usePodcastStore()
const player = usePlayerStore()
const showGenerate = ref(false)

function onGenerated() {
  if (store.hasPending) pollInterval = store.startPolling()
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
  if (status === 'ready') return 'bg-accent-primary/10'
  if (status === 'failed') return 'bg-danger/10'
  return 'bg-surface-tertiary'
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

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
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

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await store.fetchPodcasts()
  if (store.hasPending) pollInterval = store.startPolling()
})

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>
