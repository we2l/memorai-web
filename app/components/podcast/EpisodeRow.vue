<template>
  <li class="flex items-center gap-3 rounded-row py-2 pr-1 pl-2" :class="current && 'bg-action-subtle'" :data-testid="`episode-${podcast.id}`">
    <span v-if="generating" class="flex size-touch shrink-0 items-center justify-center" aria-hidden="true">
      <UiSpinner />
    </span>
    <span v-else-if="podcast.status === 'failed'" class="flex size-touch shrink-0 items-center justify-center text-danger" aria-hidden="true">
      <AlertCircle class="size-5" />
    </span>
    <UiIconButton
      v-else
      :icon="current && player.isPlaying ? Pause : Play"
      :label="current && player.isPlaying ? `Pausar ${podcast.title}` : `Tocar ${podcast.title}`"
      variant="subtle"
      @click="emit('toggle')"
    />

    <component
      :is="ready ? 'button' : 'div'"
      :type="ready ? 'button' : undefined"
      class="min-w-0 flex-1 rounded-row py-1 text-left"
      :aria-current="current ? 'true' : undefined"
      data-testid="episode-open"
      @click="ready && emit('open')"
    >
      <span class="block font-medium break-words text-fg-strong">{{ podcast.title }}</span>
      <span class="block text-meta text-fg-muted">{{ meta }}</span>
      <UiProgressBar v-if="ready && inProgress" class="mt-1.5 w-32" :value="percent" :label="`Ouvido de ${podcast.title}`" tone="neutral" />
    </component>

    <span v-if="ready && podcast.duration_seconds" class="shrink-0 text-meta tabular-nums text-fg-muted">{{ formatTime(podcast.duration_seconds) }}</span>
    <UiMenu :items="menu" :label="`Mais ações de ${podcast.title}`" />
  </li>
</template>

<script setup lang="ts">
// A row of the Ouvir library (prd-4e-praticar-v3 RF-F6): play/pause, the title (opens the player), where it
// stands ("ouvido 40%", "gerado esta madrugada", generating, failed with the quota given back) and ⋯ with the
// cards of the episode, the download and the delete.
import { AlertCircle, Pause, Play } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { Podcast } from '~/types'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{
  podcast: Podcast
  /** "gerado esta madrugada" (episódio da manhã of the last 24 h) */
  fresh?: boolean
  /** Show the caderno in the meta (Para hoje, Continuar) */
  withTopic?: boolean
}>()
const emit = defineEmits<{ toggle: []; open: []; delete: []; download: [] }>()

const player = usePlayerStore()
const current = computed(() => player.currentPodcast?.id === props.podcast.id)
const ready = computed(() => props.podcast.status === 'ready' && !!props.podcast.audio_url)
const generating = computed(() => ['pending', 'generating_script', 'generating_audio'].includes(props.podcast.status))
const percent = computed(() => Math.round((props.podcast.progress ?? 0) * 100))
const inProgress = computed(() => percent.value > 0 && percent.value < 95 && !props.podcast.completed_at)
const cards = computed(() => episodeCardsCount(props.podcast))

const STATUS: Record<string, string> = {
  pending: 'Na fila',
  generating_script: 'Escrevendo o roteiro',
  generating_audio: 'Gravando o áudio',
}

const meta = computed(() => {
  const p = props.podcast
  if (generating.value) return `${STATUS[p.status]}…`
  if (p.status === 'failed') return 'Não deu certo. O episódio não contou na sua cota.'
  const parts: string[] = []
  if (props.withTopic && p.topic_name) parts.push(p.topic_name)
  if (p.topic_in_trash) parts.push('caderno na lixeira')
  if (cards.value) parts.push(plural(cards.value, 'card', 'cards'))
  if (props.fresh) parts.push('gerado esta madrugada')
  if (p.completed_at) parts.push('ouvido até o fim')
  else if (inProgress.value) parts.push(`ouvido ${percent.value}%`)
  else if (!props.fresh) parts.push(relativeDate(p.created_at))
  return parts.join(' · ')
})

const menu = computed<MenuItem[]>(() => [
  ...(ready.value && cards.value ? [{ label: `Revisar ${cards.value === 1 ? 'o card' : `os ${cards.value} cards`}`, meta: 'deste episódio', to: reviewPath({ type: 'podcast', id: props.podcast.id }) }] : []),
  ...(ready.value ? [{ label: 'Baixar o áudio', onSelect: () => emit('download') }] : []),
  { label: 'Excluir', tone: 'danger' as const, separator: ready.value, onSelect: () => emit('delete') },
])
</script>
