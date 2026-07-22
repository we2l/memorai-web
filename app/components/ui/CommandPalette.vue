<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida"
      >
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-[rgba(31,35,67,0.4)] backdrop-blur-sm"
          @click="close"
        />

        <!-- Palette container -->
        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          enter-from-class="opacity-0 scale-[0.97] translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-[0.97]"
        >
          <div
            v-if="isOpen"
            class="relative w-full max-w-[560px] mx-4 mt-[12vh] sm:mt-[18vh] h-fit"
          >
            <div class="bg-[var(--bg-card)] rounded-3xl shadow-[0_24px_48px_rgba(45,35,66,0.15)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.4)] overflow-hidden border border-[var(--border-base)]">
              <!-- Input -->
              <div class="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-divider)]">
                <Search :size="20" class="text-[var(--text-muted)] shrink-0" />
                <input
                  ref="inputRef"
                  v-model="query"
                  type="text"
                  placeholder="Buscar cadernos, notas, ações..."
                  class="flex-1 bg-transparent text-[var(--text-heading)] text-base placeholder:text-[var(--text-muted)] outline-none"
                  @keydown.up.prevent="moveUp"
                  @keydown.down.prevent="moveDown"
                  @keydown.enter.prevent="executeSelected"
                  @keydown.escape.prevent="close"
                />
                <kbd
                  v-if="!query"
                  class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-soft)] rounded-md border border-[var(--border-base)]"
                >
                  <span>{{ isMac ? '⌘' : 'Ctrl' }}</span><span>K</span>
                </kbd>
              </div>

              <!-- Results -->
              <div
                ref="resultsRef"
                class="max-h-[360px] overflow-y-auto overscroll-contain"
                role="listbox"
              >
                <template v-if="flatResults.length > 0">
                  <div v-for="group in results" :key="group.category" class="py-2">
                    <p class="px-5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      {{ group.label }}
                    </p>
                    <button
                      v-for="(item, i) in group.items"
                      :key="item.id"
                      :ref="(el) => setItemRef(el, getGlobalIndex(group, item))"
                      class="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-75"
                      :class="getGlobalIndex(group, item) === selectedIndex
                        ? 'bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-50)]/10 border-l-3 border-l-[var(--color-primary-500)]'
                        : 'hover:bg-[var(--bg-soft)] border-l-3 border-l-transparent'"
                      role="option"
                      :aria-selected="getGlobalIndex(group, item) === selectedIndex"
                      @click="executeItem(item)"
                      @mouseenter="selectedIndex = getGlobalIndex(group, item)"
                    >
                      <component
                        :is="item.icon"
                        :size="18"
                        :stroke-width="1.5"
                        class="shrink-0"
                        :class="getGlobalIndex(group, item) === selectedIndex ? 'text-[var(--color-primary-500)]' : 'text-[var(--text-muted)]'"
                      />
                      <span
                        class="flex-1 text-[15px] truncate"
                        :class="getGlobalIndex(group, item) === selectedIndex ? 'text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] font-medium' : 'text-[var(--text-heading)]'"
                      >
                        {{ item.label }}
                      </span>
                      <span
                        v-if="item.meta"
                        class="text-[12px] text-[var(--text-muted)] bg-[var(--bg-soft)] px-1.5 py-0.5 rounded"
                      >
                        {{ item.meta }}
                      </span>
                    </button>
                  </div>
                </template>

                <!-- Empty state -->
                <div v-else-if="query" class="py-12 text-center">
                  <p class="text-[var(--text-muted)] text-sm">Nenhum resultado para "<span class="text-[var(--text-body)]">{{ query }}</span>"</p>
                </div>
              </div>

              <!-- Footer hints -->
              <div class="flex items-center gap-4 px-5 py-2.5 border-t border-[var(--border-divider)] bg-[var(--bg-soft)]">
                <span class="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
                  <kbd class="font-mono">↑↓</kbd> navegar
                </span>
                <span class="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
                  <kbd class="font-mono">↵</kbd> abrir
                </span>
                <span class="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
                  <kbd class="font-mono">esc</kbd> fechar
                </span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'

const {
  isOpen,
  query,
  selectedIndex,
  results,
  flatResults,
  close,
  moveUp,
  moveDown,
  executeSelected,
  executeItem,
} = useCommandPalette()

const inputRef = ref<HTMLInputElement | null>(null)
const resultsRef = ref<HTMLElement | null>(null)
const itemRefs = ref<Record<number, HTMLElement | null>>({})

const isMac = computed(() => {
  if (!import.meta.client) return false
  return navigator.platform?.includes('Mac') || navigator.userAgent?.includes('Mac')
})

// Autofocus input when opened
watch(isOpen, (val) => {
  if (val) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

// Scroll selected item into view
watch(selectedIndex, (idx) => {
  nextTick(() => {
    const el = itemRefs.value[idx]
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  })
})

function setItemRef(el: any, index: number) {
  if (el) {
    itemRefs.value[index] = el.$el || el
  }
}

function getGlobalIndex(group: any, item: any): number {
  return flatResults.value.indexOf(item)
}
</script>
