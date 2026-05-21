<template>
  <button
    v-if="!chat.isOpen"
    class="fixed z-40 rounded-full bg-[rgba(244,200,74,0.12)] border border-[rgba(244,200,74,0.25)] text-[#F4C84A] hover:bg-[rgba(244,200,74,0.18)] hover:border-[rgba(244,200,74,0.4)] shadow-lg transition-all duration-200 flex items-center justify-center group"
    :class="isMobile ? 'bottom-20 right-3 w-11 h-11' : 'bottom-6 right-6 h-11 px-3 gap-2 rounded-full'"
    :aria-label="label"
    @click="chat.toggle()"
  >
    <Sparkles :size="isMobile ? 18 : 16" />
    <span v-if="!isMobile" class="text-xs font-medium">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const chat = useChatStore()
const route = useRoute()
const isMobile = ref(false)

const label = computed(() => {
  if (route.path === '/revisar') {
    const review = useReviewStore()
    if (review.showErrorDiary || review.lastRating === 1) return 'Quer que eu explique?'
    return 'Não entendeu? Pergunte'
  }
  if (route.path.startsWith('/cadernos')) return 'Perguntar sobre o caderno'
  return 'Tirar dúvida'
})

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => window.removeEventListener('resize', checkMobile))
</script>
