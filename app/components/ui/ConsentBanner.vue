<template>
  <div
    v-if="visible"
    role="dialog"
    aria-labelledby="consent-title"
    aria-describedby="consent-text"
    class="fixed z-40 inset-x-0 bottom-[var(--consent-bottom)] sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-[420px] bg-[var(--bg-card)] border-t sm:border border-line-strong sm:rounded-2xl shadow-lg px-4 pt-4 pb-[calc(1rem+var(--consent-safe))] sm:pb-4"
    :style="{ '--consent-bottom': mobileBottom, '--consent-safe': hasNav ? '0px' : 'env(safe-area-inset-bottom)' }"
    data-testid="consent-banner"
  >
    <h2 id="consent-title" class="text-section text-fg-strong mb-1">Sua privacidade</h2>
    <p id="consent-text" class="text-meta text-fg">
      Usamos cookies essenciais para o Baigi funcionar e, com sua permissão, cookies de análise (PostHog) para entender como o produto é usado. Nunca vendemos seus dados.
      <NuxtLink to="/privacidade" class="underline text-fg-strong">Política de privacidade</NuxtLink>
    </p>
    <div class="grid grid-cols-2 gap-2 mt-3">
      <UiButton variant="secondary" type="button" block data-testid="consent-reject" @click="reject">Recusar</UiButton>
      <UiButton variant="secondary" type="button" block data-testid="consent-accept" @click="accept">Aceitar</UiButton>
    </div>
    <button
      type="button"
      class="mt-2 min-h-touch text-meta text-fg-muted underline hover:text-fg-strong"
      data-testid="consent-customize"
      @click="openModal"
    >
      Personalizar
    </button>
    <LazyUiConsentModal v-if="modalLoaded" v-model="showModal" />
  </div>
</template>

<script setup lang="ts">
// LGPD banner (prd-analytics-posthog RF-F02): same weight for Recusar/Aceitar, no focus trap,
// Esc does not dismiss it (a choice is required), never shown on /privacidade.
const route = useRoute()
const auth = useAuthStore()
const { analytics, accept, reject } = useConsent()

const showModal = ref(false)
const modalLoaded = useLoadedOnce(() => showModal.value)

const visible = computed(() => analytics.value === null && route.path !== '/privacidade')

// Mobile: sits above the BottomNav on app pages (default layout, logged in)
const hasNav = computed(() => !!auth.user && !['auth', 'landing'].includes(String(route.meta.layout ?? 'default')))
const mobileBottom = computed(() => (hasNav.value ? 'calc(var(--nav-h) + env(safe-area-inset-bottom))' : '0px'))

function openModal() {
  showModal.value = true
}
</script>
