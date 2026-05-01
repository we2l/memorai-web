<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-display">Podcasts</h1>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && !store.podcasts.length" class="text-center py-12">
      <Loader2 :size="24" class="animate-spin text-base-muted mx-auto" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!store.podcasts.length" class="text-center py-16">
      <p class="text-4xl mb-4">🎧</p>
      <p class="text-title text-base-secondary">Nenhum podcast ainda</p>
      <p class="text-small text-base-muted mt-1">Gere seu primeiro podcast dentro de um caderno!</p>
      <NuxtLink to="/topics" class="btn-primary mt-4 inline-flex">Ir pra Cadernos</NuxtLink>
    </div>

    <!-- Podcast list -->
    <div v-else class="space-y-4">
      <div v-for="podcast in store.podcasts" :key="podcast.id" class="card">
        <!-- Generating -->
        <div v-if="['pending', 'generating_script', 'generating_audio'].includes(podcast.status)" class="flex items-center gap-3">
          <Loader2 :size="20" class="animate-spin text-accent-primary shrink-0" />
          <div>
            <p class="text-small text-base-primary">{{ podcast.title }}</p>
            <p class="text-micro text-base-muted">{{ statusLabel(podcast.status) }}</p>
          </div>
        </div>

        <!-- Ready -->
        <div v-else-if="podcast.status === 'ready'" class="flex items-center gap-3">
          <button
            class="w-10 h-10 rounded-full bg-accent-primary/15 text-accent-primary flex items-center justify-center shrink-0 hover:bg-accent-primary/25"
            @click="playPodcast(podcast)"
          >
            <Pause v-if="player.currentPodcast?.id === podcast.id && player.isPlaying" :size="18" />
            <Play v-else :size="18" class="ml-0.5" />
          </button>
          <div class="flex-1 min-w-0">
            <p class="text-small text-base-primary font-medium truncate">{{ podcast.title }}</p>
            <p class="text-micro text-base-muted">{{ podcast.topic_name ?? '' }} · {{ formatDuration(podcast.duration_seconds) }} · {{ timeAgo(podcast.created_at) }}</p>
          </div>
        </div>

        <!-- Failed -->
        <div v-else-if="podcast.status === 'failed'" class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-micro bg-danger/15 text-danger">Falhou</span>
            <p class="text-small text-base-muted">{{ podcast.title }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2, Play, Pause } from 'lucide-vue-next'
import type { Podcast } from '~/types'

const store = usePodcastStore()
const player = usePlayerStore()

function playPodcast(podcast: Podcast) {
  if (player.currentPodcast?.id === podcast.id) {
    player.togglePlay()
  } else {
    player.play(podcast)
  }
}

function statusLabel(status: string): string {
  if (status === 'pending') return 'Na fila...'
  if (status === 'generating_script') return 'Gerando roteiro...'
  if (status === 'generating_audio') return 'Gerando áudio...'
  return status
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await store.fetchPodcasts()
  if (store.hasPending) pollInterval = store.startPolling()
})

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>
