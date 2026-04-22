<template>
  <div class="flex fixed inset-0 lg:left-[220px] top-0 bottom-0 z-10 bg-surface">
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
          class="group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-1 transition-colors"
          :class="chat.currentId === conv.id ? 'bg-accent-primary/10 text-accent-primary' : 'text-base-muted hover:bg-surface-tertiary'"
          @click="chat.loadConversation(conv.id)"
        >
          <span class="text-small truncate flex-1">{{ conv.title }}</span>
          <button
            class="text-base-muted hover:text-danger ml-2 opacity-0 group-hover:opacity-100"
            aria-label="Deletar conversa"
            @click.stop="confirmDeleteConv(conv.id)"
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
            <div class="text-small prose-chat" v-if="msg.role === 'assistant'" v-html="renderMarkdown(msg.content)" />
            <div class="text-small whitespace-pre-wrap" v-else>{{ msg.content }}</div>
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
            class="input-base flex-1"
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
    <UiConfirmModal
      v-model="showDeleteConv"
      title="Excluir conversa?"
      message="Essa ação não pode ser desfeita."
      confirm-label="Excluir"
      @confirm="handleDeleteConv"
    />
  </div>
</template>

<script setup lang="ts">
import { Plus, Trash2, Send, MessageCircle } from 'lucide-vue-next'
import { marked } from 'marked'



const chat = useChatStore()
const message = ref('')
const messagesContainer = ref<HTMLElement>()
const showDeleteConv = ref(false)
const deleteConvId = ref<string | null>(null)

function confirmDeleteConv(id: string) {
  deleteConvId.value = id
  showDeleteConv.value = true
}

async function handleDeleteConv() {
  if (deleteConvId.value) {
    await chat.deleteConversation(deleteConvId.value)
    deleteConvId.value = null
  }
  showDeleteConv.value = false
}

function renderMarkdown(text: string): string {
  return marked.parse(text, { breaks: true }) as string
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
    useToast().show(e?.data?.message || 'Erro ao enviar mensagem', 'error')
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

<style scoped>
.prose-chat {
  line-height: 1.6;
}
.prose-chat :deep(h1),
.prose-chat :deep(h2),
.prose-chat :deep(h3) {
  font-weight: 600;
  margin: 1rem 0 0.25rem;
  line-height: 1.4;
}
.prose-chat :deep(h3) { font-size: 0.9rem; }
.prose-chat :deep(ul),
.prose-chat :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}
.prose-chat :deep(li) {
  margin: 0.2rem 0;
}
.prose-chat :deep(li > ul),
.prose-chat :deep(li > ol) {
  margin: 0.15rem 0;
}
.prose-chat :deep(strong) {
  font-weight: 600;
}
.prose-chat :deep(code) {
  background: var(--bg-secondary, rgba(0,0,0,0.05));
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}
.prose-chat :deep(p) {
  margin: 0.5rem 0;
}
.prose-chat :deep(p:first-child) {
  margin-top: 0;
}
.prose-chat :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
