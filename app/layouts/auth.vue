<template>
  <div class="flex min-h-dvh flex-col bg-page">
    <header class="mx-auto w-full px-gutter pt-8 pb-6" :class="wide ? 'max-w-page' : 'flex max-w-108 justify-center'">
      <NuxtLink to="/" class="inline-flex min-h-touch items-center rounded-control" aria-label="Baigi: ir para o início">
        <UiLogo :icon-size="32" text-class="text-section text-action-fg" />
      </NuxtLink>
    </header>

    <main class="mx-auto w-full flex-1 px-gutter pb-8" :class="wide ? 'max-w-page' : 'max-w-108'">
      <slot v-if="wide" />
      <UiSection v-else as="div">
        <slot />
      </UiSection>
    </main>

    <footer class="px-gutter py-4 text-center text-meta text-fg-muted">
      <UiLink to="/termos" variant="muted" class="underline" :target="wide ? '_blank' : undefined">Termos</UiLink>
      <span aria-hidden="true"> · </span>
      <UiLink to="/privacidade" variant="muted" class="underline" :target="wide ? '_blank' : undefined">Privacidade</UiLink>
    </footer>

    <!-- Part of the page, not over it: the form is never covered (prd-4g RF-F11, 03 [03]) -->
    <ClientOnly><LazyUiConsentBanner v-if="consent.analytics.value === null" inline /></ClientOnly>

    <ShellToastHost />
  </div>
</template>

<script setup lang="ts">
// Layout of the pages without the shell (prd-4g-conta-onboarding-v3 RF-F11): the logo on top (link to /), one
// section of up to 400 px of content, the legal links at the bottom and the consent as a thin bar at the end
// of the page. `wide` in the page meta (onboarding) gives the content the whole page, without the section.
// The content starts at the top instead of the vertical center, so the bar arriving never moves the form.
const route = useRoute()
const consent = useConsent()
const wide = computed(() => !!route.meta.wide)
</script>
