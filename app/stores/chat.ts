import type { Conversation, ChatMessage, ChatResponse } from '~/types'

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [] as Conversation[],
    currentId: null as string | null,
    messages: [] as ChatMessage[],
    loading: false,
    sending: false,
  }),

  actions: {
    async fetchConversations() {
      const { $api } = useNuxtApp()
      try {
        const res = await $api<{ data: Conversation[] }>('/chat/conversations')
        this.conversations = res.data
      } catch {}
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

      // Optimistic: add user message
      this.messages.push({
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      })

      try {
        const res = await $api<{ data: ChatResponse }>('/chat', {
          method: 'POST',
          body: {
            conversation_id: this.currentId,
            message,
          },
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
        // Remove optimistic message on error
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
