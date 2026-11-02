<template>
  <div
    v-if="player.currentPodcast"
    role="region"
    aria-label="Tocando agora"
    class="fixed inset-x-2.5 bottom-[calc(var(--nav-h)+8px)] z-player overflow-hidden rounded-float border border-line bg-raised shadow-raised md:inset-x-auto md:right-4 md:bottom-4 md:w-96"
  >
    <div class="flex items-center gap-3 py-2 pr-1.5 pl-2.5">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-control bg-subtle text-listen" aria-hidden="true">
        <UiBaigiMascot v-if="player.isPlaying" state="subtle" :visible="true" :size="34" />
        <Headphones v-else class="size-5" />
      </span>
      <button type="button" class="min-w-0 flex-1 rounded-row text-left" aria-label="Abrir o player" @click="expand">
        <span class="block truncate text-meta font-semibold text-fg-strong">{{ player.currentPodcast.title }}</span>
        <span class="block truncate text-label text-fg-muted">
          <span class="tabular-nums">{{ formatTime(player.currentTime) }} de {{ formatTime(player.duration) }}</span>
          <template v-if="player.episodeLabel"> · ep. {{ player.episodeLabel }}</template>
        </span>
      </button>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-fg-strong text-raised transition-transform duration-nav active:scale-95"
        :aria-label="player.isPlaying ? 'Pausar' : 'Reproduzir'"
        @click="toggle"
      >
        <Pause v-if="player.isPlaying" class="size-4 fill-current" aria-hidden="true" />
        <Play v-else class="ml-0.5 size-4 fill-current" aria-hidden="true" />
      </button>
      <UiIconButton :icon="ChevronUp" label="Expandir player" size="sm" @click="expand" />
      <UiIconButton :icon="X" label="Fechar player" size="sm" @click="close" />
    </div>
    <div class="h-0.5 bg-progress-track" aria-hidden="true">
      <div class="h-0.5 bg-fg-strong transition-all duration-respond" :style="{ width: `${progressPercent}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Mini-player of the shell (prd-navegacao-v3 RF-4, canvas CelularPlayerV2): v3, z-player. On the phone it
// floats over the BottomNav (--nav-h); from 768 px it sits in the bottom right corner. It belongs to the
// layout, so the audio keeps playing while the person moves between the 4 places; focus routes
// (revisão, simulado) hide it with the rest of the shell. The layout reserves --miniplayer-h below the
// content, the sticky bars and the toasts.
import { ChevronUp, Headphones, Pause, Play, X } from 'lucide-vue-next'

const player = usePlayerStore()

const progressPercent = computed(() => {
  if (!player.duration) return 0
  return Math.min(100, (player.currentTime / player.duration) * 100)
})

function track(action: 'play' | 'pause' | 'expand' | 'close') {
  useAnalytics().track('miniplayer_toggled', { action })
}

function toggle() {
  track(player.isPlaying ? 'pause' : 'play')
  player.togglePlay()
}

function expand() {
  track('expand')
  player.expand()
}

function close() {
  track('close')
  player.stop()
}
</script>
