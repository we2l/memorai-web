<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-6" data-testid="area-step">
    <div>
      <h1 class="text-page-title-sm text-fg-strong sm:text-page-title">Para o que você estuda?</h1>
      <p class="mt-1 text-body text-fg-muted">Escolha e revise 6 cards agora. Sem criar conta.</p>
    </div>

    <ul class="flex flex-col divide-y divide-line rounded-card bg-raised shadow-card" aria-label="Áreas">
      <li v-for="a in GUEST_AREAS" :key="a.key">
        <UiListRow
          :to="`/comecar/${a.key}`"
          :title="a.name"
          :meta="a.hint"
          class="min-h-16"
          :data-testid="`area-${a.key}`"
          @click="choose(a.key)"
        >
          <template #trailing>
            <span v-if="saved?.area === a.key" class="text-label font-medium text-fg-muted">em andamento</span>
            <ChevronRight class="size-4" aria-hidden="true" />
          </template>
        </UiListRow>
      </li>
    </ul>

    <p class="text-meta text-fg-muted">
      Já tem conta? <UiLink :to="loginTo" class="underline">Entrar</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// Onboarding v4 (prd-onboarding-v4 RF-F1): one question before any value, one tap to the mini-lote. Prerendered:
// the first screen of the flow opens without waiting for the app. A lote left on this device shows on its row.
import { ChevronRight } from 'lucide-vue-next'
import { GUEST_AREAS, loadGuestProgress, pendingGuestProgress, type GuestArea, type GuestProgress } from '~/utils/guestProgress'

definePageMeta({ layout: 'auth', wide: true })
useHead({ title: 'Começar · Baigi' })

const saved = ref<GuestProgress | null>(null)
const loginTo = ref('/entrar')
onMounted(() => {
  saved.value = loadGuestProgress()
  if (pendingGuestProgress()) loginTo.value = '/entrar?redirect=/comecar/pronto'
})

function choose(area: GuestArea) {
  useAnalytics().track('onboarding_area_chosen', { area, source: 'comecar' })
}
</script>
