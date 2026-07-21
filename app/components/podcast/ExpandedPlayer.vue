<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="player.expanded && player.currentPodcast" class="fixed inset-0 z-50 bg-surface flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3">
          <div class="w-10" />
          <div class="text-center">
            <p class="text-micro text-base-muted uppercase tracking-wide">Tocando de</p>
            <p class="text-small text-base-primary font-medium">{{ player.currentPodcast.topic_name ?? '' }}</p>
          </div>
          <button class="p-2 text-base-muted hover:text-base-primary rounded-lg hover:bg-[var(--border-divider)] transition-colors" aria-label="Fechar" @click="player.collapse()">
            <X :size="20" />
          </button>
        </div>

        <!-- Content (scrollable) -->
        <div class="flex-1 flex flex-col items-center justify-center px-6 gap-5 overflow-y-auto">
          <!-- Art -->
          <div class="w-40 h-40 rounded-2xl bg-surface-secondary border border-base flex items-center justify-center shrink-0">
            <Headphones :size="56" class="text-accent-primary opacity-40" />
          </div>

          <div class="text-center w-full">
            <h2 class="text-title font-serif text-base-primary">{{ player.currentPodcast.title }}</h2>
            <p class="text-small text-base-muted mt-1">
              {{ formatDate(player.currentPodcast.created_at) }}
              <span v-if="player.currentPodcast.format"> · {{ player.currentPodcast.format === 'debate' ? 'Debate' : 'Expositivo' }}</span>
            </p>
          </div>

          <!-- Seekbar -->
          <div class="w-full max-w-md">
            <input
              type="range"
              min="0"
              :max="player.duration || 100"
              :value="player.currentTime"
              class="w-full h-1.5 accent-amber-600 cursor-pointer"
              aria-label="Progresso"
              @input="onSeek"
            />
            <div class="flex justify-between text-micro text-base-muted mt-1">
              <span>{{ formatTime(player.currentTime) }}</span>
              <span>{{ formatTime(player.duration) }}</span>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-4">
            <button
              v-if="player.isPlaylist"
              class="p-2 text-base-muted hover:text-base-primary disabled:opacity-30"
              :disabled="!player.hasPrev"
              aria-label="Episódio anterior"
              @click="player.prev()"
            >
              <SkipBack :size="20" />
            </button>
            <button class="p-2 text-base-muted hover:text-base-primary" aria-label="Voltar 15s" @click="player.skip(-15)">
              <RotateCcw :size="22" />
            </button>
            <button
              class="w-14 h-14 rounded-full bg-accent-primary flex items-center justify-center"
              :aria-label="player.isPlaying ? 'Pausar' : 'Reproduzir'"
              @click="player.togglePlay()"
            >
              <Pause v-if="player.isPlaying" :size="24" class="text-base-primary" />
              <Play v-else :size="24" class="text-base-primary ml-1" />
            </button>
            <button class="p-2 text-base-muted hover:text-base-primary" aria-label="Avançar 15s" @click="player.skip(15)">
              <RotateCw :size="22" />
            </button>
            <button
              v-if="player.isPlaylist"
              class="p-2 text-base-muted hover:text-base-primary disabled:opacity-30"
              :disabled="!player.hasNext"
              aria-label="Próximo episódio"
              @click="player.next()"
            >
              <SkipForward :size="20" />
            </button>
          </div>

          <!-- Episode indicator -->
          <p v-if="player.episodeLabel" class="text-micro text-base-muted">
            Episódio {{ player.episodeLabel }}
          </p>

          <!-- Speed -->
          <div class="flex gap-2">
            <button
              v-for="rate in [0.75, 1, 1.25, 1.5, 2]"
              :key="rate"
              class="px-3 py-1 rounded-full text-micro border transition-all"
              :class="player.playbackRate === rate ? 'border-accent-primary text-accent-primary bg-accent-primary-subtle' : 'border-base text-base-muted'"
              @click="player.setRate(rate)"
            >
              {{ rate }}x
            </button>
          </div>

          <!-- Synced Flashcard -->
          <div v-if="linkedCards.length && activeCard" class="w-full max-w-sm">
            <!-- Card counter -->
            <p class="text-micro text-base-muted text-center mb-2">
              Card {{ activeCardIndex + 1 }} de {{ linkedCards.length }}
            </p>

            <!-- Flip card -->
            <div class="relative w-full h-44 perspective-1000">
              <Transition name="card-flip" mode="out-in">
                <div
                  :key="`${activeCard.id}-${isFlipped ? 'back' : 'front'}`"
                  class="absolute inset-0 p-5 rounded-xl border flex items-center justify-center text-center backface-hidden"
                  :class="isFlipped
                    ? 'bg-accent-primary-subtle border-accent-primary'
                    : 'bg-surface-secondary border-base'"
                >
                  <p
                    class="text-small leading-relaxed line-clamp-5"
                    :class="isFlipped ? 'text-accent-primary' : 'text-base-primary'"
                    v-html="sanitize(isFlipped ? (activeCard.back || '') : activeCard.front)"
                  />
                </div>
              </Transition>
            </div>

            <!-- Think progress bar -->
            <div v-if="isThinking" class="w-full h-1 bg-[var(--border-divider)] rounded-full mt-3 overflow-hidden">
              <div class="h-full bg-amber-500 transition-all duration-200 rounded-full" :style="{ width: thinkProgress + '%' }" />
            </div>

            <!-- Card dots -->
            <div class="flex justify-center gap-1.5 mt-3">
              <div
                v-for="(card, idx) in linkedCards"
                :key="card.id"
                class="w-2 h-2 rounded-full transition-all"
                :class="idx === activeCardIndex ? 'bg-accent-primary scale-125' : idx < activeCardIndex ? 'bg-accent-primary/40' : 'bg-[var(--border-divider)]'"
              />
            </div>
          </div>
        </div>

        <!-- Bottom actions -->
        <div class="flex gap-3 px-6 py-4 pb-safe border-t border-base shrink-0 mb-16 sm:mb-0">
          <button
            v-if="player.currentPodcast.audio_url"
            class="btn-secondary flex-none !py-2.5"
            aria-label="Baixar"
            :disabled="downloading"
            @click="downloadPodcast"
          >
            <Download :size="16" />
          </button>
          <NuxtLink
            v-if="linkedCards.length && player.currentPodcast.topic_id"
            :to="`/revisar?topic_id=${player.currentPodcast.topic_id}&errors_only=1`"
            class="btn-primary flex-1 justify-center items-center text-center"
            @click="player.collapse()"
          >
            Revisar cartões deste caderno
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Headphones, Play, Pause, RotateCcw, RotateCw, Download, X, SkipBack, SkipForward } from 'lucide-vue-next'

