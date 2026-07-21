<template>
  <div
    v-if="player.currentPodcast"
    class="fixed left-0 lg:left-[240px] right-0 z-40 bg-[var(--bg-card)] border-t border-base shadow-[0_-4px_16px_rgba(45,35,66,0.06)]"
    :class="isMobile ? 'bottom-16' : 'bottom-0'"
  >
    <div class="h-[2px] bg-surface-secondary">
      <div class="h-[2px] bg-[var(--color-accent-soft)] transition-all duration-300" :style="{ width: progressPercent + '%' }" />
    </div>
    <div class="flex items-center gap-3 px-4 py-2.5">
      <UiBaigiMascot state="subtle" :visible="player.isPlaying" :size="28" />
      <div v-show="!player.isPlaying" class="w-8 h-8 rounded-lg bg-accent-primary-subtle flex items-center justify-center shrink-0">
        <Headphones :size="16" class="text-[var(--color-accent-soft)]" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-small text-base-primary truncate">
          {{ player.currentPodcast.title }}
          <span v-if="player.episodeLabel" class="text-micro text-base-muted ml-1">Ep {{ player.episodeLabel }}</span>
        </p>
        <p class="text-micro text-base-muted">{{ player.currentPodcast.topic_name ?? '' }}</p>
      </div>
      <button
        class="w-9 h-9 rounded-full bg-accent-primary flex items-center justify-center shrink-0"
        :aria-label="player.isPlaying ? 'Pausar' : 'Reproduzir'"
        @click="player.togglePlay()"
      >
        <Pause v-if="player.isPlaying" :size="16" class="text-white" />
        <Play v-else :size="16" class="text-white ml-0.5" />
      </button>
      <button class="p-1.5 text-base-muted hover:text-base-primary" aria-label="Expandir player" @click="player.expand()">
        <ChevronUp :size="18" />
      </button>
      <button class="p-1.5 text-base-muted hover:text-danger" aria-label="Fechar player" @click="player.stop()">
        <X :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Headphones, Play, Pause, ChevronUp, X } from 'lucide-vue-next'

const player = usePlayerStore()
const isMobile = ref(false)

const progressPercent = computed(() => {
  if (!player.duration) return 0
  return Math.min(100, (player.currentTime / player.duration) * 100)
})

onMounted(() => {
  isMobile.value = window.innerWidth < 1024
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 1024 })
})
</script>
