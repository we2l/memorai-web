<template>
  <button
    v-if="!chat.isOpen"
    class="fixed z-40 w-14 h-14 rounded-full btn-primary !p-0 glow-primary shadow-lg"
    :class="isMobile ? 'bottom-20 right-4' : 'bottom-4 right-4'"
    aria-label="Abrir chat com IA"
    @click="chat.toggle()"
  >
    <MessageCircle :size="24" />
  </button>
</template>

<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next'

const chat = useChatStore()
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => window.removeEventListener('resize', checkMobile))
</script>
