<template>
  <div class="relative flex min-h-0 flex-col" data-testid="podcast-transcript">
    <h3 :id="headingId" class="mb-2 text-meta font-semibold text-fg-strong">Transcrição</h3>
    <p v-if="!lines.length" class="text-meta text-fg-muted">{{ loading ? 'Carregando a transcrição…' : 'A transcrição deste episódio não está disponível.' }}</p>
    <!-- aria-live off: the text never speaks by itself; the current line is aria-current, and a click seeks -->
    <ol
      v-else
      ref="list"
      :aria-labelledby="headingId"
      aria-live="off"
      class="-mx-2 flex max-h-80 flex-col gap-1 overflow-y-auto px-2 pb-2"
      @wheel.passive="manual"
      @touchmove.passive="manual"
      @scroll.passive="onScroll"
    >
      <li v-for="(line, i) in lines" :key="i" :data-line="i">
        <button
          type="button"
          class="w-full rounded-row px-2 py-1.5 text-left text-body transition-colors duration-fast hover:bg-hover"
          :class="i === active ? 'bg-action-subtle text-fg-strong' : 'text-fg'"
          :aria-current="i === active ? 'true' : undefined"
          @click="seek(line)"
        >
          <span v-if="line.speaker" class="mr-1.5 text-label font-semibold uppercase text-fg-muted">{{ line.speaker }}</span>
          <span class="sr-only">, em {{ formatTime(line.start_ms / 1000) }}: </span>
          {{ line.text }}
        </button>
      </li>
    </ol>
    <div v-if="!follow && lines.length" class="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
      <UiButton size="sm" class="pointer-events-auto shadow-2" @click="backToCurrent">Voltar ao trecho atual</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Transcript of an episode (prd-4e-praticar-v3 RF-F7): the lines of GET /podcasts/{id} `transcript`, the
// current one marked (aria-current) and kept in view while the audio plays, unless the person scrolls by
// hand ("Voltar ao trecho atual" brings the follow back). Clicking a line seeks the audio to it.
import type { PodcastTranscriptLine } from '~/types'

const props = defineProps<{
  lines: PodcastTranscriptLine[]
  /** Position of the audio, in ms */
  currentMs: number
  loading?: boolean
}>()
const emit = defineEmits<{ seek: [seconds: number] }>()

const headingId = useId()
const list = ref<HTMLElement | null>(null)
const follow = ref(true)
const reduced = useReducedMotion()

/** The line under the audio: the last one that started (a gap between lines keeps the previous). */
const active = computed(() => {
  const ms = props.currentMs
  let found = -1
  for (let i = 0; i < props.lines.length; i++) {
    if (props.lines[i]!.start_ms <= ms) found = i
    else break
  }
  return found
})

let programmatic = 0
function scrollToActive(smooth: boolean) {
  const box = list.value
  const item = box?.querySelector<HTMLElement>(`[data-line="${active.value}"]`)
  if (!box || !item) return
  programmatic = Date.now()
  box.scrollTo({ top: Math.max(0, item.offsetTop - box.offsetTop - box.clientHeight / 3), behavior: smooth && !reduced.value ? 'smooth' : 'auto' })
}

watch(active, () => { if (follow.value) nextTick(() => scrollToActive(true)) })
watch(() => props.lines.length, (n) => { if (n) nextTick(() => scrollToActive(false)) }, { immediate: true })

function manual() {
  follow.value = false
}
function onScroll() {
  // Our own smooth scroll fires scroll events for a while; only the rest is the person's
  if (Date.now() - programmatic > 800) follow.value = false
}

function backToCurrent() {
  follow.value = true
  scrollToActive(true)
}

function seek(line: PodcastTranscriptLine) {
  useAnalytics().track('podcast_transcript_seek', {})
  follow.value = true
  emit('seek', line.start_ms / 1000)
}
</script>
