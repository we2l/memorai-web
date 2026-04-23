<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="chat.isOpen"
        class="fixed inset-0 bg-black/40 z-40"
        @click="chat.close()"
      />
    </Transition>

    <!-- Drawer -->
    <Transition name="slide-right">
      <div
        v-if="chat.isOpen"
        ref="drawerRef"
        class="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-overlay z-50 flex flex-col border-l border-base"
        role="dialog"
        aria-modal="true"
        aria-label="Chat com IA"
        @keydown.escape="chat.close()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-base shrink-0">
          <div class="flex-1 min-w-0">
            <p class="text-small font-medium text-base-primary truncate">
              💬 {{ contextLabel }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="p-1.5 rounded-lg text-base-muted hover:text-base-secondary hover:bg-surface-tertiary transition-colors"
              title="Histórico"
              @click="showHistory = !showHistory"
            >
              <Clock :size="16" />
            </button>
            <button
              class="p-1.5 rounded-lg text-base-muted hover:text-base-secondary hover:bg-surface-tertiary transition-colors"
              title="Nova conversa"
              @click="chat.newConversation()"
            >
              <Plus :size="16" />
            </button>
            <button
              class="p-1.5 rounded-lg text-base-muted hover:text-base-secondary hover:bg-surface-tertiary transition-colors"
              aria-label="Fechar chat"
              @click="chat.close()"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <!-- Conversation history -->
        <div v-if="showHistory" class="border-b border-base max-h-48 overflow-y-auto">
          <button
            v-for="conv in chat.conversations"
            :key="conv.id"
            class="w-full text-left px-4 py-2 text-small hover:bg-surface-tertiary transition-colors truncate"
            :class="chat.currentId === conv.id && 'text-accent-primary bg-accent-primary-subtle'"
            @click="chat.loadConversation(conv.id); showHistory = false"
          >
            {{ conv.title }}
          </button>
          <p v-if="!chat.conversations.length" class="px-4 py-3 text-micro text-base-muted">Nenhuma conversa ainda</p>
        </div>

        <!-- Card anexado (quando vem de erro na revisão) -->
        <div
          v-if="chat.currentContext.source === 'review_error' && chat.currentContext.cardFront"
          class="mx-4 mt-3 p-3 rounded-lg bg-surface-tertiary border border-base text-small"
        >
          <p class="text-micro text-base-muted mb-1">Card errado:</p>
          <p class="text-base-primary" v-html="chat.currentContext.cardFront" />
        </div>

        <!-- Messages -->
        <div ref="messagesRef" class="flex-1 overflow-y-auto p-4 space-y-3">
          <div v-if="!chat.messages.length && !chat.loading" class="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle :size="36" class="text-base-muted mb-2" />
            <p class="text-small text-base-muted">Pergunte sobre seus materiais de estudo.</p>
          </div>

          <div
            v-for="msg in chat.messages"
            :key="msg.id"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-small"
              :class="msg.role === 'user'
                ? 'bg-accent-primary text-white rounded-br-md'
                : 'bg-surface-tertiary text-base-primary rounded-bl-md prose-chat'"
              v-html="msg.role === 'assistant' ? marked.parse(msg.content) : msg.content"
            />
          </div>

          <!-- Follow-up chips after last assistant message -->
          <div v-if="chat.messages.length && chat.messages[chat.messages.length - 1]?.role === 'assistant' && !chat.sending" class="flex flex-wrap gap-1.5">
            <button
              v-for="chip in followUpChips"
              :key="chip"
              class="px-2.5 py-1 rounded-full text-micro bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary hover:text-white transition-colors"
              @click="sendChip(chip)"
            >
              {{ chip }}
            </button>
          </div>

          <div v-if="chat.sending" class="flex justify-start">
            <div class="bg-surface-tertiary rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <span class="text-base-muted text-small animate-pulse">Pensando...</span>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="p-3 border-t border-base shrink-0">
          <form class="flex gap-2" @submit.prevent="handleSend">
            <input
              ref="inputRef"
              v-model="message"
              class="input-base flex-1 !min-h-[2.5rem]"
              placeholder="Digite sua dúvida..."
              :disabled="chat.sending"
            />
            <button
              type="submit"
              class="btn-primary !p-2.5 !min-h-[2.5rem]"
              :disabled="!message.trim() || chat.sending"
              aria-label="Enviar mensagem"
            >
              <Send :size="16" />
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X, Plus, Send, MessageCircle, Clock } from 'lucide-vue-next'
import { marked } from 'marked'

marked.setOptions({ breaks: true })

const chat = useChatStore()
const message = ref('')
const showHistory = ref(false)
const messagesRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()
const drawerRef = ref<HTMLElement>()

const contextLabel = computed(() => {
  if (chat.currentContext.topicName) return `Sobre: ${chat.currentContext.topicName}`
  if (chat.currentContext.cardFront) return 'Sobre este card'
  return 'Chat geral'
})

const followUpChips = computed(() => {
  if (chat.currentContext.source === 'review_error') {
    return ['Sugerir cards de reforço', 'Explicar de outro jeito', 'Dar um exemplo']
  }
  return ['Sugerir cards sobre isso', 'Explicar de outro jeito', 'Aprofundar']
})

function sendChip(text: string) {
  message.value = text
  handleSend()
}

async function handleSend() {
  if (!message.value.trim() || chat.sending) return
  const msg = message.value
  message.value = ''
  try {
    await chat.sendMessage(msg)
    await nextTick()
    scrollToBottom()
  } catch {
    useToast().show('Erro ao enviar mensagem.', 'error')
  }
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// Auto-detect context from route when opening manually (no explicit context)
const route = useRoute()
watch(() => chat.isOpen, async (open) => {
  if (open) {
    // If opened without explicit context (manual/Ctrl+K), infer from route
    if (!chat.currentContext.source) {
      const topicMatch = route.path.match(/\/topics/)
      const topicId = route.query.topic as string | undefined
      if (topicId) {
        chat.currentContext = { topicId, source: 'manual' }
      }
    }
    if (!chat.conversations.length) await chat.fetchConversations()
    await nextTick()
    inputRef.value?.focus()
  }
})

// Scroll to bottom on new messages
watch(() => chat.messages.length, async () => {
  await nextTick()
  scrollToBottom()
})

// Ctrl+K / ⌘K global shortcut
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    chat.toggle()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 200ms ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.prose-chat :deep(p) { margin: 0.25em 0; }
.prose-chat :deep(strong) { font-weight: 600; }
.prose-chat :deep(ul), .prose-chat :deep(ol) { padding-left: 1.2em; margin: 0.25em 0; }
.prose-chat :deep(li) { margin: 0.1em 0; }
.prose-chat :deep(code) { background: rgba(255,255,255,0.1); padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.85em; }
.prose-chat :deep(pre) { background: rgba(0,0,0,0.2); padding: 0.5em; border-radius: 6px; overflow-x: auto; margin: 0.5em 0; }
</style>
