/**
 * "Colar questão errada" (prd-questao-errada RF-F2/F3): one sheet for the whole app, opened by "+ Adicionar",
 * the card library, the PWA shortcut (?add=question) and the hub. It writes into the topic given, else the
 * open scope, else the last one used. `created` ticks after each save, so a library on screen reloads.
 */
export type PasteOrigin = 'add' | 'library' | 'shortcut'

export function usePasteQuestion() {
  const open = useState('paste-question-open', () => false)
  const topicId = useState<string | null>('paste-question-topic', () => null)
  const created = useState('paste-question-created', () => 0)

  function show(origin: PasteOrigin, topic: string | null = null) {
    if (!useAuthStore().isAuthenticated) return
    topicId.value = topic
    open.value = true
    useAnalytics().track('question_paste_opened', { origin })
  }

  return { open, topicId, created, show }
}
