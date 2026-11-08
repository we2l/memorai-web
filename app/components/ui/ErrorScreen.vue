<template>
  <div class="flex min-h-dvh flex-col items-center bg-page px-gutter py-8">
    <NuxtLink :to="logged ? '/hoje' : '/'" class="inline-flex min-h-touch items-center rounded-control" aria-label="Baigi: ir para o início" @click="leave">
      <UiLogo :icon-size="32" text-class="text-section text-fg-strong" />
    </NuxtLink>

    <main class="flex w-full max-w-prose flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
      <UiBaigiMascot :size="96" state="thinking" priority />
      <h1 class="text-page-title-sm text-fg-strong sm:text-page-title">{{ notFound ? 'Página não encontrada' : 'Algo deu errado' }}</h1>
      <p class="max-w-md text-body break-words text-fg-muted" data-testid="error-lead">
        <template v-if="notFound">O endereço <span class="font-semibold text-fg-strong">{{ path }}</span> não existe ou mudou de lugar.</template>
        <template v-else>Não foi culpa sua. Tente de novo em alguns segundos.</template>
      </p>

      <div class="mt-3 flex w-full max-w-xs flex-col gap-2">
        <template v-if="notFound">
          <UiButton variant="primary" block data-testid="error-home" @click="goHome">{{ logged ? 'Ir para o Hoje' : 'Ir para o início' }}</UiButton>
          <UiButton v-if="logged" block aria-keyshortcuts="Control+K" data-testid="error-search" @click="search">Buscar (Ctrl K)</UiButton>
        </template>
        <template v-else>
          <UiButton variant="primary" block data-testid="error-retry" @click="retry">Tentar de novo</UiButton>
          <UiButton block data-testid="error-home" @click="goHome">{{ logged ? 'Ir para o Hoje' : 'Ir para o início' }}</UiButton>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// Screen of app/error.vue (prd-4g-conta-onboarding-v3 RF-F15): 404 and failures in Portuguese, with the brand
// and a way out, on the prerendered pages and in the app. The search lives in the shell, so "Buscar" opens it on Hoje.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const auth = useAuthStore()
const notFound = computed(() => props.error.statusCode === 404)
const logged = computed(() => !!auth.user)
const path = computed(() => (import.meta.client ? window.location.pathname : ''))

useHead({ title: notFound.value ? 'Página não encontrada · Baigi' : 'Algo deu errado · Baigi' })

onMounted(() => {
  useAnalytics().track('error_page', { status: props.error.statusCode ?? 500 })
})

function target() {
  return logged.value ? '/hoje' : '/'
}
function leave(e: Event) {
  e.preventDefault()
  void clearError({ redirect: target() })
}
function goHome() {
  void clearError({ redirect: target() })
}
function retry() {
  void clearError().then(() => window.location.reload())
}
function search() {
  useCommandPaletteOpen().value = true
  void clearError({ redirect: '/hoje' })
}
</script>
