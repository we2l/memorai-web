<template>
  <div class="min-h-screen" :class="colorMode === 'dark' ? 'bg-[#0F001F]' : 'bg-[linear-gradient(180deg,#FFFFFF,#F9F7FF)]'">
    <UiPaymentBanner />
    <UiSidebar v-show="!dive.active.value" :collapsed="sidebarCollapsed" />
    <UiBottomNav v-show="!dive.active.value" />
    <UiDiveMode />

    <main class="relative min-h-screen transition-[margin] duration-200" :class="[mainPadding, dive.active.value ? '' : mainMargin]">
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

    <UiCommandPalette />

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
const { colorMode } = useColorMode()

const player = usePlayerStore()
const hasMiniplayer = computed(() => !!player.currentPodcast)
const mainPadding = computed(() => {
  if (hasMiniplayer.value) return 'pb-36 lg:pb-20'
  return 'pb-20 lg:pb-0'
})

const sidebarCollapsed = computed(() => route.path.startsWith('/cadernos'))
const mainMargin = computed(() => sidebarCollapsed.value ? 'lg:ml-16' : 'lg:ml-[240px]')

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
