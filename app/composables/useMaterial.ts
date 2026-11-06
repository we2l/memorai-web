import type { LibraryCard, LibraryPage, NoteMaterial } from '~/types'

/** Rows of "Cards desta parte" (RF-F4): the next 8 by due date. */
export const PANEL_CARDS = 8

/**
 * What the material route shows around the text (prd-4c-material-v3 RF-B1, tasks 6.1/7.1): the context of
 * GET /notes/{id}/material (path, PDF, parts, the note's numbers and the cards_ai left) and the panel's
 * cards (GET /topics/{root}/flashcards?origin=note:<id>&limit=8&sort=due). The text itself and its
 * autosave are `useMaterialEditor`. `reload()` runs after a card is created or accepted, so the panel
 * and "Revisar estes N" change without reloading the page.
 */
export function useMaterial(noteId: Ref<string>) {
  const { $api } = useNuxtApp()

  const context = shallowRef<NoteMaterial | null>(null)
  const cards = shallowRef<LibraryCard[]>([])
  const loading = ref(false)
  const missing = ref(false)
  const failed = ref(false)

  /** The caderno the note lives in: the library scope that surely holds every card of the note. */
  const rootId = computed(() => context.value?.path[0]?.id ?? context.value?.note.topic_id ?? null)

  async function loadCards(id = noteId.value) {
    const root = rootId.value
    if (!root || !context.value?.cards.total) {
      cards.value = []
      return
    }
    try {
      const res = await $api<LibraryPage>(`/topics/${root}/flashcards`, { query: { origin: `note:${id}`, limit: PANEL_CARDS, sort: 'due' } })
      if (id === noteId.value) cards.value = res.data
    } catch (e) {
      reportApiError(e, { silent: true })
    }
  }

  async function load() {
    const id = noteId.value
    loading.value = true
    missing.value = false
    failed.value = false
    try {
      const res = await $api<{ data: NoteMaterial }>(`/notes/${id}/material`)
      if (id !== noteId.value) return
      context.value = res.data
      await loadCards(id)
    } catch (e) {
      if (id !== noteId.value) return
      if (getErrorStatus(e) === 404) missing.value = true
      else failed.value = true
      reportApiError(e, { silent: true })
    } finally {
      if (id === noteId.value) loading.value = false
    }
  }

  /** After a card is created or accepted: the numbers and the list (no loading state, no flicker). */
  async function reload() {
    const id = noteId.value
    try {
      const res = await $api<{ data: NoteMaterial }>(`/notes/${id}/material`)
      if (id !== noteId.value) return
      context.value = res.data
      await loadCards(id)
    } catch (e) {
      reportApiError(e, { silent: true })
    }
  }

  function reset() {
    context.value = null
    cards.value = []
  }

  return { context, cards, loading, missing, failed, rootId, load, reload, reset }
}
