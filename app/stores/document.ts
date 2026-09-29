import { defineStore } from 'pinia'
import type { Document } from '~/types'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<Document[]>([])
  const loading = ref(false)
  const currentTopicId = ref<string | null>(null)

  async function fetchForTopic(topicId: string, force = false, signal?: AbortSignal) {
    if (!topicId) return
    if (loading.value && !force) return
    if (!force && currentTopicId.value === topicId && documents.value.length > 0) return

    loading.value = true
    try {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Document[] }>('/documents', { params: { topic_id: topicId }, signal })
      documents.value = res.data // filtered by topic_id on the server
      currentTopicId.value = topicId
    } catch {
      // Silent — component shows empty state
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
      d.status === 'processing',
    ),
  )

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
  }

  return {
    documents,
    loading,
    currentTopicId,
    needsPolling,
    fetchForTopic,
    startPolling,
    stopPolling,
    reset,
  }
})
