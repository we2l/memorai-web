<template>
  <div class="flex items-center gap-3 rounded-row px-3 py-3" data-testid="material-row" :data-kind="row.kind">
    <span class="flex size-9 shrink-0 items-center justify-center rounded-control bg-subtle text-fg-muted" aria-hidden="true">
      <FileText v-if="row.kind === 'pdf'" class="size-4.5" />
      <NotebookText v-else class="size-4.5" />
    </span>

    <div class="min-w-0 flex-1">
      <NuxtLink v-if="openTo" ref="titleLink" :to="openTo" class="font-medium break-words text-fg-strong hover:text-action-fg focus-visible:text-action-fg" data-testid="material-title">
        {{ row.title }}
      </NuxtLink>
      <span v-else class="font-medium break-words text-fg-strong" data-testid="material-title">{{ row.title }}</span>

      <!-- State of a PDF that is not ready (only this line updates while it reads, G4) -->
      <p v-if="row.status === 'generating' || row.status === 'processing'" class="flex flex-wrap items-center gap-x-2 text-meta text-fg-muted" aria-live="polite">
        <UiSpinner size="sm" />
        <span>{{ progressText }}</span>
      </p>
      <p v-else-if="row.status === 'failed'" class="flex flex-wrap items-center gap-x-2 text-meta text-danger">
        <span>Não deu para ler o PDF</span>
        <button type="button" class="min-h-touch font-medium text-action-fg underline underline-offset-2" @click="$emit('retry', row)">Tentar de novo</button>
      </p>
      <p v-else-if="row.status === 'blocked'" class="flex flex-wrap items-center gap-x-2 text-meta text-fg-muted">
        <template v-if="reason === 'feature_limit'">
          <span>Limite do mês atingido</span>
          <button type="button" class="min-h-touch font-medium text-action-fg underline underline-offset-2" @click="openPlans">Ver planos</button>
        </template>
        <template v-else-if="reason === 'pages_cap'">
          <span>Limite de leitura da IA atingido este mês</span>
        </template>
        <template v-else>
          <span>Resumo ainda não gerado</span>
          <button type="button" class="min-h-touch font-medium text-action-fg underline underline-offset-2" @click="$emit('retry', row)">Gerar resumo</button>
        </template>
      </p>
      <template v-else>
        <p class="text-meta text-fg-muted" data-testid="material-meta">{{ metaText }}</p>
        <!-- The automatic cards, per part: state and reason in the line (prd-4c-material-v3 RF-B9) -->
        <LazyCadernoMaterialCardsState v-if="row.kind === 'pdf' && row.auto_cards_status && row.auto_cards_status !== 'completed'" :row="row" />
      </template>
      <!-- Phone: the button goes under the text, so the title keeps the width -->
      <UiButton v-if="canReview" size="sm" class="mt-2 sm:hidden" :to="reviewPath(scope)">Revisar {{ row.session_count }}</UiButton>
    </div>

    <UiButton
      v-if="canReview"
      size="sm"
      class="shrink-0 max-sm:hidden"
      :to="reviewPath(scope)"
      data-testid="material-review"
    >
      Revisar {{ row.session_count }}
    </UiButton>
    <UiMenu :items="menuItems" :label="`Mais ações de ${row.title}`">
      <template #trigger="{ props: trigger }">
        <UiIconButton :icon="Ellipsis" :label="`Mais ações de ${row.title}`" v-bind="trigger" @focus="loadErrors" @click="loadErrors" />
      </template>
    </UiMenu>
  </div>
</template>

<script setup lang="ts">
// One material of the scope (prd-4b-caderno-v3 RF-F6): a PDF with its parts, or a note, in one line with
// what it has ("PDF · 212 páginas · 6 partes · 148 cards · domínio 44%"), "Revisar N" of its own slice
// (scope=document:/note:, F2) and the ⋯ with Abrir, Só erros (N), Praticar adiantado, cards and Excluir.
// A PDF still reading (progress per part) or making its automatic cards polls GET /documents/{id} every 4 s and
// updates only this line; why the cards or the note did not come is said here.
import { Ellipsis, FileText, NotebookText } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { Document, MaterialRow } from '~/types'
import { reviewPath, scopeQuery, type ReviewScope } from '~/utils/reviewScope'

const props = defineProps<{
  row: MaterialRow
  /** The open scope: a material of another matéria says where it is */
  scopeId: string
  /** Why the automatic note was not started, known right after an upload here */
  blockedReason?: string | null
}>()
const emit = defineEmits<{
  (e: 'retry', row: MaterialRow): void
  (e: 'delete', row: MaterialRow): void
  (e: 'view-pdf', row: MaterialRow): void
  (e: 'ready', row: MaterialRow): void
}>()

const store = useScopeStore()
const titleLink = ref<{ $el: HTMLElement } | null>(null)

