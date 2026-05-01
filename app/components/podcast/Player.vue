<template>
  <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary">
    <button
      class="shrink-0 w-10 h-10 rounded-full bg-accent-primary/15 text-accent-primary flex items-center justify-center hover:bg-accent-primary/25 transition-colors"
      :aria-label="isPlaying ? 'Pausar' : 'Reproduzir'"
      @click="togglePlay"
    >
      <Pause v-if="isPlaying" :size="18" />
      <Play v-else :size="18" class="ml-0.5" />
    </button>
    <div class="flex-1 min-w-0">
      <p class="text-small text-base-primary truncate">{{ title }}</p>
      <div class="flex items-center gap-2 mt-1">
        <input
          type="range"
          min="0"
          :max="audioDuration || 100"
          :value="currentTime"
          class="flex-1 h-1 accent-amber-600 cursor-pointer"
          aria-label="Progresso do áudio"
          @input="seek"
        />
        <span class="text-micro text-base-muted shrink-0">{{ formatTime(currentTime) }} / {{ formatTime(audioDuration || duration) }}</span>
      </div>
    </div>
  </div>
  <audio ref="audioEl" :src="audioUrl" preload="metadata" @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded" @ended="isPlaying = false" />
</template>

<script setup lang="ts">
import { Play, Pause } from 'lucide-vue-next'

defineProps<{
  audioUrl: string
  title: string
  duration: number
}>()

const audioEl = ref<HTMLAudioElement>()
const isPlaying = ref(false)
const currentTime = ref(0)
const audioDuration = ref(0)

function togglePlay() {
  if (!audioEl.value) return
  if (isPlaying.value) {
    audioEl.value.pause()
  } else {
    audioEl.value.play()
  }
  isPlaying.value = !isPlaying.value
}

function onTimeUpdate() {
  currentTime.value = Math.floor(audioEl.value?.currentTime ?? 0)
}

function onLoaded() {
  audioDuration.value = Math.floor(audioEl.value?.duration ?? 0)
}

function seek(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  if (audioEl.value) audioEl.value.currentTime = val
  currentTime.value = val
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>
