<template>
  <div class="min-h-screen" :class="colorMode === 'dark' ? 'bg-[#0F001F]' : 'bg-[linear-gradient(180deg,#FFFFFF,#F9F7FF)]'">
    <UiPaymentBanner />
    <UiSidebar v-show="!dive.active.value" :collapsed="sidebarCollapsed" />
    <UiBottomNav v-show="!dive.active.value" />
    <UiDiveMode />

    <main class="relative min-h-screen transition-[margin] duration-200" :class="[mainPadding, dive.active.value ? '' : mainMargin]">
      <UiVerifyEmailBanner v-if="auth.user && !auth.isVerified" />
      <div class="relative">
        <slot />
      </div>
    </main>

    <UiToast />

    <!-- Heavy overlays load on first open and stay mounted (keeps leave transitions) -->
    <LazyChatDrawer v-if="chatLoaded" />
    <ChatFab />
    <UiQuickCapture />

    <PodcastMiniplayer />
    <LazyPodcastExpandedPlayer v-if="expandedPlayerLoaded" />

    <LazyUiCommandPalette v-if="paletteLoaded" />

    <LazyUiUpgradeModal
      v-if="upgradeLoaded"
      v-model="showUpgrade"
      :feature="upgradeDetail.feature"
      :used="upgradeDetail.used"
      :limit="upgradeDetail.limit"
      :plan-required="upgradeDetail.planRequired"
      :resets-at="upgradeDetail.resetsAt"
    />
  </div>
</template>

<script setup lang="ts">
import type { FeatureLimitDetail } from '~/types'

const route = useRoute()
const auth = useAuthStore()
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
const upgradeDetail = ref<FeatureLimitDetail>({ feature: '' })

const chat = useChatStore()
const paletteOpen = useCommandPaletteOpen()
const chatLoaded = useLoadedOnce(() => chat.isOpen)
const expandedPlayerLoaded = useLoadedOnce(() => player.expanded)
const paletteLoaded = useLoadedOnce(() => paletteOpen.value)
const upgradeLoaded = useLoadedOnce(() => showUpgrade.value)

const subscription = useSubscriptionStore()

onMounted(() => {
  subscription.fetchStatus().catch(() => {})

  window.addEventListener('feature-limit-reached', ((e: CustomEvent) => {
    // Full 402 detail: planRequired null means a Pro at the limit (no upgrade CTA)
    const detail = (e.detail ?? {}) as Partial<FeatureLimitDetail>
    upgradeDetail.value = {
      feature: detail.feature || '',
      used: detail.used ?? null,
      limit: detail.limit ?? null,
      planRequired: detail.planRequired === undefined ? 'pro' : detail.planRequired,
      resetsAt: detail.resetsAt ?? null,
    }
    showUpgrade.value = true
  }) as EventListener)
})
</script>
