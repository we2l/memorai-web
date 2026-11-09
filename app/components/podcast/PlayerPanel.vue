<template>
  <div v-if="podcast" class="flex min-h-0 flex-col gap-5" data-testid="player-panel">
    <div class="flex items-center gap-4">
      <span class="flex size-18 shrink-0 items-center justify-center rounded-card bg-soft" aria-hidden="true">
        <picture class="contents">
          <source srcset="~/assets/mascots/mascot-baigi-podcast.avif" type="image/avif">
          <img src="~/assets/mascots/mascot-baigi-podcast.webp" alt="" class="size-15 object-contain" width="60" height="60" loading="lazy" decoding="async">
        </picture>
      </span>
      <div class="min-w-0">
        <component :is="titleTag" class="text-section break-words text-fg-strong">{{ podcast.title }}</component>
        <p class="text-meta text-fg-muted">{{ meta }}</p>
      </div>
    </div>

    <div>
      <input
        type="range"
        min="0"
        :max="duration || 1"
        step="1"
        :value="Math.min(player.currentTime, duration || 0)"
        class="-my-3.5 h-11 w-full cursor-pointer accent-fg-strong"
        aria-label="Posição no episódio"
        :aria-valuetext="`${formatTime(player.currentTime)} de ${formatTime(duration)}`"
        @input="onSeek"
      >
      <div class="mt-1 flex justify-between text-label tabular-nums text-fg-muted">
        <span>{{ formatTime(player.currentTime) }}</span>
        <span><span class="sr-only">faltam </span>−{{ formatTime(Math.max(0, duration - player.currentTime)) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-center gap-4">
      <UiIconButton :icon="RotateCcw" label="Voltar 15 segundos" @click="player.skip(-15)" />
      <!-- The primary of the player: play/pause (neutral beside the page's own primary, one purple per screen) -->
      <button
        type="button"
        class="flex size-16 items-center justify-center rounded-full transition-colors duration-fast active:translate-y-0.5"
        :class="primary ? 'bg-action text-on-action shadow-action hover:bg-action-hover active:scale-97 motion-reduce:active:scale-100' : 'bg-fg-strong text-raised'"
        :aria-label="player.isPlaying ? 'Pausar' : 'Tocar'"
        data-testid="player-toggle"
        @click="toggle"
      >
        <Pause v-if="player.isPlaying" class="size-6 fill-current" aria-hidden="true" />
        <Play v-else class="ml-1 size-6 fill-current" aria-hidden="true" />
      </button>
      <UiIconButton :icon="RotateCw" label="Avançar 15 segundos" @click="player.skip(15)" />
      <UiSelect :model-value="String(player.playbackRate)" :options="RATES" label="Velocidade" hide-label class="w-24" @update:model-value="player.setRate(Number($event))" />
    </div>

    <!-- The cards the episode talked about (scope=podcast:), also when it ends -->
    <p v-if="episodeCards > 0" class="text-body text-fg" :role="player.hasEnded ? 'status' : undefined" data-testid="player-review">
      <template v-if="player.hasEnded">Episódio concluído. </template>
      Cards deste episódio:
      <UiLink :to="reviewPath({ type: 'podcast', id: podcast.id })" @click="player.collapse()">
        revisar {{ episodeCards === 1 ? 'o card' : `os ${episodeCards}` }} agora →
      </UiLink>
    </p>

    <PodcastTranscript :lines="lines" :current-ms="player.currentTime * 1000" :loading="loadingTranscript" class="min-h-0" @seek="player.seek($event)" />

    <div class="flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <UiButton size="sm" variant="ghost" :icon-left="Download" :loading="downloading" @click="download">Baixar o áudio</UiButton>
    </div>
  </div>
</template>

<script lang="ts">
import type { Podcast, PodcastTranscriptLine } from '~/types'

/** GET /podcasts/{id} with the transcript, once per episode in the session (module level: survives the sheet) */
const transcripts = new Map<string, PodcastTranscriptLine[]>()
async function loadTranscript(id: string): Promise<PodcastTranscriptLine[]> {
  const known = transcripts.get(id)
  if (known) return known
  const { $api } = useNuxtApp()
  const res = await $api<{ data: Podcast }>(`/podcasts/${id}`)
  const lines = res.data.transcript ?? []
  transcripts.set(id, lines)
  return lines
}

</script>

<script setup lang="ts">
// The player of an episode (prd-4e-praticar-v3 RF-F7, canvas OuvirV2): cover with the podcast mascot,
// progress with elapsed and remaining time, −15 s / play-pause (the primary) / +15 s, speed, the transcript
// of GET /podcasts/{id} (current line marked, click seeks) and "revisar os N agora" (scope=podcast:). Used
// as a column of /podcasts on the desktop and inside the expanded sheet (ExpandedPlayer) everywhere else.
// No teaser CTA since the planos de lançamento: the Free makes no preview (the paywall shows the demo video).
import { Download, Pause, Play, RotateCcw, RotateCw } from 'lucide-vue-next'
import { reviewPath } from '~/utils/reviewScope'

withDefaults(defineProps<{
  titleTag?: 'h2' | 'h3' | 'p'
  /** The play button is the purple primary (in the sheet); false beside a page that has its own */
  primary?: boolean
}>(), { titleTag: 'h2', primary: true })

const player = usePlayerStore()
const podcast = computed(() => player.currentPodcast)
const duration = computed(() => player.duration || podcast.value?.duration_seconds || 0)
const episodeCards = computed(() => episodeCardsCount(podcast.value))

const RATES = [1, 1.25, 1.5, 2].map(r => ({ value: String(r), label: `${String(r).replace('.', ',')}×` }))

const meta = computed(() => {
  const p = podcast.value
  if (!p) return ''
  const cards = p.card_ids?.length ?? p.source_data?.card_count ?? 0
  return [p.topic_name, cards ? plural(cards, 'card', 'cards') : null].filter(Boolean).join(' · ')
})

// The transcript, loaded once per episode when the player opens (RF-B8)
const lines = shallowRef<PodcastTranscriptLine[]>([])
const loadingTranscript = ref(false)
watch(() => podcast.value?.id, async (id) => {
  lines.value = []
  if (!id) return
  loadingTranscript.value = true
  try {
    const transcript = await loadTranscript(id)
    if (player.currentPodcast?.id === id) lines.value = transcript
    useAnalytics().track('podcast_transcript_open', {})
  } catch (e) {
    reportApiError(e, { silent: true })
  } finally {
    loadingTranscript.value = false
  }
}, { immediate: true })

function toggle() {
  player.togglePlay()
}

function onSeek(e: Event) {
  player.seek(Number((e.target as HTMLInputElement).value))
}

const downloading = ref(false)
async function download() {
  const p = podcast.value
  if (!p || downloading.value) return
  downloading.value = true
  try {
    const { $api } = useNuxtApp()
    const { url } = await $api<{ url: string }>(`/podcasts/${p.id}/download`)
    const a = document.createElement('a')
    a.href = url
    a.download = `${p.title || 'podcast'}.mp3`
    a.click()
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível baixar o áudio.' })
  } finally {
    downloading.value = false
  }
}
</script>
