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
          <button class="p-2 text-base-muted hover:text-base-primary rounded-lg hover:bg-surface-tertiary transition-colors" aria-label="Fechar" @click="player.collapse()">
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
          <div class="flex items-center gap-6">
            <button class="p-2 text-base-muted hover:text-base-primary" aria-label="Voltar 15s" @click="player.skip(-15)">
              <RotateCcw :size="22" />
            </button>
            <button
              class="w-14 h-14 rounded-full bg-accent-primary flex items-center justify-center"
              :aria-label="player.isPlaying ? 'Pausar' : 'Reproduzir'"
              @click="player.togglePlay()"
            >
              <Pause v-if="player.isPlaying" :size="24" class="text-white" />
              <Play v-else :size="24" class="text-white ml-1" />
            </button>
            <button class="p-2 text-base-muted hover:text-base-primary" aria-label="Avançar 15s" @click="player.skip(15)">
              <RotateCw :size="22" />
            </button>
          </div>

          <!-- Speed -->
          <div class="flex gap-2">
            <button
              v-for="rate in [0.75, 1, 1.25, 1.5]"
              :key="rate"
              class="px-3 py-1 rounded-full text-micro border transition-all"
              :class="player.playbackRate === rate ? 'border-accent-primary text-accent-primary bg-accent-primary-subtle' : 'border-base text-base-muted'"
              @click="player.setRate(rate)"
            >
              {{ rate }}x
            </button>
          </div>

          <!-- Cards carousel -->
          <div v-if="linkedCards.length" class="w-full max-w-md pb-4">
            <p class="text-micro text-accent-primary uppercase tracking-wide mb-2">Flashcards vinculados · {{ linkedCards.length }} cartões</p>
            <div class="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
              <div
                v-for="card in linkedCards"
                :key="card.id"
                class="shrink-0 w-64 p-4 rounded-xl bg-surface-secondary border border-base snap-start"
              >
                <p class="text-small text-base-primary line-clamp-3 card-front-preview" v-html="card.front" />
                <div class="flex gap-3 mt-3">
                  <NuxtLink
                    v-if="card.topic_id"
                    :to="`/topics?topic=${card.topic_id}&tab=cards&highlight=${card.id}`"
                    class="text-micro text-accent-primary hover:underline"
                    @click="player.collapse()"
                  >
                    Ver card no caderno
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom actions -->
        <div class="flex gap-3 px-6 py-4 border-t border-base shrink-0">
          <a
            v-if="player.currentPodcast.audio_url"
            :href="`${apiBase}/podcasts/${player.currentPodcast.id}/download`"
            class="btn-secondary flex-none !py-2.5"
            aria-label="Baixar"
          >
            <Download :size="16" />
          </a>
          <NuxtLink
            v-if="linkedCards.length && player.currentPodcast.topic_id"
            :to="`/review?topic_id=${player.currentPodcast.topic_id}&errors_only=1`"
            class="btn-primary flex-1 justify-center"
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
import { Headphones, Play, Pause, RotateCcw, RotateCw, Download, X } from 'lucide-vue-next'

const player = usePlayerStore()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && player.expanded) player.collapse()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
const { public: { apiBase } } = useRuntimeConfig()

interface LinkedCard {
  id: string
  front: string
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
    // Fetch each card's basic info
    const cards = await Promise.all(
      cardIds.slice(0, 10).map(async (cardId: string) => {
        try {
          const res = await $api<any>(`/flashcards/${cardId}`)
          return { id: res.data.id, front: res.data.front, topic_id: res.data.topic_id }
        } catch {
          return null
        }
      }),
    )
    linkedCards.value = cards.filter(Boolean) as LinkedCard[]
  } catch {}
}, { immediate: true })

function onSeek(e: Event) {
  player.seek(Number((e.target as HTMLInputElement).value))
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
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
</style>
