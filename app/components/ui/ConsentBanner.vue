<template>
  <div
    v-if="visible"
    ref="root"
    role="dialog"
    aria-labelledby="consent-title"
    aria-describedby="consent-text"
    :class="bar
      ? 'fixed z-40 inset-x-0 bottom-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-strong bg-raised px-gutter-safe pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float'
      : inline
        ? 'flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-raised px-gutter py-3'
        : ['fixed z-40 inset-x-0 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-105 bg-raised border-t sm:border border-line-strong sm:rounded-card shadow-float px-4 pt-4 sm:pb-4', hasNav ? 'bottom-nav pb-4' : 'bottom-0 pb-[calc(1rem+env(safe-area-inset-bottom))]']"
    data-testid="consent-banner"
  >
    <h2 id="consent-title" :class="thin ? 'sr-only' : 'text-section text-fg-strong mb-1'">Sua privacidade</h2>
    <p id="consent-text" class="text-meta text-fg" :class="thin && 'min-w-0 flex-1 basis-64'">
      <template v-if="bar">Cookies de análise só com a sua permissão.</template>
      <template v-else-if="inline">Usamos cookies essenciais e, com sua permissão, de análise.</template>
      <template v-else>Usamos cookies essenciais para o Baigi funcionar e, com sua permissão, cookies de análise (PostHog) para entender como o produto é usado. Nunca vendemos seus dados.</template>
      {{ ' ' }}<NuxtLink to="/privacidade" class="underline text-fg-strong" :target="thin ? '_blank' : undefined">{{ bar ? 'Privacidade' : 'Política de privacidade' }}</NuxtLink>
    </p>
    <div :class="thin ? 'flex flex-wrap items-center gap-2' : 'grid grid-cols-2 gap-2 mt-3'">
      <UiButton variant="secondary" :size="thin ? 'sm' : 'md'" type="button" :block="!thin" :class="thin && 'min-w-24'" data-testid="consent-reject" @click="reject">Recusar</UiButton>
      <UiButton variant="secondary" :size="thin ? 'sm' : 'md'" type="button" :block="!thin" :class="thin && 'min-w-24'" data-testid="consent-accept" @click="accept">Aceitar</UiButton>
      <UiButton v-if="thin" variant="ghost" size="sm" type="button" data-testid="consent-customize" @click="openModal">Personalizar</UiButton>
    </div>
    <UiButton v-if="!thin" variant="ghost" size="sm" type="button" class="mt-2" data-testid="consent-customize" @click="openModal">Personalizar</UiButton>
    <LazyUiConsentModal v-if="modalLoaded" v-model="showModal" />
  </div>
</template>

<script setup lang="ts">
// LGPD banner (prd-analytics-posthog RF-F02): same weight for Recusar/Aceitar, no focus trap,
// Esc does not dismiss it (a choice is required), never shown on /privacidade. `inline` (auth layout,
// prd-4g RF-F11): a thin bar in the flow of the page, never over the form. `bar` (landing, prd-landing-d): the same
// thin bar fixed at the bottom, so it never covers the hero's call (two lines on a phone, one row on the desktop).
// Recusar and Aceitar keep the same width in every form (same weight, LGPD).
const props = defineProps<{ inline?: boolean, bar?: boolean }>()
const thin = computed(() => props.inline || props.bar)

const route = useRoute()
const auth = useAuthStore()
const { analytics, accept, reject } = useConsent()

const showModal = ref(false)
const modalLoaded = useLoadedOnce(() => showModal.value)

const visible = computed(() => analytics.value === null && route.path !== '/privacidade')

// Mobile: sits above the BottomNav on app pages (default layout, logged in)
const hasNav = computed(() => !!auth.user && !['auth', 'landing', 'public'].includes(String(route.meta.layout ?? 'default')))
// bottom-nav: the BottomNav height with the safe area (0 from 768 px: the TopNav is on top)

function openModal() {
  showModal.value = true
}

// Fixed (bar and phone card): the end of the page (footer links, last call) stays reachable above it while it is
// open, through a bottom padding on <body> as tall as the banner (prd-responsividade RF-3)
const root = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
function reserve(px: number) {
  document.body.style.paddingBottom = px ? `${px}px` : ''
}
watch(root, (el) => {
  observer?.disconnect()
  observer = null
  if (!el || props.inline || typeof ResizeObserver === 'undefined') return reserve(0)
  observer = new ResizeObserver(() => reserve(getComputedStyle(el).position === 'fixed' ? el.offsetHeight : 0))
  observer.observe(el)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  reserve(0)
})
</script>
