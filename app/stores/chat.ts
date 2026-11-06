import type { Conversation, ChatMessage, ChatResponse } from '~/types'

/**
 * What the tira-dúvidas is about (prd-navegacao-v3 RF-9). The API takes topic_id and document_id
 * (SendMessageRequest); the card, the question and the excerpt travel in the prepared question.
 */
export interface ChatContext {
  topicId?: string
  topicName?: string
  /** The card of the review ("Explicar este card"); shown attached above the conversation */
  cardId?: string
  cardFront?: string
  documentId?: string
  /** Selected text of the note ("Perguntar sobre este trecho") */
  excerpt?: string
  source?: 'review_error' | 'review_card' | 'quiz_error' | 'pdf_summary' | 'note_help' | 'search' | 'manual'
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [] as Conversation[],
    currentId: null as string | null,
    messages: [] as ChatMessage[],
    loading: false,
    sending: false,
    isOpen: false,
    currentContext: {} as ChatContext,
    /** Prepared question: fills the input when the drawer opens; the person sends it (no AI call before) */
    draft: '',
  }),

  actions: {
    open(context?: ChatContext) {
      this.currentContext = context ?? {}
      this.isOpen = true
    },

    /** Contextual entry (card, wrong question, excerpt, search): a new conversation with a ready question. */
    ask(context: ChatContext, draft = '') {
      this.newConversation()
      this.draft = draft
      this.open(context)
    },

    close() {
      this.isOpen = false
    },

    toggle() {
      this.isOpen ? this.close() : this.open()
    },

    async fetchConversations() {
      const { $api } = useNuxtApp()
      try {
        const res = await $api<{ data: Conversation[] }>('/chat/conversations')
        this.conversations = res.data
      } catch (e) {
        reportApiError(e, { silent: true })
      }
    },

    async loadConversation(id: string) {
      const { $api } = useNuxtApp()
      this.currentId = id
      this.loading = true
      try {
        const res = await $api<{ data: { id: string; title: string; messages: ChatMessage[] } }>(`/chat/conversations/${id}`)
        this.messages = res.data.messages
      } finally {
        this.loading = false
      }
    },

    async sendMessage(message: string) {
      const { $api } = useNuxtApp()
      this.sending = true

      this.messages.push({
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      })

      try {
        const body: Record<string, any> = {
          conversation_id: this.currentId,
          message,
        }
        if (this.currentContext.topicId) body.topic_id = this.currentContext.topicId
        if (this.currentContext.documentId) body.document_id = this.currentContext.documentId
        // "Explicar este card" (prd-4d-revisao-v3 RF-B4): the server puts the card and its note in the context
        if (this.currentContext.cardId) body.flashcard_id = this.currentContext.cardId

        const res = await $api<{ data: ChatResponse }>('/chat', {
          method: 'POST',
          body,
        })

        this.currentId = res.data.conversation_id

        this.messages.push({
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: res.data.message.content,
          created_at: new Date().toISOString(),
        })

        await this.fetchConversations()
      } catch (e: any) {
        this.messages.pop()
        throw e
      } finally {
        this.sending = false
      }
    },

    async deleteConversation(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/chat/conversations/${id}`, { method: 'DELETE' })
      this.conversations = this.conversations.filter(c => c.id !== id)
      if (this.currentId === id) {
        this.currentId = null
        this.messages = []
      }
    },

    newConversation() {
      this.currentId = null
      this.messages = []
    },
  },
})
