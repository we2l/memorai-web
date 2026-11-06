import type { TopicDetails } from '~/types'
import { gateFromError, type StudyGate } from '~/utils/studyRequirement'

/**
 * What a caderno still needs for a quiz or a podcast, read from GET /topics/{id}/details
 * (`can_quiz` / `can_podcast`, subtree) whenever the chosen caderno changes, so the sheet says the
 * requirement before the action (prd-caderno-f1-pontes RF-F5). `fromError` turns the 422 `{code,
 * requirement}` of the create call into the same gate: the screen never shows a raw 422.
 */
export function useTopicGate(topicId: () => string | null | undefined, key: 'can_quiz' | 'can_podcast') {
  const { $api } = useNuxtApp()
  const gate = ref<StudyGate | null>(null)
  const details = shallowRef<TopicDetails | null>(null)
  const loading = ref(false)
  let seq = 0

  async function load(id: string | null | undefined) {
    const n = ++seq
    gate.value = null
    details.value = null
    if (!id) {
      loading.value = false
      return
    }
    loading.value = true
    try {
      const res = await $api<{ data: TopicDetails }>(`/topics/${id}/details`)
      if (n !== seq) return
      details.value = res.data
      gate.value = res.data?.[key] ?? null
    } catch (e) {
      // Unknown gate: the create call still answers 422 with the code, and fromError says it
      reportApiError(e, { silent: true })
    } finally {
      if (n === seq) loading.value = false
    }
  }

  watch(topicId, load, { immediate: true })

  /** True when the error was a requirement (now shown as the gate); false for any other error. */
  function fromError(e: unknown): boolean {
    const g = gateFromError(e)
    if (!g) return false
    gate.value = g
    return true
  }

  const blocked = computed(() => gate.value?.ok === false)

  return { gate, details, loading, blocked, fromError, reload: () => load(topicId()) }
}
