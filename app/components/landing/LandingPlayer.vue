<template>
  <div class="lp-player" data-testid="landing-player">
    <div class="top">
      <button
        class="lp-play"
        type="button"
        :aria-label="playing ? 'Pausar o exemplo' : 'Ouvir o exemplo'"
        :aria-pressed="playing"
        :aria-busy="loading"
        data-testid="landing-player-play"
        @click="toggle"
      >
        <svg v-if="playing || loading" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
      </button>
      <div>
        <b>{{ SAMPLE.title }}</b>
        <small>Concurso TRF · <span class="num" data-testid="landing-player-time">{{ loading ? 'carregando…' : `${fmt(time)} / ${fmt(duration)}` }}</span> · voz sintética</small>
      </div>
    </div>
    <!-- The waveform of the file: a click jumps there (the transcript below is the accessible version) -->
    <div ref="wave" class="lp-wave" :class="{ pre, live: playing }" aria-hidden="true" @click="seek">
      <i
        v-for="(h, i) in SAMPLE.peaks"
        :key="i"
        :style="{ '--h': h, transitionDelay: staggered ? `${i * 6}ms` : undefined }"
        :data-on="String(i < cursor)"
        :data-near="String(playing && Math.abs(i - cursor) <= 2)"
      />
    </div>
    <div class="lp-tx">
      <ol :style="{ transform: `translateY(${-offset}px)` }">
        <li v-for="(line, i) in SAMPLE.lines" :key="line.t" ref="items" :data-cur="String(i === current)">{{ line.text }}</li>
      </ol>
    </div>
    <p v-if="failed" class="err" role="alert" data-testid="landing-player-error">
      Não deu para tocar o áudio agora.<button type="button" @click="retry">Tentar de novo</button>
    </p>
    <p v-else class="src">Trecho real que o Baigi gerou de um card errado 2 vezes, na conta de demonstração.</p>
    <audio ref="audio" preload="none" :src="SAMPLE.src" @play="onPlay" @playing="loading = false" @waiting="loading = true" @pause="onStop" @ended="onStop" @timeupdate="sync" @loadedmetadata="sync" @error="onError" />
  </div>
</template>

<script setup lang="ts">
// The player of the podcast section (prd-landing-d RF-D7; the A direction's): the real 26 s sample, downloaded only
// on play (`preload="none"`), the waveform of the file, the transcript following the voice, and the states the
// prototype lacked: loading ("carregando…") and failure ("Tentar de novo"). Emits `playing` (the dolphin bobs) and
// `firstPlay` (landing_sample_played).
import { SAMPLE } from '~/utils/landing'
import { motionAllowed } from '~/utils/landingMotion'

const emit = defineEmits<{ playing: [boolean], firstPlay: [] }>()

const audio = ref<HTMLAudioElement | null>(null)
const wave = ref<HTMLElement | null>(null)
const items = ref<HTMLElement[]>([])
const playing = ref(false)
const loading = ref(false)
const failed = ref(false)
const time = ref(0)
const duration = ref(SAMPLE.duration)
const pre = ref(false)
const staggered = ref(false)
let played = false

const cursor = computed(() => Math.floor((time.value / duration.value) * SAMPLE.peaks.length))
const current = computed(() => SAMPLE.lines.reduce((cur, line, i) => (time.value >= line.t ? i : cur), 0))
const offset = computed(() => items.value[current.value]?.offsetTop ?? 0)

function fmt(s: number): string {
  const n = Math.max(0, Math.floor(s))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

function sync() {
  const a = audio.value
  if (!a) return
  time.value = a.currentTime
  if (Number.isFinite(a.duration) && a.duration > 0) duration.value = a.duration
}

/** Plays from the outside too ("Ouvir um exemplo" of the section). */
function play() {
  const a = audio.value
  if (!a) return
  failed.value = false
  loading.value = a.readyState < 3
  a.play().catch(() => {
    loading.value = false
    if (a.error) failed.value = true
  })
}

function toggle() {
  if (audio.value && !audio.value.paused) audio.value.pause()
  else play()
}

function retry() {
  audio.value?.load()
  play()
}

function seek(ev: MouseEvent) {
  const a = audio.value
  if (!a || !wave.value) return
  const r = wave.value.getBoundingClientRect()
  const k = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
  if (Number.isFinite(a.duration)) a.currentTime = k * a.duration
  if (a.paused) play()
}

function onPlay() {
  playing.value = true
  emit('playing', true)
  if (!played) {
    played = true
    emit('firstPlay')
  }
}

function onStop() {
  playing.value = false
  loading.value = false
  emit('playing', false)
}

function onError() {
  failed.value = true
  onStop()
}

// The bars grow from the line once, when the player shows up (motion only)
let io: IntersectionObserver | null = null
onMounted(() => {
  if (!motionAllowed() || !wave.value || !('IntersectionObserver' in window)) return
  pre.value = true
  io = new IntersectionObserver(([e]) => {
    if (!e?.isIntersecting) return
    io?.disconnect()
    staggered.value = true
    requestAnimationFrame(() => { pre.value = false })
    setTimeout(() => { staggered.value = false }, 1600)
  })
  io.observe(wave.value)
})
onBeforeUnmount(() => io?.disconnect())

defineExpose({ play })
</script>
