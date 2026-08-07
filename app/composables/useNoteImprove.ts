import type { Note } from '~/types'

type ImproveState = 'idle' | 'loading' | 'preview'

export function useNoteImprove(topicId: Ref<string | null>) {
  const { $api } = useNuxtApp()
  const toast = useToast()
  const auth = useAuthStore()

  const state = ref<ImproveState>('idle')
  const improvedContent = ref<Record<string, any> | null>(null)
  const originalContent = ref<Record<string, any> | null>(null)
  const dismissed = ref(false)

  function isRawNote(content: Record<string, any> | null): boolean {
    if (!content?.content) return false
    const text = extractText(content)
    if (text.length < 200) return false
    const hasHeading = content.content.some((n: any) => n.type === 'heading')
    return !hasHeading
  }

  function extractText(content: Record<string, any>): string {
    let text = ''
    walkNodes(content.content || [], (t: string) => { text += t })
    return text
  }

  function walkNodes(nodes: any[], cb: (text: string) => void) {
    for (const node of nodes) {
      if (node.text) cb(node.text)
      if (node.content) walkNodes(node.content, cb)
    }
  }

  const showBanner = computed(() => {
    if (dismissed.value) return false
    if (state.value !== 'idle') return true // show loading/preview states
    return false // banner visibility controlled by caller checking isRawNote
  })

  const canUse = computed(() => {
    // Check from feature usage (fetched elsewhere) — simplified: always true for now
    // Real check done server-side via middleware
    return true
  })

  async function improve(note: Note) {
    if (!topicId.value || !note?.id) return
    if (state.value === 'loading') return

    originalContent.value = note.content ? JSON.parse(JSON.stringify(note.content)) : null
    state.value = 'loading'

    try {
      const res = await $api<{ data: { content: Record<string, any> } }>(
        `/topics/${topicId.value}/notes/${note.id}/improve`,
        { method: 'POST' },
      )
      improvedContent.value = res.data.content
      state.value = 'preview'
    } catch (e: any) {
      state.value = 'idle'
      const msg = e?.data?.message || 'Erro ao melhorar nota.'
      if (e?.data?.feature === 'note_improve') {
        toast.show('Limite atingido. Seja Pro para melhorar notas ilimitadas.', 'error')
      } else {
        toast.show(msg, 'error')
      }
    }
  }

  function apply(): Record<string, any> | null {
    const content = improvedContent.value
    state.value = 'idle'
    improvedContent.value = null
    originalContent.value = null
    return content
  }

  function discard(): Record<string, any> | null {
    const content = originalContent.value
    state.value = 'idle'
    improvedContent.value = null
    originalContent.value = null
    return content
  }

  function dismiss() {
    dismissed.value = true
  }

  function reset() {
    state.value = 'idle'
    improvedContent.value = null
    originalContent.value = null
    dismissed.value = false
  }

  return {
    state,
    improvedContent,
    originalContent,
    showBanner,
    canUse,
    dismissed,
    isRawNote,
    improve,
    apply,
    discard,
    dismiss,
    reset,
  }
}
