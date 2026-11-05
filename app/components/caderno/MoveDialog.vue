<template>
  <UiDialog v-model="open" :title="title" :description="description">
    <UiInput
      v-if="targets.length > SEARCH_FROM"
      v-model="q"
      type="search"
      label="Buscar destino"
      hide-label
      placeholder="Buscar caderno ou matéria…"
      class="mb-2"
      data-testid="move-search"
    />

    <div v-if="loading" aria-busy="true">
      <span class="sr-only" role="status">Carregando os cadernos…</span>
      <UiSkeleton v-for="i in 4" :key="i" variant="row" />
    </div>
    <UiErrorState v-else-if="failed" variant="inline" title="Não foi possível carregar os cadernos" @retry="loadTree" />
    <p v-else-if="!options.length" class="py-2 text-body break-words text-fg-muted" role="status">Nada com “{{ q }}”.</p>
    <UiRadioGroup
      v-else
      v-model="choice"
      :options="options"
      label="Destino"
      hide-label
      data-testid="move-targets"
    />

    <template #footer>
      <p v-if="error" class="w-full text-meta text-danger" role="alert" data-testid="move-error">
        {{ error.message }}
        <UiLink v-if="error.next" :to="error.next.to" @click="open = false">{{ error.next.label }}</UiLink>
      </p>
      <UiButton @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" :loading="pending" data-testid="move-confirm" @click="move">Mover</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// "Mover para…" (prd-4b-caderno-v3 RF-F15): every caderno, matéria and assunto as a radio, the invalid ones
// disabled with the reason ("passaria de 2 níveis", "é o lugar atual"). Moving keeps the history and the origin
// (RN 9). A refusal of the server stays on the dialog, in words, with the next step: nothing is lost by retrying.
import type { RadioOption } from '~/components/ui/RadioGroup.vue'
import { filterTargets, moveTargets, NEW_CADERNO, type MoveItem } from '~/utils/moveTargets'
import { countOf, organizationError, type OrganizationErrorView } from '~/utils/organization'

const SEARCH_FROM = 8

const props = defineProps<{ item: MoveItem | null }>()
const emit = defineEmits<{ (e: 'moved', destination: { id: string | null; name: string; moved?: number }): void }>()
const open = defineModel<boolean>({ required: true })

const topicStore = useTopicStore()
const { $api } = useNuxtApp()
const toast = useToast()
const { track } = useAnalytics()

const q = ref('')
const choice = ref('')
const pending = ref(false)
const failed = ref(false)
const error = ref<OrganizationErrorView | null>(null)

const loading = computed(() => !topicStore.tree.length && topicStore.loading)
const targets = computed(() => (props.item ? moveTargets(topicStore.tree, props.item) : []))
const options = computed<RadioOption[]>(() => {
  const searching = q.value.trim().length > 0
  return filterTargets(targets.value, q.value).map(t => ({
    value: t.value,
    label: t.name,
    disabled: !!t.reason,
    description: t.reason ?? (searching && t.path.length ? `em ${t.path.join(' › ')}` : undefined),
    level: searching ? 0 : t.level,
  }))
})

const title = computed(() => {
  const item = props.item
  if (!item) return 'Mover'
  return item.kind === 'cards' ? `Mover ${countOf(item.ids.length, 'card', 'cards')}` : `Mover “${item.name}”`
})
const description = computed(() => {
  switch (props.item?.kind) {
    case 'topic': return 'Vão junto os assuntos, os materiais e os cards, com o histórico.'
    case 'pdf': return 'Vão junto as partes e os cards, com o histórico.'
    case 'note': return 'Vão junto os cards desta nota, com o histórico.'
    case 'cards': return 'Eles mantêm o histórico e a origem.'
    default: return undefined
  }
})

async function loadTree() {
  failed.value = false
  await topicStore.fetchTree()
  failed.value = !!topicStore.error && !topicStore.tree.length
}

watch(open, (isOpen) => {
  if (!isOpen) return
  q.value = ''
  choice.value = ''
  error.value = null
  if (!topicStore.tree.length) void loadTree()
}, { immediate: true })

// The choice hidden by the search does not go unnoticed: choosing again is one click
watch(q, () => { if (choice.value && !options.value.some(o => o.value === choice.value)) choice.value = '' })

function request(item: MoveItem, destination: string) {
  const topicId = destination === NEW_CADERNO ? null : destination
  switch (item.kind) {
    case 'topic': return $api(`/topics/${item.id}`, { method: 'PUT', body: { parent_id: topicId } })
    case 'note': return $api(`/notes/${item.id}`, { method: 'PUT', body: { topic_id: topicId } })
    case 'pdf': return $api(`/documents/${item.id}`, { method: 'PATCH', body: { topic_id: topicId } })
    case 'cards': return $api<{ data: { moved: number } }>('/flashcards/move', { method: 'POST', body: { card_ids: item.ids, topic_id: topicId } })
  }
}

async function move() {
  const item = props.item
  if (!item || pending.value) return
  const target = targets.value.find(t => t.value === choice.value)
  if (!target || target.reason) {
    error.value = { code: 'no_choice', message: 'Escolha um destino.' }
    return
  }
  error.value = null
  pending.value = true
  try {
    const res = await request(item, target.value)
    track('item_move', { kind: item.kind })
    const moved = (res as { data?: { moved?: number } } | undefined)?.data?.moved
    const id = target.value === NEW_CADERNO ? null : target.value
    announce(item, target.name, id, moved)
    open.value = false
    void topicStore.fetchTree()
    emit('moved', { id, name: target.name, moved })
  } catch (e) {
    const view = organizationError(e)
    if (view) error.value = view
    else reportApiError(e, { error: 'Não foi possível mover. Tente de novo.' })
  } finally {
    pending.value = false
  }
}

function announce(item: MoveItem, name: string, id: string | null, moved?: number) {
  const to = id ?? (item.kind === 'topic' ? item.id : null)
  const message = item.kind === 'cards'
    ? `${countOf(moved ?? item.ids.length, 'card movido', 'cards movidos')} para ${name}.`
    : id ? `Movido para ${name}.` : `“${item.kind === 'topic' ? item.name : name}” agora é um caderno.`
  toast.show(message, 'success', to ? { action: { label: 'Abrir', onClick: () => { void navigateTo(cadernoPath(to)) } } } : undefined)
}
</script>
