<template>
  <UiSection :title="sectionTitle" data-testid="scope-materials" :aria-busy="store.materialsLoading ? 'true' : undefined">
    <template #action>
      <UiButton size="sm" :icon-left="Plus" data-testid="scope-add-material" @click="$emit('add')">Adicionar</UiButton>
    </template>

    <!-- Search, order and matéria: on the server (q, sort, subject_id) -->
    <div v-if="showControls" class="mb-2 grid grid-cols-2 gap-2 lg:flex lg:items-end">
      <UiInput
        v-model="search"
        type="search"
        label="Buscar nos materiais"
        hide-label
        placeholder="Buscar nos materiais…"
        class="col-span-2 lg:flex-1"
        enterkeyhint="search"
        data-testid="material-search"
        @keydown.esc="clearSearch"
      />
      <UiSelect :model-value="store.query.sort" :options="SORTS" label="Ordem" hide-label class="lg:w-40" :class="subjectOptions.length > 1 ? '' : 'col-span-2'" data-testid="material-sort" @update:model-value="onSort" />
      <UiSelect
        v-if="subjectOptions.length > 1"
        :model-value="store.query.subjectId"
        :options="subjectOptions"
        label="Matéria"
        hide-label
        class="lg:w-60"
        data-testid="material-subject"
        @update:model-value="onSubject"
      />
    </div>

    <div v-if="store.materialsLoading && !store.materials.length" aria-hidden="true">
      <UiSkeleton v-for="i in 4" :key="i" variant="row" />
    </div>
    <UiErrorState v-else-if="store.materialsError && !store.materials.length" title="Não foi possível carregar os materiais" @retry="store.fetchMaterials()" />

    <div v-else-if="!store.materials.length && filtered" class="flex flex-col items-start gap-2 py-4" role="status">
      <p class="text-body text-fg">Nada com "{{ store.query.q || 'esse filtro' }}".</p>
      <UiButton size="sm" variant="ghost" @click="clearAll">Limpar busca</UiButton>
    </div>
    <template v-else>
      <p v-if="!store.materials.length" class="py-2 text-body text-fg-muted">Nenhum material ainda. Adicione um PDF, um texto ou uma nota.</p>
      <ul v-if="store.materials.length || (!filtered && specials.length)" class="-mx-3 divide-y divide-line" aria-label="Materiais">
        <li v-for="(row, i) in store.materials" :key="`${row.kind}:${row.id}`">
          <CadernoMaterialRow
            :ref="el => setRowRef(i, el)"
            :row="row"
            :scope-id="scopeId"
            :blocked-reason="blockedReasons[row.id] ?? null"
            @retry="$emit('retry', $event)"
            @delete="$emit('delete', $event)"
            @move="$emit('move', $event)"
            @view-pdf="$emit('view-pdf', $event)"
            @ready="$emit('ready', $event)"
          />
        </li>
        <!-- Cards without a material of their own (F2 origin scopes), after the first page -->
        <template v-if="!filtered">
          <li v-for="sp in specials" :key="sp.key" class="flex items-center gap-3 px-3 py-3" :data-testid="`special-${sp.key}`">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-control bg-subtle text-fg-muted" aria-hidden="true">
              <component :is="sp.icon" class="size-4.5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-fg-strong">{{ sp.title }}</p>
              <p class="text-meta text-fg-muted">{{ sp.meta }}</p>
            </div>
            <UiButton v-if="sp.session > 0" size="sm" class="shrink-0" :to="sp.to">Revisar {{ sp.session }}</UiButton>
          </li>
        </template>
      </ul>
    </template>

    <UiButton
      v-if="store.hasMore && store.materials.length"
      block
      class="mt-3"
      :loading="store.loadingMore"
      data-testid="material-more"
      @click="more"
    >
      Carregar mais
    </UiButton>
  </UiSection>
</template>

<script setup lang="ts">
// Materiais of the scope (prd-4b-caderno-v3 RF-F6): one line per PDF (with its parts) or note, 30 per page
// with "Carregar mais" (a button: the focus goes to the first new line), search with a 300 ms debounce, order
// and matéria on the server. After the list, "Erros das questões" and "Cards avulsos" with their own
// "Revisar N" (origin scopes, F2). The hub never loads note content (§6 rule 6).
import { CircleAlert, CircleX, Layers, Plus } from 'lucide-vue-next'
import type { MaterialRow, ScopeSummary } from '~/types'
import { reviewPath } from '~/utils/reviewScope'
import type { MaterialSort } from '~/stores/scope'

