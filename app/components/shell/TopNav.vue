<template>
  <header class="topnav sticky top-0 z-nav hidden h-topnav md:block">
    <div class="mx-auto flex h-full max-w-page items-center gap-4 px-gutter lg:gap-6">
      <NuxtLink to="/hoje" class="hit-touch flex shrink-0 items-center rounded-row" aria-label="Baigi, ir para Hoje">
        <UiLogo :icon-size="28" text-class="hidden text-section text-action-fg lg:inline" />
      </NuxtLink>

      <nav aria-label="Navegação principal" data-tour="nav-places" class="min-w-0 flex-1">
        <ul class="flex items-center gap-0.5">
          <li v-for="place in places" :key="place.key">
            <NuxtLink
              :to="place.to"
              class="hit-touch inline-flex min-h-9.5 items-center gap-2 rounded-chip px-3.5 text-body-sm font-semibold transition-colors duration-fast"
              :class="active === place.key ? 'bg-action-subtle text-action-fg' : 'text-fg-muted hover:bg-hover hover:text-fg-strong'"
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
          class="hit-touch inline-flex min-h-10 items-center gap-1.5 rounded-chip bg-soft px-3.5 text-meta font-semibold text-fg-strong transition-colors duration-fast hover:bg-hover"
          aria-haspopup="dialog"
          @click="addSheet.show('topnav')"
        >
          <Plus class="size-4" aria-hidden="true" />
          Adicionar
        </button>
        <button
          type="button"
          class="hit-touch inline-flex min-h-10 items-center gap-2.5 rounded-chip bg-soft px-3.5 text-meta font-medium text-fg-muted transition-colors duration-fast hover:bg-hover hover:text-fg-strong lg:w-65"
          aria-haspopup="dialog"
          :aria-keyshortcuts="isMac ? 'Meta+K' : 'Control+K'"
          @click="openSearch"
        >
          <Search class="size-4" aria-hidden="true" />
          <span>Buscar</span>
          <kbd class="ml-auto hidden rounded-tag bg-raised px-1.5 font-sans text-label text-fg-strong shadow-0 lg:inline">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
        </button>
        <ShellAccountMenu />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// Top navigation of the shell (prd-navegacao-v3 RF-1; E2 skin, prd-visual-e2 RF-1.5): from 768 px. Logo, the 4
// places of utils/navigation.ts (the active one in a lilac pill), "+ Adicionar", the wide search (Ctrl K) and the
// avatar with the account menu. 68 px (--topnav-h), translucent with blur over the content and an opaque fallback
// (no backdrop-filter, or prefers-reduced-transparency); a hairline under it instead of a border. Sticky, z-nav.
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

<style scoped>
.topnav {
  background: var(--surface-raised);
  box-shadow: 0 1px 0 var(--hairline);
}
@supports (backdrop-filter: blur(1px)) {
  @media (prefers-reduced-transparency: no-preference) {
    .topnav {
      background: color-mix(in srgb, var(--surface-raised) 94%, transparent);
      backdrop-filter: blur(16px) saturate(1.4);
    }
  }
}
</style>
