/**
 * "Por quê?" of the review (prd-visual-e2 RF-2.5, RF-B1): the explanation of a missed card from its own material, with
 * one tap. POST /chat {flashcard_id, intent: 'why'}: the server writes the question (≤ 120 words, ending in a
 * "Para lembrar:" line), uses the card, its note and the agent_chat quota; the conversation is saved, and "Perguntar
 * mais" opens the tira-dúvidas inside it. One explanation per card per session (opening it again costs nothing).
 * Quota 0 → the limit event (UpgradeModal or the paid plan's toast), never a request.
 */
import type { ChatContext } from '~/stores/chat'

export interface WhySource { label: string; page: number | null; note_id: string | null; document_id: string | null }
export interface WhyCard { id: string; front: string; topic_id?: string | null }
export type WhyStatus = 'idle' | 'loading' | 'ok' | 'error'

interface WhyResponse { data: { conversation_id: string; message: { content: string }; sources?: WhySource[] } }

/** Splits the answer at its "Para lembrar:" line (the server asks for it; absent, everything is the text). */
export function splitWhy(content: string): { text: string; remember: string } {
  const clean = content.replace(/\*\*(.+?)\*\*/g, '$1').trim()
  const m = /(?:^|\n)\s*(?:[-*>]\s*)?Para lembrar\s*:\s*/i.exec(clean)
  if (!m) return { text: clean, remember: '' }
  return { text: clean.slice(0, m.index).trim(), remember: clean.slice(m.index + m[0].length).trim() }
}

export function useReviewWhy() {
  const { $api } = useNuxtApp()
  const quota = usePaidQuota()
  const chat = useChatStore()

  const open = ref(false)
  const status = ref<WhyStatus>('idle')
  const card = shallowRef<WhyCard | null>(null)
  const text = ref('')
  const remember = ref('')
  const sources = ref<WhySource[]>([])
  const conversationId = ref<string | null>(null)
  let token = 0

  async function load() {
    const c = card.value
    if (!c) return
    const mine = ++token
    status.value = 'loading'
    try {
      const res = await $api<WhyResponse>('/chat', { method: 'POST', body: { flashcard_id: c.id, intent: 'why' } })
      if (mine !== token) return
      const parts = splitWhy(res.data.message.content)
      text.value = parts.text
      remember.value = parts.remember
      sources.value = res.data.sources ?? []
      conversationId.value = res.data.conversation_id
      status.value = 'ok'
      quota.countUse('agent_chat')
    } catch (e) {
      if (mine !== token) return
      status.value = 'error'
      // A 402 opens the plan modal (or the paid plan's toast) by itself; the rest only reports
      reportApiError(e, { silent: true })
    }
  }

  /** Opens the explanation of `c`; false when the quota is spent (the limit event went out instead). */
  function show(c: WhyCard): boolean {
    if (card.value?.id === c.id && status.value !== 'error' && status.value !== 'idle') {
      open.value = true
      return true
    }
    if (!quota.canUse('agent_chat')) {
      window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: quota.limitDetail('agent_chat') }))
      return false
    }
    card.value = c
    text.value = ''
    remember.value = ''
    sources.value = []
    conversationId.value = null
    open.value = true
    void load()
    return true
  }

  function retry() {
    void load()
  }

  function close() {
    open.value = false
  }

  /** Forget the explanation (a new session); a request still on its way is ignored. */
  function reset() {
    token++
    open.value = false
    status.value = 'idle'
    card.value = null
  }

  /** "Perguntar mais": the tira-dúvidas inside the same conversation, with the card attached. */
  async function askMore(topicId?: string | null) {
    const c = card.value
    const id = conversationId.value
    if (!c || !id) return
    const context: ChatContext = { cardId: c.id, cardFront: c.front, topicId: c.topic_id ?? topicId ?? undefined, source: 'review_error' }
    chat.newConversation()
    chat.open(context)
    try {
      await chat.loadConversation(id)
    } catch (e) {
      reportApiError(e, { silent: true })
    }
  }

  return { open, status, card, text, remember, sources, conversationId, show, retry, close, reset, askMore }
}

export type ReviewWhy = ReturnType<typeof useReviewWhy>