const { sanitize } = useSanitize()
const player = usePlayerStore()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && player.expanded) player.collapse()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
const downloading = ref(false)

async function downloadPodcast() {
  const podcast = player.currentPodcast
  if (!podcast || downloading.value) return
  downloading.value = true
  try {
    const { $api } = useNuxtApp()
    const { url } = await $api<{ url: string }>(`/podcasts/${podcast.id}/download`)
    const a = document.createElement('a')
    a.href = url
    a.download = `${podcast.title || 'podcast'}.mp3`
    a.click()
  } catch {
    // silent fail
  } finally {
    downloading.value = false
  }
}

interface LinkedCard {
  id: string
  front: string
  back?: string
  topic_id?: string
}

const linkedCards = ref<LinkedCard[]>([])

watch(() => player.currentPodcast?.id, async (id) => {
  linkedCards.value = []
  if (!id) return
  const cardIds = player.currentPodcast?.card_ids
  if (!cardIds?.length) return

  try {
    const { $api } = useNuxtApp()
    const cards = await Promise.all(
      cardIds.slice(0, 20).map(async (cardId: string) => {
        try {
          const res = await $api<any>(`/flashcards/${cardId}`)
          return { id: res.data.id, front: res.data.front, back: res.data.back, topic_id: res.data.topic_id }
        } catch {
          return null
        }
      }),
    )
    linkedCards.value = cards.filter(Boolean) as LinkedCard[]
  } catch {}
}, { immediate: true })

// Sync logic
const timestamps = computed(() => player.currentPodcast?.timestamps as any[] | null)

const activeSegment = computed(() => {
  if (!timestamps.value) return null
  const ms = player.currentTime * 1000
  return timestamps.value.find((t: any) => t.type === 'card' && ms >= t.start_ms && ms < t.end_ms) ?? null
})

const activeCardIndex = computed(() => activeSegment.value?.card_index ?? 0)
const activeCard = computed(() => linkedCards.value[activeCardIndex.value] ?? linkedCards.value[0])

const isFlipped = computed(() => {
  if (!activeSegment.value?.flip_ms) return false
  return player.currentTime * 1000 >= activeSegment.value.flip_ms
})

const isThinking = computed(() => {
  if (!activeSegment.value?.flip_ms) return false
  const ms = player.currentTime * 1000
  const thinkStart = activeSegment.value.flip_ms - 5400 // clock is ~5s + 400ms silence
  return ms >= thinkStart && ms < activeSegment.value.flip_ms
})

const thinkProgress = computed(() => {
  if (!isThinking.value || !activeSegment.value?.flip_ms) return 0
  const ms = player.currentTime * 1000
  const thinkStart = activeSegment.value.flip_ms - 5400
  const elapsed = ms - thinkStart
  return Math.min((elapsed / 5400) * 100, 100)
})

function onSeek(e: Event) {
  player.seek(Number((e.target as HTMLInputElement).value))
}

function formatTime(s: number): string {
  const total = Math.floor(s)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100%);
}
.perspective-1000 {
  perspective: 1000px;
}
.backface-hidden {
  backface-visibility: hidden;
}
.card-flip-enter-active, .card-flip-leave-active {
  transition: transform 0.4s ease, opacity 0.2s ease;
}
.card-flip-enter-from {
  transform: rotateY(90deg);
  opacity: 0;
}
.card-flip-leave-to {
  transform: rotateY(-90deg);
  opacity: 0;
}
</style>
