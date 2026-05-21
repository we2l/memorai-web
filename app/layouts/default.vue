<template>
  <div class="min-h-screen bg-[#0F001F]">
    <UiPaymentBanner />
    <UiSidebar />
    <UiBottomNav />

    <main class="lg:ml-[220px] relative min-h-screen overflow-hidden" :class="mainPadding">
      <!-- Ambient Glow (subtle — atmosphere, not UI) -->
      <div class="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-[#B96A3D] blur-[180px] opacity-[0.12] pointer-events-none z-0" aria-hidden="true" />
      <div class="absolute -bottom-48 -right-48 w-[400px] h-[400px] rounded-full bg-[#4B007D] blur-[180px] opacity-[0.12] pointer-events-none z-0" aria-hidden="true" />

      <div class="relative z-10">
        <slot />
      </div>
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
const toast = useToast()
const route = useRoute()

const player = usePlayerStore()
const hasMiniplayer = computed(() => !!player.currentPodcast)
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
