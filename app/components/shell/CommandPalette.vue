<template>
  <UiDialog :model-value="isOpen" title="Buscar" size="lg" @update:model-value="(v: boolean) => { if (!v) close() }">
    <!-- pt-1: room for the focus outline of the field inside the scrolling body -->
    <div class="flex flex-col gap-2 pt-1">
      <UiInput
        ref="inputRef"
        v-model="query"
        label="Buscar cadernos, materiais, cards e ações"
        hide-label
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-expanded="true"
        :aria-controls="listId"
        :aria-activedescendant="activeId"
        placeholder="Cadernos, materiais, cards, ações..."
        @keydown.up.prevent="moveUp"
        @keydown.down.prevent="moveDown"
        @keydown.enter.prevent="executeSelected"
      >
        <template #prefix><Search class="size-4.5" aria-hidden="true" /></template>
        <template #suffix>
          <kbd class="hidden rounded-tag border border-line px-1.5 text-label text-fg-muted sm:inline">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
        </template>
      </UiInput>

      <div :id="listId" role="listbox" aria-label="Resultados" class="-mx-2 flex flex-col">
        <div v-for="group in results" :key="group.category" role="group" :aria-labelledby="`${listId}-${group.category}`" class="py-1.5">
          <div :id="`${listId}-${group.category}`" role="presentation" class="px-3 pt-1 pb-1 text-label font-semibold text-fg-muted">{{ group.label }}</div>
          <div
            v-for="item in group.items"
            :id="optionId(item)"
            :key="item.id"
            role="option"
            :aria-selected="indexOf(item) === selectedIndex ? 'true' : 'false'"
            class="flex min-h-touch cursor-pointer items-center gap-3 rounded-row px-3"
            :class="indexOf(item) === selectedIndex ? 'bg-action-subtle text-action-fg' : 'text-fg-strong'"
            @mousedown.prevent
            @click="executeItem(item)"
            @mousemove="selectedIndex = indexOf(item)"
          >
            <component :is="item.icon" class="size-4.5 shrink-0" :class="indexOf(item) === selectedIndex ? '' : 'text-fg-muted'" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span v-if="item.meta" class="max-w-2/5 shrink-0 truncate text-meta text-fg-muted">{{ item.meta }}</span>
          </div>
        </div>
      </div>
      <p v-if="query && !hasMatches" class="py-6 text-center text-meta text-fg-muted" role="status">
        Nada encontrado para “{{ query }}”.
      </p>
      <p class="hidden gap-4 border-t border-line pt-3 text-label text-fg-muted sm:flex" aria-hidden="true">
        <span>↑↓ navegar</span><span>↵ abrir</span><span>Esc fechar</span>
      </p>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
// Global search of the shell (prd-navegacao-v3 RF-6, tasks 4.3), on UiDialog (Esc, focus trap and return,
// scroll lock). WAI-ARIA combobox: the focus stays in the input and aria-activedescendant points at the
// option; the listbox only owns groups of options (the 2 axe errors of the old palette were
// aria-required-children, from the <p>/<div> headings in the listbox, and aria-input-field-name, from the
// unlabelled input).
import { Search } from 'lucide-vue-next'
import type { CommandItem } from '~/composables/useCommandPalette'

const { isOpen, query, selectedIndex, results, flatResults, close, moveUp, moveDown, executeSelected, executeItem } = useCommandPalette()

const listId = useId()
const inputRef = ref<{ focus: () => void } | null>(null)
const isMac = computed(() => import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))

const hasMatches = computed(() => flatResults.value.some(i => i.category !== 'ask'))
const indexOf = (item: CommandItem) => flatResults.value.indexOf(item)
const optionId = (item: CommandItem) => `${listId}-o-${item.id}`
const activeId = computed(() => {
  const item = flatResults.value[selectedIndex.value]
  return item ? optionId(item) : undefined
})

watch(selectedIndex, () => {
  nextTick(() => {
    if (activeId.value) document.getElementById(activeId.value)?.scrollIntoView({ block: 'nearest' })
  })
})

watch(isOpen, (open) => {
  // rAF: on the first (lazy) mount the input is only in the document after the frame
  if (open) nextTick(() => requestAnimationFrame(() => inputRef.value?.focus()))
}, { immediate: true })
</script>
