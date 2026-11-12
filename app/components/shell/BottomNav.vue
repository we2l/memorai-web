<template>
  <nav
    aria-label="Navegação mobile"
    class="bottomnav fixed inset-x-0 bottom-0 z-nav px-safe pb-safe-bottom md:hidden"
  >
    <ul class="grid h-14 grid-cols-4 short:h-11">
      <li v-for="place in places" :key="place.key" class="flex">
        <NuxtLink
          :to="place.to"
          class="flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 px-1 text-label font-semibold short:flex-row short:gap-1.5"
          :class="active === place.key ? 'text-action-fg' : 'text-fg-muted'"
          :aria-current="active === place.key ? 'page' : undefined"
          @click="track(place.key)"
        >
          <span class="grid h-7.5 w-14 place-items-center rounded-chip transition-colors duration-fast short:h-7 short:w-10" :class="active === place.key && 'bg-action-subtle'">
            <component :is="place.icon" class="size-5" :stroke-width="active === place.key ? 2.25 : 1.75" aria-hidden="true" />
          </span>
          {{ place.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
// Bottom navigation of the shell (prd-navegacao-v3 RF-2, canvas CelularPlayerV2): below 768 px, the same
// 4 places as the TopNav and no "Mais" (Simulados, Provas and Podcasts live in Praticar and Progresso).
// 56 px + safe area (--bottomnav-h), z-nav; the active tab: the icon in a 56 × 30 lilac pill and the purple label
// (prd-visual-e2 RF-1.5). Translucent with blur and the opaque fallback, as the TopNav.
// "+ Adicionar", the search and the avatar go to the page header on the phone (ShellPageTools).
import { activePlace, places, type PlaceKey } from '~/utils/navigation'

const route = useRoute()
const active = computed(() => activePlace(route.path))

function track(item: PlaceKey) {
  useAnalytics().track('nav_clicked', { item, surface: 'bottom' })
}
</script>

<style scoped>
/* White bar over the tinted page (A2, ADR-037); 96% so the page text does not read through the labels (sweep 12/11) */
.bottomnav {
  background: var(--surface-raised);
  box-shadow: 0 -1px 0 var(--hairline);
}
@supports (backdrop-filter: blur(1px)) {
  @media (prefers-reduced-transparency: no-preference) {
    .bottomnav {
      background: color-mix(in srgb, var(--surface-raised) 96%, transparent);
      backdrop-filter: blur(16px) saturate(1.4);
    }
  }
}
</style>
