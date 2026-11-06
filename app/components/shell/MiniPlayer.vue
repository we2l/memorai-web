<template>
  <div
    v-if="player.currentPodcast && !inPagePlayer"
    role="region"
    aria-label="Tocando agora"
    class="fixed right-[calc(10px+env(safe-area-inset-right))] bottom-[calc(var(--nav-h)+8px)] left-[calc(10px+env(safe-area-inset-left))] z-player overflow-hidden rounded-float border border-line bg-raised shadow-raised md:right-4 md:bottom-[calc(16px+env(safe-area-inset-bottom))] md:left-auto md:w-96"
  >
    <div class="flex items-center gap-3 py-2 pr-1.5 pl-2.5">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-control bg-subtle text-listen" aria-hidden="true">
        <UiBaigiMascot v-if="player.isPlaying" state="subtle" :visible="true" :size="34" />
        <Headphones v-else class="size-5" />
      </span>
      <button type="button" class="hit-touch min-w-0 flex-1 rounded-row text-left" aria-label="Abrir o player" @click="expand">
        <span class="block truncate text-meta font-semibold text-fg-strong">{{ player.currentPodcast.title }}</span>
        <span class="block truncate text-label text-fg-muted">
          <span class="tabular-nums">{{ formatTime(player.currentTime) }} de {{ formatTime(player.duration) }}</span>
        </span>
      </button>
      <button
        type="button"
        class="hit-touch flex size-10 shrink-0 items-center justify-center rounded-full bg-fg-strong text-raised transition-transform duration-nav active:scale-95"
        :aria-label="player.isPlaying ? 'Pausar' : 'Reproduzir'"
        @click="toggle"
      >
        <Pause v-if="player.isPlaying" class="size-4 fill-current" aria-hidden="true" />
        <Play v-else class="ml-0.5 size-4 fill-current" aria-hidden="true" />
      </button>
      <UiIconButton :icon="ChevronUp" label="Expandir player" size="sm" @click="expand" />
      <UiIconButton :icon="X" label="Fechar player" size="sm" @click="close" />
    </div>
    <!-- The episode ended: review the cards it talked about (prd-caderno-f2-recorte RF-F5) -->
    <div v-if="player.hasEnded && episodeCards > 0" class="flex items-center justify-between gap-2 border-t border-line px-3 py-2" role="status">
      <span class="text-meta text-fg">Episódio concluído</span>
      <UiButton size="sm" :to="reviewPath({ type: 'podcast', id: player.currentPodcast.id })">
        Revisar {{ episodeCards === 1 ? 'o card' : `os ${episodeCards}` }} do episódio
      </UiButton>
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
// content, the sticky bars and the toasts. The time starts where the person stopped (listened_seconds of the
// server, prd-4e-praticar-v3 RF-F10).
import { ChevronUp, Headphones, Pause, Play, X } from 'lucide-vue-next'

const player = usePlayerStore()
// /podcasts on the desktop shows the full player beside the list: the mini one would only cover it
const route = useRoute()
const desktop = useMediaQuery('(min-width: 1024px)')
const inPagePlayer = computed(() => desktop.value && route.path === '/podcasts')
const episodeCards = computed(() => episodeCardsCount(player.currentPodcast))

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
