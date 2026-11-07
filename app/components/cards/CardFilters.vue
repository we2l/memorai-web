<template>
  <div class="flex flex-col gap-3" data-testid="card-filters">
    <div class="flex flex-wrap items-end gap-3">
      <UiInput
        v-model="search"
        type="search"
        label="Buscar nos cards"
        hide-label
        placeholder="Buscar na pergunta ou na resposta"
        class="min-w-56 flex-1"
        :hint="search.trim().length === 1 ? 'Digite pelo menos 2 letras' : undefined"
        data-testid="card-search"
        @keydown.esc="search = ''"
      />
      <UiSelect
        :model-value="filters.sort"
        label="Ordem"
        hide-label
        :options="LIBRARY_SORTS"
        class="w-44"
        data-testid="card-sort"
        @update:model-value="(v: string) => emitSet({ sort: v as LibrarySort }, 'sort')"
      />
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="group" aria-label="Estado" class="flex flex-wrap gap-1.5">
        <button
          v-for="s in LIBRARY_STATES"
          :key="s.value"
          type="button"
          class="min-h-touch rounded-control border px-3 text-meta font-medium transition-colors duration-nav"
          :class="filters.state.includes(s.value) ? 'border-action bg-action-subtle text-action-fg' : 'border-line-strong bg-raised text-fg hover:bg-subtle'"
          :aria-pressed="filters.state.includes(s.value) ? 'true' : 'false'"
          :data-testid="`card-state-${s.value}`"
          @click="toggleState(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
      <UiSelect
        :model-value="filters.origin"
        label="Origem"
        hide-label
        :options="originOptions"
        class="w-56"
        data-testid="card-origin"
        @update:model-value="(v: string) => emitSet({ origin: v }, 'origin')"
      />
      <UiSelect
        v-if="tags.length || filters.tag"
        :model-value="filters.tag"
        label="Etiqueta"
        hide-label
        :options="tagOptions"
        class="w-44"
        @update:model-value="(v: string) => emitSet({ tag: v }, 'tag')"
      />
      <UiCheckbox
        :model-value="filters.errors"
        label="Só com erros"
        data-testid="card-errors"
        @update:model-value="(v: boolean) => emitSet({ errors: v }, 'errors')"
      />
      <UiButton v-if="active" size="sm" variant="ghost" data-testid="card-clear" @click="clear">Limpar filtros</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Filters of the library (prd-4c-material-v3 RF-F10), all on the server and in the URL (back and share
// keep them): search (300 ms), state (several at once), origin (a material of the scope, the quiz
// errors, the pasted questions or the loose cards), only with errors, tag (only when the scope has some) and the order.
import type { SelectOption } from '~/components/ui/Select.vue'
import { LIBRARY_SORTS, LIBRARY_STATES, hasFilters, type LibraryFilters, type LibrarySort, type LibraryState } from '~/composables/useCardLibrary'

const props = defineProps<{
  filters: LibraryFilters
  /** Materials of the scope: value `note:<id>` or `document:<id>` */
  materials: SelectOption[]
  tags: string[]
}>()
const emit = defineEmits<{
  (e: 'change', patch: Partial<LibraryFilters>, filter: 'q' | 'state' | 'origin' | 'errors' | 'tag' | 'sort'): void
  (e: 'clear'): void
}>()

const active = computed(() => hasFilters(props.filters))

const originOptions = computed<SelectOption[]>(() => {
  const base: SelectOption[] = [
    { value: '', label: 'Todas as origens' },
    ...props.materials,
    { value: 'quiz', label: 'Erros das questões' },
    { value: 'question', label: 'Questões coladas' },
    { value: 'loose', label: 'Cards avulsos' },
  ]
  // A material out of the first page (or from a link): still shown as chosen
  if (props.filters.origin && !base.some(o => o.value === props.filters.origin)) base.splice(1, 0, { value: props.filters.origin, label: 'Um material' })
  return base
})

const tagOptions = computed<SelectOption[]>(() => {
  const all = [...new Set([...props.tags, ...(props.filters.tag ? [props.filters.tag] : [])])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return [{ value: '', label: 'Todas as etiquetas' }, ...all.map(t => ({ value: t, label: t }))]
})

function emitSet(patch: Partial<LibraryFilters>, filter: 'q' | 'state' | 'origin' | 'errors' | 'tag' | 'sort') {
  emit('change', patch, filter)
}

function toggleState(s: LibraryState) {
  const next = props.filters.state.includes(s) ? props.filters.state.filter(x => x !== s) : [...props.filters.state, s]
  emitSet({ state: next }, 'state')
}

// Search: typed here, written to the URL after a pause (the list reloads from the URL)
const search = ref(props.filters.q)
let timer: ReturnType<typeof setTimeout> | null = null
watch(search, (q) => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const value = q.trim()
    if (value.length === 1 || value === props.filters.q) return
    emitSet({ q: value }, 'q')
  }, 300)
})
watch(() => props.filters.q, (q) => { if (q !== search.value.trim()) search.value = q })
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

function clear() {
  search.value = ''
  emit('clear')
}
</script>