const props = defineProps<{
  scopeId: string
  summary: ScopeSummary | null
  /** Reasons a PDF uploaded here was not read (feature_limit, pages_cap…), by document id */
  blockedReasons?: Record<string, string>
}>()
const emit = defineEmits<{
  (e: 'add'): void
  (e: 'retry', row: MaterialRow): void
  (e: 'delete', row: MaterialRow): void
  (e: 'move', row: MaterialRow): void
  (e: 'view-pdf', row: MaterialRow): void
  (e: 'ready', row: MaterialRow): void
  (e: 'search'): void
  (e: 'more', rows: number): void
}>()

const store = useScopeStore()
const blockedReasons = computed(() => props.blockedReasons ?? {})
const SORTS: { value: MaterialSort; label: string }[] = [
  { value: 'recent', label: 'Recentes' },
  { value: 'name', label: 'Nome (A–Z)' },
]

const sectionTitle = computed(() => `Materiais (${store.total.toLocaleString('pt-BR')})`)
const filtered = computed(() => store.query.q.trim().length >= 2 || !!store.query.subjectId)
// Controls only make sense with something to search (or a search on)
const showControls = computed(() => store.total > 5 || filtered.value || store.query.sort !== 'recent')

const subjectOptions = computed(() => {
  const subjects = props.summary?.subjects ?? []
  if (!subjects.length) return []
  const depth = props.summary?.topic.depth ?? 0
  return [
    { value: '', label: depth === 0 ? 'Todas as matérias' : 'Todos os assuntos' },
    ...subjects.map(s => ({ value: s.id, label: `${s.depth - depth > 1 ? '— ' : ''}${s.name}` })),
  ]
})

const specials = computed(() => {
  const sp = props.summary?.special
  if (!sp) return []
  const cards = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'card' : 'cards'}`
  const line = (key: 'quiz' | 'question' | 'loose', title: string, meta: string, c: { cards: number, session_count: number } | undefined, icon: typeof Layers) =>
    c && c.cards > 0 ? [{ key, title, meta: `${cards(c.cards)} ${meta}`, session: c.session_count, to: reviewPath({ type: 'topic', id: props.scopeId }, { origin: key }), icon }] : []
  return [
    ...line('quiz', 'Erros das questões', 'dos simulados', sp.quiz_errors, CircleAlert),
    // "Colar questão errada" (prd-questao-errada RF-F4)
    ...line('question', 'Questões coladas', '· questões que você errou', sp.questions, CircleX),
    ...line('loose', 'Cards avulsos', 'sem material (à mão, foto, Anki)', sp.loose, Layers),
  ]
})

// Search: debounced; 1 character waits (the API asks ≥ 2)
const search = ref(store.query.q)
let timer: ReturnType<typeof setTimeout> | null = null
watch(search, (q) => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const next = q.trim().length >= 2 ? q.trim() : ''
    if (next === store.query.q) return
    void store.setQuery({ q: next })
    if (next) emit('search')
  }, 300)
})
onScopeDispose(() => { if (timer) clearTimeout(timer) })
// Another scope opened: its own query
watch(() => store.topicId, () => { search.value = store.query.q })

function onSort(v: string) { void store.setQuery({ sort: v as MaterialSort }) }
function onSubject(v: string) { void store.setQuery({ subjectId: v }) }
function clearSearch() { search.value = '' }
function clearAll() {
  search.value = ''
  if (timer) clearTimeout(timer)
  void store.setQuery({ q: '', subjectId: '' })
}

const rowRefs: ({ focus: () => void } | null)[] = []
function setRowRef(i: number, el: unknown) { rowRefs[i] = (el as { focus: () => void } | null) ?? null }

async function more() {
  const first = store.materials.length
  const n = await store.loadMore()
  emit('more', n)
  if (!n) return
  await nextTick()
  rowRefs[first]?.focus()
}
</script>
