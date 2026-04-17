<template>
  <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-tertiary">
    <button
      type="button"
      class="w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0"
      :class="playing ? 'bg-danger text-white' : 'bg-accent-primary-subtle text-accent-primary'"
      @click="toggle"
    >
      <Pause v-if="playing" :size="14" />
      <Play v-else :size="14" class="ml-0.5" />
    </button>
    <div class="flex-1 flex items-center gap-2 min-w-0">
      <div
        class="flex-1 h-1.5 rounded-full bg-surface-secondary cursor-pointer relative overflow-hidden"
        @click="seek"
      >
        <div
          class="h-1.5 rounded-full"
          :style="{ width: progressPct + '%', backgroundColor: 'var(--color-accent-primary)' }"
        />
      </div>
      <span class="text-micro text-base-muted w-10 text-right shrink-0">{{ timeLabel }}</span>
    </div>
    <button
      v-if="removable"
      type="button"
      class="p-0.5 text-base-muted hover:text-danger transition-colors"
      @click="$emit('remove')"
    >
      <X :size="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Play, Pause, X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  src: string
  removable?: boolean
}>(), {
  removable: false,
})

defineEmits<{ (e: 'remove'): void }>()

const audioRef = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const progressPct = ref(0)
const dur = ref(0)
const cur = ref(0)
let interval: ReturnType<typeof setInterval> | null = null

const timeLabel = computed(() => {
  const t = playing.value ? cur.value : dur.value
  if (!t || isNaN(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
})

function getAudio(): HTMLAudioElement {
  if (!audioRef.value) {
    const a = new Audio(props.src)
    a.addEventListener('loadedmetadata', () => { dur.value = a.duration })
    a.addEventListener('ended', stop)
    audioRef.value = a
  }
  return audioRef.value
}

function startPolling() {
  stopPolling()
  interval = setInterval(() => {
    const a = audioRef.value
    if (!a) return
    cur.value = a.currentTime
    progressPct.value = a.duration > 0 ? (a.currentTime / a.duration) * 100 : 0
  }, 50)
}

function stopPolling() {
  if (interval) { clearInterval(interval); interval = null }
}

function toggle() {
  const a = getAudio()
  if (playing.value) {
    a.pause()
    playing.value = false
    stopPolling()
  } else {
    a.play()
    playing.value = true
    startPolling()
  }
}

function stop() {
  playing.value = false
  progressPct.value = 0
  cur.value = 0
  stopPolling()
}

function seek(e: MouseEvent) {
  const a = getAudio()
  if (!a.duration) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  a.currentTime = pct * a.duration
  cur.value = a.currentTime
  progressPct.value = pct * 100
}

watch(() => props.src, () => {
  audioRef.value?.pause()
  audioRef.value = null
  stop()
})

onUnmounted(() => {
  stopPolling()
  audioRef.value?.pause()
  audioRef.value = null
})
</script>
