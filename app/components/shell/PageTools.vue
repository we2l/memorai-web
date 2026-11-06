<template>
  <div class="flex min-h-14 items-center justify-between gap-2 px-gutter pt-2 md:hidden">
    <NuxtLink to="/hoje" class="hit-touch flex items-center rounded-row" aria-label="Baigi, ir para Hoje">
      <UiLogo :icon-size="28" :show-text="false" />
    </NuxtLink>
    <div class="flex items-center gap-1">
      <UiIconButton :icon="Search" label="Buscar" aria-haspopup="dialog" @click="openSearch" />
      <button
        type="button"
        class="hit-touch inline-flex min-h-9 items-center gap-1.5 rounded-row bg-subtle px-3 text-meta font-semibold text-fg-strong"
        aria-haspopup="dialog"
        @click="addSheet.show('header')"
      >
        <Plus class="size-4" aria-hidden="true" />
        Adicionar
      </button>
      <ShellAccountMenu v-if="showAccount" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Phone header tools of the shell (prd-navegacao-v3 RF-2): below 768 px there is no TopNav, so the top of
// every page carries the search and "+ Adicionar"; the avatar (account menu) shows on Hoje and Progresso
// (PRD open question 1, default: keep the 4 tabs). Not sticky: it scrolls away with the page.
import { Plus, Search } from 'lucide-vue-next'
import { activePlace } from '~/utils/navigation'

const route = useRoute()
const addSheet = useAddSheet()
const searchOpen = useCommandPaletteOpen()
const showAccount = computed(() => ['hoje', 'progresso'].includes(activePlace(route.path) ?? '') || route.path === '/configuracoes')

function openSearch() {
  searchOpen.value = true
  useAnalytics().track('search_opened', { origin: 'header' })
}
</script>
