<template>
  <!-- The podcast paywall's demo: the real sample with sound, not a muted screen recording (the shrunk video was
       unreadable and did not let anyone hear the pause to remember). Downloads only on play (preload none). -->
  <figure class="flex w-full flex-col gap-3 rounded-tile bg-soft p-4" data-testid="podcast-sample">
    <div class="flex items-center gap-3">
      <!-- Neutral play: the page's purple stays on its own primary (one per screen) -->
      <button
        type="button"
        class="flex size-12 shrink-0 items-center justify-center rounded-full bg-fg-strong text-raised transition-transform duration-press active:scale-97 motion-reduce:active:scale-100"
        :aria-label="playing ? 'Pausar o exemplo' : 'Ouvir um exemplo'"
        :aria-busy="loading ? 'true' : undefined"
        data-testid="podcast-sample-play"
        @click="toggle"
      >
        <UiSpinner v-if="loading" />
        <Pause v-else-if="playing" class="size-5 fill-current" aria-hidden="true" />
        <Play v-else class="ml-0.5 size-5 fill-current" aria-hidden="true" />
      </button>
      <div class="min-w-0">
        <p class="text-body font-semibold text-fg-strong">{{ PODCAST_SAMPLE.title }}</p>
        <p class="text-meta text-fg-muted">
          {{ PODCAST_SAMPLE.topic }} ·
          <span class="tabular-nums" data-testid="podcast-sample-time">{{ sampleClock(time) }} / {{ sampleClock(duration) }}</span>
        </p>
      </div>
    </div>

    <UiProgressBar :value="time" :max="duration" size="sm" tone="neutral" label="Tempo do exemplo" />

    <ol class="flex flex-col gap-1" aria-label="Transcrição do exemplo" data-testid="podcast-sample-lines">
      <li
        v-for="{ line, i } in shown"
        :key="line.t"
        class="rounded-row px-2 py-1 text-body-sm transition-colors duration-fast"
        :class="started && i === current ? 'bg-raised text-fg-strong shadow-1' : line.kind === 'pause' ? 'text-fg-muted' : 'text-fg'"
        :aria-current="started && i === current ? 'true' : undefined"
      >
        {{ line.text }}
      </li>
    </ol>

    <p v-if="failed" class="flex flex-wrap items-center gap-2 text-meta text-fg" role="alert" data-testid="podcast-sample-error">
      Não deu para tocar o exemplo agora.
      <UiButton size="sm" variant="ghost" @click="retry">Tentar de novo</UiButton>
    </p>
    <figcaption v-else class="text-meta text-fg-muted">
      Pergunta, uma pausa para você lembrar e a resposta. Seus episódios saem dos cards que você mais erra. Voz sintética.
    </figcaption>

    <audio
      ref="audio"
      preload="none"
      :src="PODCAST_SAMPLE.src"
      @play="onPlay"
      @playing="loading = false"
      @waiting="loading = true"
      @pause="onStop"
      @ended="onStop"
      @timeupdate="sync"
      @loadedmetadata="sync"
      @error="onError"
    />
  </figure>
</template>

<script setup lang="ts">
// The podcast paywall (prd-planos-lancamento RF-F3): who is not on the paid plan (Free and the trial) hears what an
// episode is instead of generating one. `compact` (the Ouvir card of /praticar) shows only the line being spoken.
import { Pause, Play } from 'lucide-vue-next'
import { PODCAST_SAMPLE, sampleClock, sampleLineAt } from '~/utils/podcastSample'

const props = defineProps<{ compact?: boolean, source: 'generate_sheet' | 'praticar' | 'upgrade_modal' }>()

const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const loading = ref(false)
const failed = ref(false)
const started = ref(false)
const time = ref(0)
const duration = ref(PODCAST_SAMPLE.duration)

const current = computed(() => sampleLineAt(time.value))
const shown = computed(() => {
  const all = PODCAST_SAMPLE.lines.map((line, i) => ({ line, i }))
  return props.compact ? all.slice(current.value, current.value + 1) : all
})

function sync() {
  const a = audio.value
  if (!a) return
  time.value = a.currentTime
  if (Number.isFinite(a.duration) && a.duration > 0) duration.value = a.duration
}

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

function onPlay() {
  playing.value = true
  if (!started.value) {
    started.value = true
    useAnalytics().track('podcast_sample_played', { source: props.source })
  }
}

function onStop() {
  playing.value = false
  loading.value = false
}

function onError() {
  failed.value = true
  onStop()
}
</script>
