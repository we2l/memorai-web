<template>
  <nav
    aria-label="Navegação mobile"
    class="fixed inset-x-0 bottom-0 z-nav border-t border-line bg-raised px-safe pb-safe-bottom md:hidden"
  >
    <ul class="grid h-14 grid-cols-4 short:h-11">
      <li v-for="place in places" :key="place.key" class="flex">
        <NuxtLink
          :to="place.to"
          class="flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 px-1 text-label short:flex-row short:gap-1.5 transition-colors duration-nav"
          :class="active === place.key ? 'font-semibold text-fg-strong' : 'text-fg-muted'"
          :aria-current="active === place.key ? 'page' : undefined"
          @click="track(place.key)"
        >
          <component :is="place.icon" class="size-5" :stroke-width="active === place.key ? 2.25 : 1.75" aria-hidden="true" />
          {{ place.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
// Bottom navigation of the shell (prd-navegacao-v3 RF-2, canvas CelularPlayerV2): below 768 px, the same
// 4 places as the TopNav and no "Mais" (Simulados, Provas and Podcasts live in Praticar and Progresso).
// 56 px + safe area (--bottomnav-h), z-nav; the active tab is fg-strong 600 (not purple, raio-X §7).
// "+ Adicionar", the search and the avatar go to the page header on the phone (ShellPageTools).
import { activePlace, places, type PlaceKey } from '~/utils/navigation'

const route = useRoute()
const active = computed(() => activePlace(route.path))

function track(item: PlaceKey) {
  useAnalytics().track('nav_clicked', { item, surface: 'bottom' })
}
</script>
