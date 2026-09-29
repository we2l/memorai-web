import { defineStore } from 'pinia'
import type { Document } from '~/types'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<Document[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)
  const currentTopicId = ref<string | null>(null)

  async function fetchForTopic(topicId: string, force = false, signal?: AbortSignal) {
    if (!topicId) return
    if (loading.value && !force) return
    if (!force && currentTopicId.value === topicId && documents.value.length > 0) return

    loading.value = true
    try {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Document[] }>('/documents', { params: { topic_id: topicId }, signal })
      announceAutoCards(documents.value, res.data)
      documents.value = res.data // filtered by topic_id on the server
      currentTopicId.value = topicId
      error.value = null
    } catch (e) {
      // Aborted polls are expected; real failures show inline in the Material tab
      if (!signal?.aborted) {
        error.value = e
        reportApiError(e, { silent: true })
      }
    } finally {
      loading.value = false
    }

    // Always check if polling should start/stop after fetch
    if (needsPolling.value && !poller.isActive.value) {
      startPolling()
    } else if (!needsPolling.value && poller.isActive.value) {
      stopPolling()
    }
  }

  // Polling (usePoll: pauses with hidden tab, never overlaps requests)
  const poller = usePoll(
    signal => fetchForTopic(currentTopicId.value!, true, signal),
    { interval: 4000, timeout: 10 * 60 * 1000, immediate: false, until: () => !needsPolling.value },
  )

  const needsPolling = computed(() =>
    documents.value.some(d =>
      d.note_generation_status === 'generating' ||
      d.status === 'processing' ||
      d.auto_cards_status === 'pending' ||
      d.auto_cards_status === 'generating',
    ),
  )

  /** Toast when a PDF's automatic cards finish during the session (RF-F5.3). */
  function announceAutoCards(previous: Document[], next: Document[]) {
    for (const doc of next) {
      const before = previous.find(d => d.id === doc.id)
      const wasRunning = before?.auto_cards_status === 'pending' || before?.auto_cards_status === 'generating'
      if (!wasRunning || doc.auto_cards_status !== 'completed') continue
      const topicId = doc.topic_id
      useToast().show(`${doc.auto_cards_count ?? 0} cards prontos de "${doc.original_name}"`, 'success', {
        action: { label: 'Revisar agora', onClick: () => navigateTo(topicId ? `/revisar?topic_id=${topicId}` : '/revisar') },
      })
    }
  }

  function startPolling() {
    if (!currentTopicId.value) return
    poller.start()
  }

  function stopPolling() {
    poller.stop()
  }

  function reset() {
    stopPolling()
    documents.value = []
    currentTopicId.value = null
    loading.value = false
    error.value = null
  }

  return {
    documents,
    loading,
    error,
    currentTopicId,
    needsPolling,
    fetchForTopic,
    startPolling,
    stopPolling,
    reset,
  }
})
