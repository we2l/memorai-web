import type { TrashBatch } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'
import { organizationError } from '~/utils/organization'

/** useState key: read directly by pages in the precache, so they do not import this once-* chunk. */
const TRASH_VERSION_KEY = 'trash-version'

/**
 * The batch of the trash (prd-4b-caderno-v3 RF-F16): restores it and offers "Desfazer" right after sending
 * something there. A restore the rules refuse says why, with the next step on the toast.
 */
export function useTrashBatch() {
  const { $api } = useNuxtApp()
  const toast = useToast()
  const { track } = useAnalytics()
  const topicStore = useTopicStore()
  // Screens that show the trash or the cadernos (the list, the trash itself) read again when a batch comes back
  const version = useState<number>(TRASH_VERSION_KEY, () => 0)

  async function restore(batchId: string, via: 'undo' | 'page'): Promise<TrashBatch> {
    const res = await $api<{ data: TrashBatch }>(`/trash/${batchId}/restore`, { method: 'POST' })
    track('trash_restore', { via })
    version.value++
    void topicStore.fetchTree()
    return res.data
  }

  function explain(e: unknown) {
    if (getErrorStatus(e) === 401) return
    const view = organizationError(e, 'restore')
    if (view) {
      const next = view.next
      toast.show(view.message, 'error', next ? { action: { label: next.label, onClick: () => { void navigateTo(next.to) } } } : undefined)
    } else {
      reportApiError(e, { error: 'Não foi possível restaurar. Tente de novo na lixeira.' })
    }
  }

  /** The toast after going to the trash: 10 s of "Desfazer" (paused on hover or focus), which restores the batch. */
  function offerUndo(name: string, batchId: string, onRestored: () => void) {
    toast.show(`“${name}” foi para a lixeira.`, 'success', {
      duration: 10_000,
      action: {
        label: 'Desfazer',
        onClick: async () => {
          try {
            await restore(batchId, 'undo')
            toast.show(`“${name}” voltou.`, 'success')
            onRestored()
          } catch (e) {
            explain(e)
          }
        },
      },
    })
  }

  return { restore, explain, offerUndo }
}
