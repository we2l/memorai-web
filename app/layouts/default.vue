<template>
  <div class="min-h-screen bg-surface">
    <UiPaymentBanner />
    <UiSidebar />
    <UiBottomNav />

    <main class="lg:ml-[220px] relative" :class="mainPadding">
      <div class="absolute top-3 z-10" :class="showThemeToggle === 'side' ? 'right-3' : 'left-1/2 -translate-x-1/2'">
        <button
          class="p-2 rounded-lg text-base-muted hover:text-accent-primary hover:bg-surface-tertiary/50 transition-colors"
          :title="colorMode === 'dark' ? 'Modo claro' : 'Modo escuro'"
          aria-label="Alternar tema"
          @click="toggle"
        >
          <Sun v-if="colorMode === 'dark'" :size="20" :stroke-width="1.5" />
          <Moon v-else :size="20" :stroke-width="1.5" />
        </button>
      </div>
      <slot />
    </main>

    <UiToast
      :message="toast.state.message"
      :type="toast.state.type"
      :visible="toast.state.visible"
    />

    <ChatDrawer />
    <ChatFab />
    <UiQuickCapture />

    <PodcastMiniplayer />
    <PodcastExpandedPlayer />

    <UiUpgradeModal
      v-model="showUpgrade"
      :feature="upgradeFeature"
      :plan-required="upgradePlan"
    />
  </div>
</template>

<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'

const toast = useToast()
const { colorMode, toggle } = useColorMode()
const route = useRoute()

const showThemeToggle = computed(() => {
  const path = route.path
  if (path === '/revisar' || path === '/grafo') return 'side'
  return 'center'
})

const player = usePlayerStore()
const hasMiniplayer = computed(() => !!player.currentPodcast)
// pb-20 = bottom nav (mobile), +16 = miniplayer extra space
const mainPadding = computed(() => {
  if (hasMiniplayer.value) return 'pb-36 lg:pb-20'
  return 'pb-20 lg:pb-0'
})

const showUpgrade = ref(false)
const upgradeFeature = ref('')
const upgradePlan = ref('pro')

const subscription = useSubscriptionStore()

onMounted(() => {
  subscription.fetchStatus().catch(() => {})

  window.addEventListener('feature-limit-reached', ((e: CustomEvent) => {
    upgradeFeature.value = e.detail?.feature || ''
    upgradePlan.value = e.detail?.planRequired || 'pro'
    showUpgrade.value = true
  }) as EventListener)
})
</script>
