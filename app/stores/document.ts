import { defineStore } from 'pinia'
import type { Document } from '~/types'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<Document[]>([])
  const loading = ref(false)
  const currentTopicId = ref<string | null>(null)

  async function fetchForTopic(topicId: string, force = false) {
    if (!topicId) return
    if (loading.value && !force) return
    if (!force && currentTopicId.value === topicId && documents.value.length > 0) return

    loading.value = true
    try {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Document[] }>('/documents', { params: { topic_id: topicId } })
      documents.value = res.data.filter(d => d.topic_id === topicId)
      currentTopicId.value = topicId
    } catch {
      // Silent — component shows empty state
    } finally {
      loading.value = false
    }

    // Always check if polling should start/stop after fetch
    if (needsPolling.value && !pollTimer) {
      startPolling()
    } else if (!needsPolling.value && pollTimer) {
      stopPolling()
    }
  }

  // Polling
  let pollTimer: ReturnType<typeof setInterval> | null = null
  const POLL_INTERVAL = 4000
  const POLL_TIMEOUT = 10 * 60 * 1000
  let pollStartedAt: number | null = null

  const needsPolling = computed(() =>
    documents.value.some(d =>
      d.note_generation_status === 'generating' ||
      d.status === 'processing',
    ),
  )

  function startPolling() {
    if (pollTimer) return
    if (!currentTopicId.value) return
    pollStartedAt = Date.now()
    pollTimer = setInterval(async () => {
      if (pollStartedAt && Date.now() - pollStartedAt > POLL_TIMEOUT) {
        stopPolling()
        return
      }
      if (currentTopicId.value) {
        await fetchForTopic(currentTopicId.value, true)
      }
    }, POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
      pollStartedAt = null
    }
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
