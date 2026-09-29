<template>
  <div class="min-h-screen bg-[var(--bg-base)]">
    <UiPaymentBanner />
    <UiSidebar v-show="!dive.active.value" :collapsed="sidebarCollapsed" />
    <UiBottomNav v-show="!dive.active.value && !focusChrome" />
    <UiDiveMode />

    <main class="app-main relative min-h-screen transition-[margin] duration-200" :class="[dive.active.value ? '' : mainMargin]">
      <UiVerifyEmailBanner v-if="auth.user && !auth.isVerified" />
      <div class="relative">
        <slot />
      </div>
    </main>

    <UiToast />

    <!-- Heavy overlays load on first open and stay mounted (keeps leave transitions) -->
    <LazyChatDrawer v-if="chatLoaded" />
    <ChatFab v-if="!focusChrome" />
    <UiQuickCapture v-if="!focusChrome" />

    <PodcastMiniplayer v-if="!focusChrome" />
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

const player = usePlayerStore()
const hasMiniplayer = computed(() => !!player.currentPodcast)

const sidebarCollapsed = computed(() => route.path.startsWith('/cadernos'))
const mainMargin = computed(() => sidebarCollapsed.value ? 'lg:ml-16' : 'lg:ml-[240px]')

// Pages opt into a distraction-free chrome with definePageMeta({ chrome: 'focus' })
const focusChrome = computed(() => route.meta.chrome === 'focus')
const stickyActionH = useState<number>('sticky-action-h', () => 0)

// Chrome vars live on :root (toasts and FABs are teleported to body)
watchEffect(() => {
  if (!import.meta.client) return
  const root = document.documentElement
  if (focusChrome.value) root.dataset.chrome = 'focus'
  else delete root.dataset.chrome
  root.style.setProperty('--miniplayer-h-set', hasMiniplayer.value ? '56px' : '0px')
  root.style.setProperty('--sidebar-w-set', dive.active.value ? '0px' : (sidebarCollapsed.value ? '64px' : '240px'))
  root.style.setProperty('--sticky-action-h-set', `${stickyActionH.value}px`)
})

onBeforeUnmount(() => {
  const root = document.documentElement
  delete root.dataset.chrome
  for (const v of ['--miniplayer-h-set', '--sidebar-w-set', '--sticky-action-h-set']) root.style.removeProperty(v)
})

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
  subscription.fetchStatus().catch((e: unknown) => reportApiError(e, { silent: true }))

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

<style scoped>
.app-main {
  padding-bottom: calc(var(--nav-h) + var(--miniplayer-h) + var(--sticky-action-h) + 16px);
}
@media (min-width: 1024px) {
  .app-main {
    padding-bottom: var(--miniplayer-h);
  }
}
:root[data-chrome="focus"] .app-main {
  padding-bottom: 0;
}
</style>
