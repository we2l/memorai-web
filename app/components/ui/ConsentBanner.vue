<template>
  <div
    v-if="visible"
    role="dialog"
    aria-labelledby="consent-title"
    aria-describedby="consent-text"
    :class="inline
      ? 'flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-raised px-gutter py-3'
      : 'fixed z-40 inset-x-0 bottom-[var(--consent-bottom)] sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-[420px] bg-raised border-t sm:border border-line-strong sm:rounded-card shadow-float px-4 pt-4 pb-[calc(1rem+var(--consent-safe))] sm:pb-4'"
    :style="inline ? undefined : { '--consent-bottom': mobileBottom, '--consent-safe': hasNav ? '0px' : 'env(safe-area-inset-bottom)' }"
    data-testid="consent-banner"
  >
    <h2 id="consent-title" :class="inline ? 'sr-only' : 'text-section text-fg-strong mb-1'">Sua privacidade</h2>
    <p id="consent-text" class="text-meta text-fg" :class="inline && 'min-w-0 flex-1 basis-64'">
      <template v-if="inline">Usamos cookies essenciais e, com sua permissão, de análise.</template>
      <template v-else>Usamos cookies essenciais para o Baigi funcionar e, com sua permissão, cookies de análise (PostHog) para entender como o produto é usado. Nunca vendemos seus dados.</template>
      <NuxtLink to="/privacidade" class="underline text-fg-strong">Política de privacidade</NuxtLink>
    </p>
    <div :class="inline ? 'flex flex-wrap items-center gap-2' : 'grid grid-cols-2 gap-2 mt-3'">
      <UiButton variant="secondary" :size="inline ? 'sm' : 'md'" type="button" :block="!inline" data-testid="consent-reject" @click="reject">Recusar</UiButton>
      <UiButton variant="secondary" :size="inline ? 'sm' : 'md'" type="button" :block="!inline" data-testid="consent-accept" @click="accept">Aceitar</UiButton>
      <UiButton v-if="inline" variant="ghost" size="sm" type="button" data-testid="consent-customize" @click="openModal">Personalizar</UiButton>
    </div>
    <UiButton v-if="!inline" variant="ghost" size="sm" type="button" class="mt-2" data-testid="consent-customize" @click="openModal">Personalizar</UiButton>
    <LazyUiConsentModal v-if="modalLoaded" v-model="showModal" />
  </div>
</template>

<script setup lang="ts">
// LGPD banner (prd-analytics-posthog RF-F02): same weight for Recusar/Aceitar, no focus trap,
// Esc does not dismiss it (a choice is required), never shown on /privacidade. `inline` (auth layout,
// prd-4g RF-F11): a thin bar in the flow of the page, never over the form.
defineProps<{ inline?: boolean }>()

const route = useRoute()
const auth = useAuthStore()
const { analytics, accept, reject } = useConsent()

const showModal = ref(false)
const modalLoaded = useLoadedOnce(() => showModal.value)

const visible = computed(() => analytics.value === null && route.path !== '/privacidade')

// Mobile: sits above the BottomNav on app pages (default layout, logged in)
const hasNav = computed(() => !!auth.user && !['auth', 'landing'].includes(String(route.meta.layout ?? 'default')))
// --nav-h is the BottomNav height with the safe area (0 from 768 px: the TopNav is on top)
const mobileBottom = computed(() => (hasNav.value ? 'var(--nav-h)' : '0px'))

function openModal() {
  showModal.value = true
}
</script>
