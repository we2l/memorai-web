<template>
  <div class="ec-panel" data-testid="entry-player">
    <div class="ec-line">
      <img :src="LISTENING" width="272" height="399" alt="" decoding="async" class="ec-listen">
      <div>
        <strong>{{ ENTRY_SAMPLE.title }}</strong>
        <p class="ec-meta">
          Exemplo · {{ ENTRY_SAMPLE.topic }} ·
          <span class="ec-tabular" data-testid="entry-player-time">{{ loading ? 'carregando…' : `${clock(time)} / ${clock(duration)}` }}</span>
        </p>
      </div>
    </div>
    <div class="ec-line">
      <button
        type="button"
        class="ec-play"
        :aria-label="playing || loading ? 'Pausar o exemplo' : 'Ouvir o exemplo'"
        :aria-busy="loading ? 'true' : undefined"
        data-testid="entry-player-play"
        @click="toggle"
      >
        <Pause v-if="playing || loading" class="ec-fill" aria-hidden="true" />
        <Play v-else class="ec-fill" aria-hidden="true" />
      </button>
      <div class="ec-wave" aria-hidden="true">
        <i v-for="(h, i) in ENTRY_SAMPLE.bars" :key="i" :style="{ '--h': h }" :data-on="String(i < cursor)" />
      </div>
    </div>
    <ol class="ec-said" aria-label="Transcrição do exemplo" data-testid="entry-player-lines">
      <li v-for="(line, i) in ENTRY_SAMPLE.lines" :key="line.t" :aria-current="started && i === current ? 'true' : undefined">
        <!-- The pause, while it plays: "Responda de cabeça" and the number of the tick (4, 3, 2, 1) -->
        <span v-if="i === current && countdown !== null" class="ec-count-line" data-testid="entry-player-countdown">
          Responda de cabeça<span class="ec-count" aria-hidden="true">{{ countdown }}</span>
        </span>
        <template v-else>{{ line.text }}</template>
      </li>
    </ol>
    <!-- Said once when the pause starts; the numbers stay out of the screen reader (one a second would be noise) -->
    <p class="ec-sr" aria-live="polite">{{ countdown !== null ? 'Responda de cabeça' : '' }}</p>
    <p v-if="failed" class="ec-err" role="alert" data-testid="entry-player-error">
      Não deu para tocar o áudio agora.
      <button type="button" @click="retry">Tentar de novo</button>
    </p>
    <p v-else class="ec-meta">Pergunta, uma pausa para você lembrar e a resposta. Voz sintética.</p>
    <audio
      ref="audio"
      preload="none"
      :src="ENTRY_SAMPLE.src"
      @play="onPlay"
      @playing="loading = false"
      @waiting="loading = true"
      @pause="onStop"
      @ended="onStop"
      @timeupdate="sync"
      @loadedmetadata="sync"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
// The real podcast sample on step 5 (prd-entrada-comecar RF-F16, RN-5): the same file as the landing and the paywall,
// downloaded only on play (preload none, out of the precache), the line being spoken marked (the pause counts 4, 3, 2, 1
// with the ticks of the file), loading and failure.
import { Pause, Play } from 'lucide-vue-next'
import { ENTRY_SAMPLE, clock, entryCountdownAt, sampleLineAt } from '~/utils/entrada'

// Bound, not a static src (it would become an asset import)
const LISTENING = '/mascote/ouvindo.svg'
const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const loading = ref(false)
const failed = ref(false)
const started = ref(false)
const time = ref(0)
const duration = ref(ENTRY_SAMPLE.duration)
let played = false

const current = computed(() => sampleLineAt(time.value))
const countdown = computed(() => entryCountdownAt(time.value))
const cursor = computed(() => Math.floor((time.value / duration.value) * ENTRY_SAMPLE.bars.length))

function sync() {
  const a = audio.value
  if (!a) return
  time.value = a.currentTime
  if (Number.isFinite(a.duration) && a.duration > 0) duration.value = a.duration
}

function toggle() {
  const a = audio.value
  if (!a) return
  if (playing.value || loading.value) {
    a.pause()
    return
  }
  failed.value = false
  loading.value = true
  a.play().catch(onError)
}

function onPlay() {
  playing.value = true
  started.value = true
  if (!played) {
    played = true
    useAnalytics().track('entry_sample_played', {})
  }
}

function onStop() {
  playing.value = false
  loading.value = false
}

function onError() {
  onStop()
  failed.value = true
}

function retry() {
  audio.value?.load()
  toggle()
}

onBeforeUnmount(() => audio.value?.pause())
</script>
