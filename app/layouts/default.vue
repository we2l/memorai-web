<template>
  <div class="min-h-dvh bg-page">
    <LazyUiPaymentBanner v-if="subscription.isPastDue || subscription.inGracePeriod" />
    <ShellTopNav v-show="showChrome" />

    <main class="relative" :class="focusChrome ? '' : 'pb-[calc(var(--nav-h)+var(--miniplayer-h)+var(--sticky-action-h)+16px)]'">
      <ShellPageTools v-if="showChrome" />
      <LazyUiVerifyEmailBanner v-if="auth.user && !auth.isVerified" :modal-only="focusChrome || route.path === '/configuracoes'" />
      <slot />
    </main>

    <ShellBottomNav v-show="showChrome" />
    <ShellToastHost />

    <!-- Part of the shell: keeps playing while the person moves between the places -->
    <LazyShellMiniPlayer v-if="hasMiniplayer && !focusChrome" />

    <!-- Heavy overlays load on first open and stay mounted (keeps leave transitions) -->
    <LazyChatDrawer v-if="chatLoaded" />
    <LazyPodcastExpandedPlayer v-if="expandedPlayerLoaded" />
    <LazyShellCommandPalette v-if="paletteLoaded" />
    <LazyShellAddSheet v-if="addLoaded" />
    <LazyQuestionPasteSheet v-if="pasteLoaded" />
    <LazyBacklogPlanSheet v-if="backlogLoaded" />

    <LazyUiUpgradeModal
      v-if="upgradeLoaded"
      v-model="showUpgrade"
      :feature="upgradeDetail.feature"
      :used="upgradeDetail.used"
      :limit="upgradeDetail.limit"
      :plan-required="upgradeDetail.planRequired"
      :resets-at="upgradeDetail.resetsAt"
      :lifetime="upgradeDetail.lifetime"
    />
  </div>
</template>

<script setup lang="ts">
// App shell v3 (prd-navegacao-v3, ADR-027 §7): TopNav from 768 px, BottomNav below it (4 places, no
// "Mais"), the phone header tools, the mini-player, the toasts and the overlays of the shell (search,
// "+ Adicionar", tira-dúvidas). Pages opt into a distraction-free chrome with
// definePageMeta({ chrome: 'focus' }) (revisão): the whole shell hides.
import type { FeatureLimitDetail } from '~/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const player = usePlayerStore()

const focusChrome = computed(() => route.meta.chrome === 'focus')
const showChrome = computed(() => !focusChrome.value)
const hasMiniplayer = computed(() => !!player.currentPodcast)
const stickyActionH = useState<number>('sticky-action-h', () => 0)

// Shell measures live on :root (tokens.css): toasts, the mini-player and sticky bars are teleported
watchEffect(() => {
  if (!import.meta.client) return
  const root = document.documentElement
  if (focusChrome.value) root.dataset.chrome = 'focus'
  else delete root.dataset.chrome
  // Mini-player card (60 px) + its 8 px gap; on desktop it floats in the corner over the page bottom
  // + the "Revisar os N do episódio" row when the episode ended (F2)
  const endedRow = player.hasEnded && episodeCardsCount(player.currentPodcast) > 0
  root.style.setProperty('--miniplayer-h-set', hasMiniplayer.value ? (endedRow ? '122px' : '72px') : '0px')
  root.style.setProperty('--sticky-action-h-set', `${stickyActionH.value}px`)
})

onBeforeUnmount(() => {
  const root = document.documentElement
  delete root.dataset.chrome
  for (const v of ['--miniplayer-h-set', '--sticky-action-h-set']) root.style.removeProperty(v)
})

const showUpgrade = ref(false)
const upgradeDetail = ref<FeatureLimitDetail>({ feature: '' })

const chat = useChatStore()
const paletteOpen = useCommandPaletteOpen()
const addSheet = useAddSheet()
const chatLoaded = useLoadedOnce(() => chat.isOpen)
const expandedPlayerLoaded = useLoadedOnce(() => player.expanded)
const paletteLoaded = useLoadedOnce(() => paletteOpen.value)
const addLoaded = useLoadedOnce(() => addSheet.open.value)
const pasteQuestion = usePasteQuestion()
const pasteLoaded = useLoadedOnce(() => pasteQuestion.open.value)
const backlogPlan = useBacklogPlan()
const backlogLoaded = useLoadedOnce(() => backlogPlan.open.value)

// ?add=question opens "Questão que errei" (the PWA shortcut, prd-questao-errada RF-F3); the query goes away
watch(() => route.query.add, (add) => {
  if (add !== 'question') return
  const { add: _add, ...rest } = route.query
  void router.replace({ query: rest })
  pasteQuestion.show('shortcut')
}, { immediate: true })
const upgradeLoaded = useLoadedOnce(() => showUpgrade.value)

const subscription = useSubscriptionStore()

const plansCatalog = usePlans()
async function showLimitToast(detail: Partial<FeatureLimitDetail>) {
  await plansCatalog.fetchPlans()
  const label = plansCatalog.feature(detail.feature || '')?.label ?? 'usos com IA'
  useToast().show(limitReachedText(detail.used, detail.limit, label, detail.resetsAt), 'warning')
}

onMounted(() => {
  subscription.fetchStatus().catch((e: unknown) => reportApiError(e, { silent: true }))

  window.addEventListener('feature-limit-reached', ((e: CustomEvent) => {
    // Full 402 detail: planRequired null means a Pro at the limit (no upgrade CTA)
    const detail = (e.detail ?? {}) as Partial<FeatureLimitDetail>
    // The paid plan at its monthly limit: a toast with the day it starts again, never the upgrade (prd-uso-justo RF-F4)
    if (limitReachedRoute(detail) === 'toast') {
      void showLimitToast(detail)
      return
    }
    upgradeDetail.value = {
      feature: detail.feature || '',
      used: detail.used ?? null,
      limit: detail.limit ?? null,
      planRequired: detail.planRequired === undefined ? 'pro' : detail.planRequired,
      resetsAt: detail.resetsAt ?? null,
      lifetime: detail.lifetime === true,
    }
    showUpgrade.value = true
    useAnalytics().track('paywall_viewed', {
      feature: upgradeDetail.value.feature || null,
      source: 'limit_402',
      plan_required: upgradeDetail.value.planRequired === 'pro' ? 'pro' : null,
    })
  }) as EventListener)
})
</script>
