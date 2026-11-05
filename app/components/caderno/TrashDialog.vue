<template>
  <UiConfirmModal
    v-model="open"
    :title="item ? `Mandar “${item.name}” para a lixeira?` : ''"
    :message="message"
    confirm-label="Mandar para a lixeira"
    :loading="pending || previewLoading"
    :loading-label="pending ? 'Enviando…' : 'Contando o que vai junto…'"
    data-testid="trash-dialog"
    @confirm="confirm"
  >
    <p v-if="keeps" class="mb-4 text-meta text-fg-muted" data-testid="trash-keeps">{{ keeps }}</p>
  </UiConfirmModal>
</template>

<script setup lang="ts">
// Excluir (prd-4b-caderno-v3 RF-F16): nothing is deleted anymore, the item and all it contains go to the trash for
// 30 days. The dialog says what goes along (a caderno or matéria asks GET /topics/{id}/delete-preview; a material
// has its numbers on the line) and the toast restores the whole batch. Going for good is on /cadernos/lixeira.
import type { DeletePreview, TrashCounts, TrashReceipt } from '~/types'
import { keepsText, trashMessage } from '~/utils/organization'

export interface TrashItem {
  kind: 'topic' | 'note' | 'pdf'
  id: string
  name: string
  /** Depth of a topic (0 = caderno) */
  depth?: number
  /** A material knows what it has; a topic asks the preview */
  counts?: Partial<TrashCounts>
  /** Where "Desfazer" takes the person; empty = the same screen, refreshed */
  restoreTo?: string
}

const props = defineProps<{ item: TrashItem | null }>()
const emit = defineEmits<{ (e: 'trashed', receipt: TrashReceipt): void; (e: 'restored'): void }>()
const open = defineModel<boolean>({ required: true })

const { $api } = useNuxtApp()
const { track } = useAnalytics()
const topicStore = useTopicStore()
const noteStore = useNoteStore()
const scopeStore = useScopeStore()
const { offerUndo } = useTrashBatch()

const preview = ref<DeletePreview | null>(null)
const previewLoading = ref(false)
const pending = ref(false)

const message = computed(() => {
  const item = props.item
  if (!item) return ''
  if (item.kind === 'topic') {
    // Without the preview (it failed) the sentence does not guess numbers
    return preview.value ? trashMessage(preview.value, item.depth ?? 0) : 'Vai junto tudo o que está dentro. Você pode restaurar por 30 dias.'
  }
  return trashMessage(item.counts ?? {})
})
const keeps = computed(() => (props.item?.kind === 'topic' ? keepsText(preview.value) : ''))

let seq = 0
async function loadPreview(id: string) {
  const n = ++seq
  preview.value = null
  previewLoading.value = true
  try {
    const res = await $api<{ data: DeletePreview }>(`/topics/${id}/delete-preview`)
    if (n === seq) preview.value = res.data
  } catch (e) {
    reportApiError(e, { silent: true })
  } finally {
    if (n === seq) previewLoading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen && props.item?.kind === 'topic') void loadPreview(props.item.id)
}, { immediate: true })

async function send(item: TrashItem): Promise<TrashReceipt> {
  if (item.kind === 'topic') return topicStore.remove(item.id)
  if (item.kind === 'note') return noteStore.remove(item.id)
  const res = await $api<{ data: TrashReceipt }>(`/documents/${item.id}`, { method: 'DELETE' })
  void topicStore.fetchTree()
  return res.data
}

async function confirm() {
  const item = props.item
  if (!item || pending.value) return
  pending.value = true
  try {
    const receipt = await send(item)
    track('item_trash', { kind: item.kind })
    open.value = false
    offerUndo(item.name, receipt.trash_batch_id, () => {
      if (item.restoreTo) void navigateTo(item.restoreTo)
      else void scopeStore.refresh()
      emit('restored')
    })
    emit('trashed', receipt)
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível mandar para a lixeira. Tente de novo.' })
  } finally {
    pending.value = false
  }
}
</script>
