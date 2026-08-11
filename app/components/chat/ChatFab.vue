<template>
  <button
    v-if="!chat.isOpen"
    class="fixed z-40 w-11 h-11 rounded-full bg-[var(--color-accent-primary)]/80 backdrop-blur-sm text-white shadow-lg hover:bg-[var(--color-accent-primary)] hover:scale-105 transition-all duration-150 flex items-center justify-center bottom-20 right-4 lg:bottom-6 lg:right-6"
    :aria-label="label"
    :title="label"
    @click="chat.toggle()"
  >
    <Sparkles :size="18" />
  </button>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const chat = useChatStore()
const route = useRoute()

const label = computed(() => {
  if (route.path === '/revisar') {
    const review = useReviewStore()
    if (review.showErrorDiary || review.lastRating === 1) return 'Quer que eu explique?'
    return 'Não entendeu? Pergunte'
  }
  if (route.path.startsWith('/cadernos')) return 'Perguntar sobre o caderno'
  return 'Tirar dúvida'
})
</script>
