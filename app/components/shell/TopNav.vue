<template>
  <header class="sticky top-0 z-nav hidden h-topnav border-b border-line bg-raised md:block">
    <div class="mx-auto flex h-full max-w-page items-center gap-4 px-gutter lg:gap-6">
      <NuxtLink to="/hoje" class="flex shrink-0 items-center rounded-row" aria-label="Baigi, ir para Hoje">
        <UiLogo :icon-size="28" text-class="hidden text-section text-fg-strong lg:inline" />
      </NuxtLink>

      <nav aria-label="Navegação principal" data-tour="nav-places" class="min-w-0 flex-1">
        <ul class="flex items-center gap-0.5">
          <li v-for="place in places" :key="place.key">
            <NuxtLink
              :to="place.to"
              class="inline-flex min-h-9 items-center rounded-row px-3 text-meta transition-colors duration-nav"
              :class="active === place.key ? 'bg-subtle font-semibold text-fg-strong' : 'font-medium text-fg-muted hover:bg-subtle hover:text-fg-strong'"
              :aria-current="active === place.key ? 'page' : undefined"
              :data-tour="place.key === 'praticar' ? 'review-link' : undefined"
              @click="track(place.key)"
            >
              {{ place.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="inline-flex min-h-9 items-center gap-1.5 rounded-row bg-subtle px-3 text-meta font-medium text-fg-strong transition-colors duration-nav hover:bg-line"
          aria-haspopup="dialog"
          @click="addSheet.show('topnav')"
        >
          <Plus class="size-4" aria-hidden="true" />
          Adicionar
        </button>
        <button
          type="button"
          class="inline-flex min-h-9 items-center gap-1.5 rounded-row bg-subtle px-3 text-meta font-medium text-fg-muted transition-colors duration-nav hover:bg-line hover:text-fg-strong"
          aria-haspopup="dialog"
          :aria-keyshortcuts="isMac ? 'Meta+K' : 'Control+K'"
          @click="openSearch"
        >
          <Search class="size-4" aria-hidden="true" />
          <span>Buscar<span class="hidden lg:inline"> · {{ isMac ? '⌘' : 'Ctrl' }} K</span></span>
        </button>
        <ShellAccountMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// Top navigation of the shell (prd-navegacao-v3 RF-1, ADR-027 §7, canvas V4): from 768 px (tablet too,
// PRD open question 2). Logo, the 4 places of utils/navigation.ts (the active one by the route section),
// "+ Adicionar", the search (Ctrl K) and the avatar with the account menu. Sticky, --topnav-h, z-nav.
// The aria-label "Navegação principal" is the one of the old sidebar (the E2E use it).
import { Plus, Search } from 'lucide-vue-next'
import { activePlace, places, type PlaceKey } from '~/utils/navigation'

const route = useRoute()
const addSheet = useAddSheet()
const searchOpen = useCommandPaletteOpen()
const active = computed(() => activePlace(route.path))
const isMac = computed(() => import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))

function track(item: PlaceKey) {
  useAnalytics().track('nav_clicked', { item, surface: 'top' })
}

function openSearch() {
  searchOpen.value = true
  useAnalytics().track('search_opened', { origin: 'topnav' })
}
</script>
