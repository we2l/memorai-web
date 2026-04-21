<template>
  <div class="flex h-[calc(100vh-64px)] lg:h-screen">
    <!-- Sidebar conversas -->
    <aside class="w-64 bg-surface-secondary border-r border-base flex-shrink-0 flex flex-col hidden md:flex">
      <div class="p-4">
        <button class="btn-primary w-full text-small" @click="chat.newConversation()">
          <Plus :size="16" /> Nova conversa
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-2" aria-label="Conversas">
        <div
          v-for="conv in chat.conversations"
          :key="conv.id"
          class="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-1 transition-colors"
          :class="chat.currentId === conv.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-base-muted hover:bg-surface-tertiary'"
          @click="chat.loadConversation(conv.id)"
        >
          <span class="text-small truncate flex-1">{{ conv.title }}</span>
          <button
            class="text-base-muted hover:text-danger ml-2 opacity-0 group-hover:opacity-100"
            aria-label="Deletar conversa"
            @click.stop="chat.deleteConversation(conv.id)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
        <p v-if="!chat.conversations.length" class="text-small text-base-muted px-3 py-4">
          Nenhuma conversa ainda
        </p>
      </nav>
    </aside>

    <!-- Chat area -->
    <div class="flex-1 flex flex-col">
      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 space-y-4">
        <div v-if="!chat.messages.length && !chat.loading" class="flex flex-col items-center justify-center h-full text-center">
          <MessageCircle :size="48" class="text-base-muted mb-3" />
          <h2 class="text-heading mb-1">Tirar dúvidas</h2>
          <p class="text-base-muted text-small max-w-md">
            Pergunte sobre seus materiais de estudo. A IA responde com base nos seus PDFs e notas.
          </p>
        </div>

        <div v-if="chat.loading" class="flex justify-center py-8">
          <div class="animate-spin text-accent-primary">⏳</div>
        </div>

        <div
          v-for="msg in chat.messages"
          :key="msg.id"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] rounded-2xl px-4 py-3"
            :class="msg.role === 'user'
              ? 'bg-accent-primary text-white rounded-br-md'
              : 'bg-surface-tertiary text-base-primary rounded-bl-md'"
          >
            <div class="text-small whitespace-pre-wrap" v-html="msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content" />
          </div>
        </div>

        <div v-if="chat.sending" class="flex justify-start">
          <div class="bg-surface-tertiary rounded-2xl rounded-bl-md px-4 py-3">
            <span class="text-small text-base-muted animate-pulse">Digitando...</span>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="border-t border-base p-4">
        <form class="flex gap-3" @submit.prevent="send">
          <label for="chat-input" class="sr-only">Mensagem</label>
          <input
            id="chat-input"
            v-model="message"
            type="text"
            class="input flex-1"
            placeholder="Digite sua dúvida..."
            maxlength="2000"
            :disabled="chat.sending"
          />
          <button type="submit" class="btn-primary" :disabled="!message.trim() || chat.sending">
            <Send :size="18" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Trash2, Send, MessageCircle } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'default' })

const chat = useChatStore()
const message = ref('')
const messagesContainer = ref<HTMLElement>()

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-surface-secondary px-1 rounded">$1</code>')
    .replace(/\n/g, '<br>')
}

async function send() {
  if (!message.value.trim() || chat.sending) return
  const msg = message.value
  message.value = ''
  try {
    await chat.sendMessage(msg)
    nextTick(() => {
      messagesContainer.value?.scrollTo({ top: messagesContainer.value.scrollHeight, behavior: 'smooth' })
    })
  } catch (e: any) {
    useToast().error(e?.data?.message || 'Erro ao enviar mensagem')
  }
}

// Scroll on new messages
watch(() => chat.messages.length, () => {
  nextTick(() => {
    messagesContainer.value?.scrollTo({ top: messagesContainer.value.scrollHeight, behavior: 'smooth' })
  })
})

onMounted(() => {
  chat.fetchConversations()
})
</script>