const scope = computed<ReviewScope>(() => (props.row.kind === 'pdf' ? { type: 'document', id: props.row.id } : { type: 'note', id: props.row.id }))
const canReview = computed(() => props.row.status === 'ready' && props.row.session_count > 0)
const openTo = computed(() => (props.row.note_id ? cadernoPath(props.row.topic.id, { note: props.row.note_id }) : null))

const fmt = (n: number) => n.toLocaleString('pt-BR')
function words(n: number): string {
  if (n >= 1000) return `${(Math.round(n / 100) / 10).toLocaleString('pt-BR')} mil palavras`
  return `${fmt(n)} ${n === 1 ? 'palavra' : 'palavras'}`
}

const metaText = computed(() => {
  const r = props.row
  const parts: string[] = [r.kind === 'pdf' ? 'PDF' : 'Nota']
  if (r.kind === 'pdf') {
    if (r.pages) parts.push(`${fmt(r.pages)} ${r.pages === 1 ? 'página' : 'páginas'}`)
    if (r.parts && r.parts > 1) parts.push(`${r.parts} partes`)
  } else if (r.words) {
    parts.push(words(r.words))
  }
  parts.push(r.cards ? `${fmt(r.cards)} ${r.cards === 1 ? 'card' : 'cards'}` : 'sem cards')
  if (r.mastery !== null && r.cards) parts.push(`domínio ${r.mastery}%`)
  if (r.topic.id !== props.scopeId) parts.push(r.topic.name)
  return parts.join(' · ')
})

const progressText = computed(() => {
  const p = props.row.progress
  return props.row.status === 'generating' && p?.total ? partProgressText(p.done, p.total) : 'Lendo o PDF…'
})

// The reason comes with the line since the 4b-2 API; right after an upload here, from the upload's answer
const reason = computed(() => props.row.blocked_reason ?? props.blockedReason ?? null)

const cardsBusy = computed(() => props.row.kind === 'pdf' && (props.row.auto_cards_status === 'pending' || props.row.auto_cards_status === 'generating'))

// "Só erros (N)" of this material: counted when its menu opens (F2)
const errors = ref<number | null | undefined>(undefined)
async function loadErrors() {
  if (errors.value !== undefined || !props.row.cards) return
  errors.value = null
  try {
    const res = await useNuxtApp().$api<{ data: { session_count: number } }>(`/review/session-count?${scopeQuery(scope.value, { errorsOnly: true })}`)
    errors.value = res.data.session_count
  } catch (e) {
    errors.value = undefined
    reportApiError(e, { silent: true })
  }
}

const menuItems = computed<MenuItem[]>(() => {
  const r = props.row
  const items: MenuItem[] = []
  if (openTo.value) items.push({ label: 'Abrir', to: openTo.value })
  if (r.kind === 'pdf') items.push({ label: 'Ver o PDF', onSelect: () => emit('view-pdf', r) })
  if (r.cards) {
    const n = errors.value
    if (n === undefined || n === null) items.push({ label: 'Só erros', meta: 'contando…', disabled: true })
    else if (n === 0) items.push({ label: 'Só erros', meta: 'nenhum agora', disabled: true })
    else items.push({ label: `Só erros (${n})`, to: reviewPath(scope.value, { errorsOnly: true }) })
    if (r.ahead_count > 0 && r.session_count === 0) items.push({ label: `Praticar adiantado (${r.ahead_count})`, to: reviewPath(scope.value, { ahead: true }) })
    items.push({ label: `Ver e editar os ${fmt(r.cards)} cards`, to: cadernoPath(r.topic.id, { view: 'cards', sourceNoteId: r.note_id }) })
  }
  items.push({ label: 'Excluir', tone: 'danger', separator: items.length > 0, onSelect: () => emit('delete', r) })
  return items
})

function openPlans() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: { feature: 'pdf_to_note', planRequired: 'pro' } }))
}

// A PDF reading, or making its cards: only this line asks GET /documents/{id} (usePoll stops on unmount and in a hidden tab)
const reading = computed(() => props.row.kind === 'pdf' && (props.row.status === 'generating' || props.row.status === 'processing' || cardsBusy.value))
const poll = usePoll(async (signal) => {
  const res = await useNuxtApp().$api<{ data: Document }>(`/documents/${props.row.id}`, { signal })
  const status = store.applyDocument(res.data)
  if (status !== 'generating' && status !== 'processing' && !cardsBusy.value) {
    await store.refreshRow('pdf', props.row.id)
    emit('ready', props.row)
  }
}, { interval: 4000, immediate: false, timeout: 30 * 60 * 1000, until: () => !reading.value })
watch(reading, (on) => { if (on) poll.start(); else poll.stop() }, { immediate: true })

defineExpose({ focus: () => titleLink.value?.$el?.focus() })
</script>
