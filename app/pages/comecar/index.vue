<template>
  <LazyOnboardingAreaPicker v-if="loggedIn" :logged-in="true" />
  <div v-else class="entrada-page" data-testid="entry">
    <main>
      <EntradaTour
        v-if="step !== null"
        ref="tour"
        :step="step"
        :catalog="catalog"
        :failed="failed"
        :flow="consent === null"
        @go="go"
        @retry="fetchPlans"
      />
      <EntradaHome v-else :catalog="catalog" :login-to="loginTo" @start="start" />
    </main>
  </div>
</template>

<script setup lang="ts">
// /comecar (prd-entrada-comecar): the visitor gets the entry, in the skin of the landing D (ADR-028), with the tour of
// 7 steps in `?passo=1..7`; the account that has not finished the onboarding keeps the choice of the area (RF-F2, the
// grid and "Começar pelo meu material" of the web #271). Prerendered for the visitor: with an account the layout turns
// into `auth` after mounting, and ENTRY_HOLD_SCRIPT keeps the entry hidden meanwhile for who has the session hint.
// Out of the precache: once-* chunks and its CSS is _nuxt/index.*.css (nuxt.config). The grid is lazy (only the account
// needs it); the tour stays in the page's chunk, so the entry's pieces never form a shared chunk of the precache.
import '~/components/entrada/entrada.css'
import type { EntryStepProp } from '~/types/analytics'
import { ENTRY_STEPS, entryStepOf } from '~/utils/entrada'
import { pendingGuestProgress } from '~/utils/guestProgress'

definePageMeta({ layout: 'landing', wide: true })

/**
 * Runs in the <head> before the first paint: with the session hint the entry waits hidden (html.ec-hold, entrada.css)
 * until the page knows who it is, 4 s at most if the JS never runs. Also keeps the query of the first load, which Nuxt
 * takes out of the route while it hydrates a prerendered page.
 */
const ENTRY_HOLD_SCRIPT = `(function(){var d=document.documentElement;window.__baigiEntryQuery=location.search;if(/(?:^|;\\s*)baigi_logged_in=1/.test(document.cookie)){d.classList.add('ec-hold');setTimeout(function(){d.classList.remove('ec-hold')},4000)}})()`

useHead({
  title: 'Conheça o Baigi',
  meta: [{ name: 'description', content: 'Revisão espaçada com IA: veja em um minuto como o Baigi lembra você de revisar antes de esquecer. Revisar é grátis.' }],
  script: [{ innerHTML: ENTRY_HOLD_SCRIPT, tagPosition: 'head' }],
})

const nuxtApp = useNuxtApp()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Out of hydration (an SPA navigation, or the remount when the layout turns into auth) the account is known at once
const loggedIn = ref(import.meta.client && !nuxtApp.isHydrating && !!auth.user)
if (loggedIn.value) setPageLayout('auth')

const { plans: catalog, failed, fetchPlans } = usePlans()
const { analytics: consent } = useConsent()
const { track } = useAnalytics()
const apiBase = useRuntimeConfig().public.apiBase as string
// The aggregate funnel (no cookie, no id; utils/funnelCount.ts), loaded on demand out of the page's closure
const funnel = (use: (m: typeof import('~/utils/funnelCount')) => void) => import('~/utils/funnelCount').then(use)
  .catch(() => { /* intencional: contagem perdida não afeta a pessoa */ })
let stopViewed: (() => void) | null | undefined
/** Reaching the last step of the tour (step 7) */
const countTourDone = (index: number) => index === ENTRY_STEPS.length - 1 && funnel(m => m.countFunnelStep(apiBase, 'entry_tour_done', !!auth.user))

const loginTo = ref('/entrar')
const step = computed(() => entryStepOf(route.query.passo))
const tour = ref<{ focusHeading: () => void } | null>(null)

/** The step in the URL (Voltar of the browser = one step back); the campaign of the query stays. */
function go(target: number | null) {
  const query = { ...route.query, passo: target === null ? undefined : String(target + 1) }
  const back = (window.history.state as { back?: string | null } | null)?.back
  const resolved = router.resolve({ path: route.path, query }).fullPath
  // Voltar to where the person came from pops the history instead of stacking it
  if (back && back === resolved) router.back()
  else router.push({ query })
}

let origin: 'hero' | 'feature' | 'link' = 'link'
let started = false
function start(target: number, from: 'hero' | 'feature') {
  origin = from
  go(target)
}

watch(step, async (now) => {
  if (now === null || loggedIn.value) return
  const name = ENTRY_STEPS[now] as EntryStepProp
  if (!started) {
    started = true
    track('entry_tour_started', { origin, step: name })
  }
  track('entry_step_viewed', { step: name, index: now + 1 })
  countTourDone(now)
  window.scrollTo({ top: 0 })
  await nextTick()
  tour.value?.focusHeading()
})

function releaseHold() {
  document.documentElement.classList.remove('ec-hold')
}

onMounted(() => {
  if (auth.user) {
    // The grid of today (RF-F2) in the auth layout: after the hydration, never during it (it would apply to the next route)
    if (nuxtApp.isHydrating) onNuxtReady(() => { setPageLayout('auth'); loggedIn.value = true; releaseHold() })
    else { setPageLayout('auth'); loggedIn.value = true; releaseHold() }
    return
  }
  releaseHold()
  fetchPlans()
  if (pendingGuestProgress()) loginTo.value = '/entrar?redirect=/comecar/pronto'
  const kept = new URLSearchParams((window as unknown as { __baigiEntryQuery?: string }).__baigiEntryQuery ?? window.location.search)
  const utm = (key: string) => kept.get(key)?.slice(0, 100) || null
  funnel((m) => { if (stopViewed !== null) stopViewed = m.countComecarViewed(apiBase, () => !!auth.user) })
  track('entry_viewed', { utm_source: utm('utm_source'), utm_medium: utm('utm_medium'), utm_campaign: utm('utm_campaign'), utm_content: utm('utm_content') })
  // A step opened straight from the address (a shared link): shown once the route has its query back
  if (step.value !== null) {
    started = true
    const name = ENTRY_STEPS[step.value] as EntryStepProp
    track('entry_tour_started', { origin: 'link', step: name })
    track('entry_step_viewed', { step: name, index: step.value + 1 })
    countTourDone(step.value)
  }
})

onBeforeUnmount(() => {
  releaseHold()
  stopViewed?.()
  stopViewed = null
})
</script>
