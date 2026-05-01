<template>
  <div
    v-if="player.currentPodcast"
    class="fixed left-0 lg:left-[220px] right-0 z-40 bg-surface-secondary border-t border-base"
    :class="isMobile ? 'bottom-16' : 'bottom-0'"
  >
    <div class="h-1 bg-surface-tertiary">
      <div class="h-1 bg-accent-primary transition-all duration-300" :style="{ width: progressPercent + '%' }" />
    </div>
    <div class="flex items-center gap-3 px-4 py-2.5">
      <div class="w-8 h-8 rounded-lg bg-accent-primary/15 flex items-center justify-center shrink-0">
        <Headphones :size="16" class="text-accent-primary" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-small text-base-primary truncate">{{ player.currentPodcast.title }}</p>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { Headphones, Play, Pause, ChevronUp } from 'lucide-vue-next'

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
