<template>
  <div class="min-h-screen bg-surface">
    <UiPaymentBanner />
    <UiSidebar v-show="!dive.active.value" />
    <UiBottomNav v-show="!dive.active.value" />
    <UiDiveMode />

    <main class="relative min-h-screen transition-[margin] duration-500" :class="[mainPadding, dive.active.value ? '' : 'lg:ml-[240px]']">
      <div class="relative">
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
const dive = useDiveMode()

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
