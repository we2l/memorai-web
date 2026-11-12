<template>
  <div class="flex min-h-dvh flex-col bg-raised">
    <UiPublicHeader :quiet-cta="!!route.meta.quietHeaderCta" />
    <main class="w-full flex-1">
      <slot />
    </main>
    <UiPublicFooter />

    <!-- The modal of the 403 email_unverified of the checkout (the banner stays out of the public pages) -->
    <ClientOnly><LazyUiVerifyEmailBanner v-if="auth.user && !auth.isVerified" modal-only /></ClientOnly>
    <!-- Whoever opens /planos or /ajuda with an episode playing keeps its controls -->
    <ClientOnly><LazyShellMiniPlayer v-if="player.currentPodcast" /></ClientOnly>
    <ShellToastHost />
  </div>
</template>

<script setup lang="ts">
// One shell for the public pages, signed in or not (prd-4h-landing-v3 RF-F12, RF-F14): /planos, /ajuda, /termos
// and /privacidade are prerendered, and swapping layouts by login was their hydration mismatch. No BottomNav
// here: data-chrome tells the shell measures of tokens.css (toast, mini-player) that nothing sits under them.
const route = useRoute()
const auth = useAuthStore()
const player = usePlayerStore()

onMounted(() => { document.documentElement.dataset.chrome = 'public' })
onBeforeUnmount(() => { delete document.documentElement.dataset.chrome })
</script>
