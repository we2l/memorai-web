<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6" data-testid="area-step">
    <div>
      <h1 class="text-page-title text-fg-strong">Para o que você estuda?</h1>
      <!-- With an account (prd-ativacao-material-proprio H4): "Sem criar conta" is wrong for who just made one -->
      <p class="mt-1 text-body text-fg-muted">{{ loggedIn ? 'Revise 6 cards de exemplo ou comece pelo seu material.' : 'Escolha e revise 6 cards agora. Sem criar conta.' }}</p>
    </div>

    <!-- E2 (prd-visual-e2 RF-5.7): the areas in a grid (3 × 2 on the desktop), each with the icon of its area -->
    <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Áreas">
      <li v-for="a in GUEST_AREAS" :key="a.key" class="flex">
        <NuxtLink
          :to="`/comecar/${a.key}`"
          class="flex w-full items-center gap-3.5 rounded-card bg-raised p-4 shadow-1 transition-shadow duration-fast hover:shadow-2 sm:flex-col sm:items-start sm:p-5"
          :data-testid="`area-${a.key}`"
          @click="choose(a.key)"
        >
          <UiIconTile :icon="AREA_ICON[a.key].icon" :tone="AREA_ICON[a.key].tone" />
          <span class="min-w-0 flex-1">
            <span class="block font-semibold text-fg-strong">{{ a.name }}</span>
            <span class="block text-meta text-fg-muted">{{ a.hint }}</span>
            <span v-if="saved?.area === a.key" class="mt-1 block text-label font-semibold text-action-fg">em andamento</span>
          </span>
          <ChevronRight class="size-4 shrink-0 text-fg-muted sm:hidden" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>

    <div v-if="loggedIn">
      <UiButton variant="ghost" :loading="skipping" class="max-sm:w-full" data-testid="area-skip" @click="skip">Começar pelo meu material</UiButton>
    </div>
    <p v-else class="text-meta text-fg-muted">
      Já tem conta? <UiLink :to="loginTo" class="underline">Entrar</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// The choice of the area (prd-onboarding-v4 RF-F1): one tap to the 6-card mini-lote of the area. Shown to the account
// that has not finished the onboarding on /comecar, and to the visitor on /comecar/areas (prd-entrada-comecar RF-F2/F3:
// the visitor's /comecar is the entry with the tour now). A lote left on this device shows on its row.
import { Briefcase, BookOpen, ChevronRight, Globe, GraduationCap, Scale, Stethoscope } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { IconTileTone } from '~/components/ui/IconTile.vue'
import { GUEST_AREAS, loadGuestProgress, pendingGuestProgress, type GuestArea, type GuestProgress } from '~/utils/guestProgress'

defineProps<{ loggedIn: boolean }>()

// The color of each area only identifies it, on its small tile (ADR-035 §1); the name says what it is
const AREA_ICON: Record<GuestArea, { icon: Component; tone: IconTileTone }> = {
  concurso: { icon: Briefcase, tone: 'action' },
  enem: { icon: GraduationCap, tone: 'accuracy' },
  medicina: { icon: Stethoscope, tone: 'streak' },
  oab: { icon: Scale, tone: 'quiz' },
  ingles: { icon: Globe, tone: 'listen' },
  faculdade: { icon: BookOpen, tone: 'goal' },
}

const saved = ref<GuestProgress | null>(null)
const loginTo = ref('/entrar')
// Read after hydration: the pages are prerendered for the visitor
onMounted(() => {
  saved.value = loadGuestProgress()
  if (pendingGuestProgress()) loginTo.value = '/entrar?redirect=/comecar/pronto'
})

/** An account made straight on /criar-conta can go to its own material without the sample (no lote, no cards). */
const { run, pending: skipping } = useApiAction()
async function skip() {
  const ok = await run(() => useNuxtApp().$api('/onboarding/complete', { method: 'POST' }), { error: 'Não conseguimos seguir agora. Tente de novo.' })
  if (ok === undefined) return
  const auth = useAuthStore()
  if (auth.user) auth.user.onboarding_completed = true
  useAnalytics().track('onboarding_path', { path: 'skip' })
  await navigateTo('/comecar/pronto', { replace: true })
}

function choose(area: GuestArea) {
  useAnalytics().track('onboarding_area_chosen', { area, source: 'comecar' })
}
</script>
