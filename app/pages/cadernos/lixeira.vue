<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <UiPageHeader title="Lixeira" meta="O que você exclui fica aqui por 30 dias e depois é apagado." :back="{ to: '/cadernos', label: 'Cadernos' }" />

    <UiSection v-if="loading" aria-busy="true">
      <span class="sr-only" role="status">Carregando a lixeira…</span>
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </UiSection>
    <UiErrorState v-else-if="failed" title="Não foi possível carregar a lixeira" @retry="load()" />

    <UiSection v-else-if="!batches.length">
      <UiEmptyState title="A lixeira está vazia" description="O que você excluir de um caderno aparece aqui, e dá para restaurar." data-testid="trash-empty">
        <template #action>
          <UiButton to="/cadernos">Ver cadernos</UiButton>
        </template>
      </UiEmptyState>
    </UiSection>

    <UiSection v-else flush class="px-3 py-2">
      <ul ref="list" class="divide-y divide-line" aria-label="Itens na lixeira" data-testid="trash-list">
        <li v-for="b in batches" :key="b.id" class="content-auto py-3" data-testid="trash-row">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 sm:flex-nowrap">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-control bg-subtle text-fg-muted" aria-hidden="true">
              <component :is="ICONS[b.kind]" class="size-4.5" />
            </span>
            <div class="min-w-0 flex-1 basis-3/5">
              <p class="font-medium break-words text-fg-strong" data-testid="trash-title">{{ b.title }}</p>
              <p class="text-meta text-fg-muted">{{ meta(b) }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:pl-12">
              <UiButton size="sm" :loading="restoring === b.id" :aria-label="`Restaurar ${b.title}`" data-trash-restore @click="restore(b)">Restaurar</UiButton>
              <UiButton size="sm" variant="ghost" :aria-label="`Apagar agora ${b.title}`" @click="askPurge(b)">Apagar agora</UiButton>
            </div>
          </div>
          <!-- Why it did not come back, and the next step, on the line itself -->
          <p v-if="problems[b.id]" class="mt-2 flex flex-wrap items-center gap-x-2 pl-13 text-meta text-danger" role="alert" data-testid="trash-problem">
            <span>{{ problems[b.id]!.message }}</span>
            <UiButton v-if="problems[b.id]!.parent" size="sm" variant="ghost" @click="restore(problems[b.id]!.parent!)">Restaurar {{ problems[b.id]!.parent!.title }}</UiButton>
            <UiLink v-else-if="problems[b.id]!.next" :to="problems[b.id]!.next!.to">{{ problems[b.id]!.next!.label }}</UiLink>
          </p>
        </li>
      </ul>
    </UiSection>

    <UiConfirmModal
      v-model="purgeOpen"
      :title="purging ? `Apagar “${purging.title}” de vez?` : ''"
      :message="purgeMessage"
      confirm-label="Apagar de vez"
      loading-label="Apagando…"
      :loading="purgePending"
      :require-text="purgeRequiresName ? purging?.title : undefined"
      @confirm="purge"
    />
  </div>
</template>

<script setup lang="ts">
// Lixeira (prd-4b-caderno-v3 RF-F16): a line per batch with what it was, what went with it and when it goes for
// good, Restaurar (back to its place, the whole batch) and Apagar agora (confirmed; a big caderno asks for its
// name, RN-UX-08). A restore the rules refuse says why on the line: the place it came from is in the trash too
// (409 parent_in_trash → "Restaure … primeiro") or an exam stands in the way (exam_coverage). Chunk once-*.
import { FileText, FolderOpen, NotebookText } from 'lucide-vue-next'
import type { TrashBatch } from '~/types'
import { batchCounts, BIG_CADERNO_CARDS, contentsText, goesAlongText, organizationError, purgeText, trashKindLabel } from '~/utils/organization'
import { getErrorStatus } from '~/utils/apiErrors'

useHead({ title: 'Lixeira · Baigi' })

const { $api } = useNuxtApp()
const toast = useToast()
const { restore: restoreBatch } = useTrashBatch()

const ICONS = { topic: FolderOpen, document: FileText, note: NotebookText }

const batches = ref<TrashBatch[]>([])
const loading = ref(true)
const failed = ref(false)
const restoring = ref<string | null>(null)
const list = ref<HTMLElement | null>(null)

interface Problem { message: string; parent?: TrashBatch; next?: { label: string; to: string } }
const problems = ref<Record<string, Problem>>({})

/** `silent`: the list stays on screen (and the focus in it) while it comes again. */
async function load(silent = false) {
  if (!silent) loading.value = true
  failed.value = false
  try {
    const res = await $api<{ data: TrashBatch[] }>('/trash')
    batches.value = res.data
  } catch (e) {
    if (!silent) failed.value = true
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}
onMounted(() => load())
// A batch came back (here or by a "Desfazer"): lines that waited for it lose the "também na lixeira"
watch(useState<number>('trash-version', () => 0), () => { void load(true) })

function meta(b: TrashBatch): string {
  const parts = [trashKindLabel(b)]
  if (b.origin) parts.push(`em ${b.origin.name}${b.origin.in_trash ? ' (também na lixeira)' : ''}`)
  const contents = contentsText(batchCounts(b), b.origin ? 1 : 0)
  if (contents) parts.push(contents)
  parts.push(purgeText(b.purge_at))
  return parts.join(' · ')
}

function takeOut(b: TrashBatch) {
  const i = batches.value.findIndex(x => x.id === b.id)
  batches.value = batches.value.filter(x => x.id !== b.id)
  // Its own problem goes, and the ones that pointed to this batch as the next step
  problems.value = Object.fromEntries(Object.entries(problems.value).filter(([id, p]) => id !== b.id && p.parent?.id !== b.id))
  // The focus stays in the list: on the next line's Restaurar (or the previous one, at the end)
  void nextTick(() => list.value?.querySelectorAll<HTMLElement>('[data-trash-restore]')[Math.min(i, batches.value.length - 1)]?.focus())
}

/** Where a restored batch is now. */
function pathOf(b: TrashBatch): string | null {
  if (b.kind === 'topic') return cadernoPath(b.item_id)
  if (!b.origin) return null
  return b.kind === 'note' ? cadernoPath(b.origin.id, { note: b.item_id }) : cadernoPath(b.origin.id)
}

/** The batch to restore first: the one of the place it came from, when that one is its own line. */
function parentBatch(b: TrashBatch): TrashBatch | undefined {
  return b.origin ? batches.value.find(x => x.kind === 'topic' && x.item_id === b.origin!.id) : undefined
}

async function restore(b: TrashBatch) {
  if (restoring.value) return
  restoring.value = b.id
  const { [b.id]: _old, ...rest } = problems.value
  problems.value = rest
  try {
    await restoreBatch(b.id, 'page')
    takeOut(b)
    const to = pathOf(b)
    toast.show(`“${b.title}” voltou.`, 'success', to ? { action: { label: 'Abrir', onClick: () => { void navigateTo(to) } } } : undefined)
  } catch (e) {
    if (getErrorStatus(e) === 401) return
    if (alreadyGone(e, b)) return
    const view = organizationError(e, 'restore')
    if (view?.code === 'parent_in_trash') {
      // With its own line, the button; else it sits inside another batch (or a part whose PDF is in the trash)
      const parent = parentBatch(b)
      problems.value = { ...problems.value, [b.id]: parent
        ? { message: `Restaure “${parent.title}” primeiro: é onde este item estava.`, parent }
        : { message: 'O lugar de origem também está na lixeira. Restaure primeiro a linha que o contém.' } }
    } else if (view) {
      problems.value = { ...problems.value, [b.id]: { message: view.message, next: view.next } }
    } else {
      reportApiError(e, { error: 'Não foi possível restaurar. Tente de novo.' })
    }
  } finally {
    restoring.value = null
  }
}

/** Another tab or the job already took this batch: the line goes, and the list comes again. */
function alreadyGone(e: unknown, b: TrashBatch): boolean {
  if (getErrorStatus(e) !== 404) return false
  takeOut(b)
  toast.show(`“${b.title}” não está mais na lixeira.`, 'info')
  void load(true)
  return true
}

const purgeOpen = ref(false)
const purgePending = ref(false)
const purging = ref<TrashBatch | null>(null)
const purgeMessage = computed(() => {
  const b = purging.value
  if (!b) return ''
  const along = goesAlongText(batchCounts(b), b.origin ? 1 : 0)
  // A whole caderno leaves no place for what was excluded from inside it before: those batches go too (API)
  const nested = b.kind === 'topic' && !b.origin && batches.value.some(x => x.kind !== 'topic' && x.origin?.in_trash)
  return `${along ? `${along}, com o histórico. ` : ''}${nested ? 'Materiais que você excluiu antes, de dentro dele, também são apagados. ' : ''}Não dá para desfazer.`
})
const purgeRequiresName = computed(() => purging.value?.kind === 'topic' && (purging.value.counts.cards ?? 0) >= BIG_CADERNO_CARDS)

function askPurge(b: TrashBatch) {
  purging.value = b
  purgeOpen.value = true
}

async function purge() {
  const b = purging.value
  if (!b || purgePending.value) return
  purgePending.value = true
  try {
    await $api(`/trash/${b.id}`, { method: 'DELETE' })
    purgeOpen.value = false
    takeOut(b)
    toast.show(`“${b.title}” foi apagado de vez.`, 'success')
    // A caderno may take older batches with it, and a matéria inside it may have surfaced
    void load(true)
  } catch (e) {
    purgeOpen.value = false
    if (!alreadyGone(e, b)) reportApiError(e, { error: 'Não foi possível apagar. Tente de novo.' })
  } finally {
    purgePending.value = false
  }
}
</script>
