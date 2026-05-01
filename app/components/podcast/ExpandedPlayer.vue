<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="player.expanded && player.currentPodcast" class="fixed inset-0 z-50 bg-surface flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3">
          <button class="p-2 text-base-muted" aria-label="Minimizar" @click="player.collapse()">
            <ChevronDown :size="22" />
          </button>
          <div class="text-center">
            <p class="text-micro text-base-muted uppercase tracking-wide">Tocando de</p>
            <p class="text-small text-base-primary font-medium">{{ player.currentPodcast.topic_name ?? '' }}</p>
          </div>
          <div class="w-10" />
        </div>

        <!-- Art -->
        <div class="flex-1 flex flex-col items-center justify-center px-6 gap-6 overflow-hidden">
          <div class="w-48 h-48 rounded-2xl bg-surface-secondary border border-base flex items-center justify-center">
            <Headphones :size="64" class="text-accent-primary opacity-40" />
          </div>

          <div class="text-center w-full">
            <h2 class="text-title font-serif text-base-primary">{{ player.currentPodcast.title }}</h2>
            <p class="text-small text-base-muted mt-1">{{ formatDate(player.currentPodcast.created_at) }}</p>
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
          <div v-if="cardIds.length" class="w-full max-w-md">
            <p class="text-micro text-accent-primary uppercase tracking-wide mb-2">Flashcards vinculados · {{ cardIds.length }} cartões</p>
            <div class="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
              <div
                v-for="cardId in cardIds"
                :key="cardId"
                class="shrink-0 w-56 p-3 rounded-xl bg-surface-secondary border border-base snap-start"
              >
                <p class="text-small text-base-primary line-clamp-3">{{ cardId }}</p>
                <div class="flex gap-2 mt-2">
                  <NuxtLink :to="`/topics?note_card=${cardId}`" class="text-micro text-accent-primary hover:underline">Ver Nota</NuxtLink>
                  <NuxtLink :to="`/review?card_id=${cardId}`" class="text-micro text-accent-primary hover:underline">Revisar</NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom actions -->
        <div class="flex gap-3 px-6 py-4 border-t border-base">
          <a
            v-if="player.currentPodcast.audio_url"
            :href="`${apiBase}/podcasts/${player.currentPodcast.id}/download`"
            class="btn-secondary flex-none !py-2.5"
            download
          >
            <Download :size="16" />
          </a>
          <NuxtLink
            v-if="cardIds.length"
            :to="`/review?card_ids=${cardIds.join(',')}`"
            class="btn-primary flex-1 justify-center"
            @click="player.collapse()"
          >
            Revisar todos os cartões
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ChevronDown, Headphones, Play, Pause, RotateCcw, RotateCw, Download } from 'lucide-vue-next'

const player = usePlayerStore()
const { public: { apiBase } } = useRuntimeConfig()

const cardIds = computed(() => player.currentPodcast?.card_ids ?? [])

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
