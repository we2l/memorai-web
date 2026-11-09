<template>
  <UiSheet
    :model-value="chat.isOpen"
    :title="contextLabel"
    :description="contextDescription"
    :side="wide ? 'right' : 'bottom'"
    size="lg"
    @update:model-value="(v: boolean) => { if (!v) chat.close() }"
  >
    <div class="flex min-h-full flex-col gap-3">
      <div class="-ml-2 flex flex-wrap items-center gap-1">
        <UiButton size="sm" variant="ghost" :icon-left="Clock" :aria-expanded="showHistory ? 'true' : 'false'" @click="showHistory = !showHistory">Histórico</UiButton>
        <UiButton size="sm" variant="ghost" :icon-left="Plus" @click="startNew">Nova conversa</UiButton>
      </div>

      <ul v-if="showHistory" class="-mx-3 max-h-48 overflow-y-auto border-y border-line" aria-label="Conversas anteriores">
        <li v-for="conv in chat.conversations" :key="conv.id">
          <UiListRow as="button" :title="conv.title" :active="chat.currentId === conv.id" @click="openConversation(conv.id)" />
        </li>
        <li v-if="!chat.conversations.length" class="px-3 py-3 text-meta text-fg-muted">Nenhuma conversa ainda</li>
      </ul>

      <!-- What the question is about: the card, the wrong question or the excerpt -->
      <div v-if="attached" class="rounded-row bg-soft p-3 text-meta">
        <p class="text-label font-semibold text-fg-muted">{{ attached.label }}</p>
        <p class="mt-1 line-clamp-4 text-fg-strong" v-html="sanitize(attached.html)" />
      </div>

      <div class="flex flex-1 flex-col gap-3" aria-live="polite">
        <div v-if="!chat.messages.length && !chat.loading" class="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <MessageCircle class="size-9 text-fg-muted" aria-hidden="true" />
          <p class="text-meta text-fg-muted">Pergunte sobre seus materiais de estudo.</p>
        </div>

        <div
          v-for="msg in chat.messages"
          :key="msg.id"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-5/6 rounded-card px-3.5 py-2.5 text-meta"
            :class="msg.role === 'user' ? 'rounded-br-row bg-action text-on-action' : 'prose-chat rounded-bl-row bg-soft text-fg-strong'"
            v-html="msg.role === 'assistant' ? sanitize(marked.parse(msg.content) as string) : sanitize(msg.content)"
          />
        </div>

        <div v-if="showChips" class="flex flex-wrap gap-1.5">
          <UiButton v-for="chip in followUpChips" :key="chip" size="sm" @click="sendChip(chip)">{{ chip }}</UiButton>
        </div>

        <p v-if="chat.sending" class="text-meta text-fg-muted" role="status">Pensando...</p>
        <span ref="endRef" aria-hidden="true" />
      </div>
    </div>

    <template #footer>
      <div class="flex w-full flex-col gap-2">
        <LazyPlansUsageNotice feature="agent_chat" :usage="usage" />
        <form class="flex w-full items-end gap-2" @submit.prevent="handleSend">
          <UiInput
            ref="inputRef"
            v-model="message"
            label="Sua dúvida"
            hide-label
            class="flex-1"
            placeholder="Digite sua dúvida..."
            :disabled="chat.sending || spent"
          />
          <UiButton type="submit" variant="primary" :icon-left="Send" :disabled="!message.trim() || chat.sending || spent" aria-label="Enviar mensagem" />
        </form>
      </div>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
// Tira-dúvidas (prd-navegacao-v3 RF-9, tasks 7.4): a UiSheet on the right from 768 px and at the bottom on
// the phone, with the layer of UiDialog (Esc, focus trap and return, scroll lock). Opened in context, never
// by a floating button: "Explicar este card" (revisão), "Por que errei?" (simulado), "Perguntar sobre este
// trecho" (editor) and "Perguntar…" (busca). The context brings topic_id (and document_id) to the API and a
// ready question to the input; nothing is sent to the AI before the person presses Enviar.
import { Clock, MessageCircle, Plus, Send } from 'lucide-vue-next'
import { marked } from 'marked'

marked.setOptions({ breaks: true })

const { sanitize } = useSanitize()
const chat = useChatStore()
const route = useRoute()
const message = ref('')
const showHistory = ref(false)
const inputRef = ref<{ focus: () => void } | null>(null)
const endRef = ref<HTMLElement | null>(null)

// The paid plan's month of questions (prd-uso-justo RF-F3): /usage once per opening, counted here per answer
const usage = usePaidQuota()
const spent = computed(() => usage.atLimit('agent_chat'))

// right side from 768 px (same breakpoint as the TopNav)
const wide = ref(false)
let mq: MediaQueryList | null = null
const onMq = (e: MediaQueryListEvent) => { wide.value = e.matches }
onMounted(() => {
  mq = window.matchMedia('(min-width: 768px)')
  wide.value = mq.matches
  mq.addEventListener('change', onMq)
})
onBeforeUnmount(() => mq?.removeEventListener('change', onMq))

const topicStore = useTopicStore()
const contextLabel = computed(() => 'Tira-dúvidas')
const contextDescription = computed(() => {
  const ctx = chat.currentContext
  const name = ctx.topicName ?? (ctx.topicId ? topicStore.findById(ctx.topicId)?.name : undefined)
  return name ? `Sobre ${name}` : 'Sobre os seus cadernos'
})

const attached = computed(() => {
  const ctx = chat.currentContext
  if (ctx.excerpt) return { label: 'Trecho da nota', html: escapeHtml(ctx.excerpt) }
  if (ctx.cardFront) {
    const label = ctx.source === 'quiz_error' ? 'Questão que você errou' : ctx.source === 'review_error' ? 'Card que você errou' : 'Card'
    return { label, html: ctx.cardFront }
  }
  return null
})

const followUpChips = computed(() => {
  const s = chat.currentContext.source
  if (s === 'review_error' || s === 'review_card' || s === 'quiz_error') return ['Explicar de outro jeito', 'Dar um exemplo', 'Sugerir cards de reforço']
  return ['Explicar de outro jeito', 'Aprofundar', 'Sugerir cards sobre isso']
})
const showChips = computed(() => {
  const last = chat.messages[chat.messages.length - 1]
  return last?.role === 'assistant' && !chat.sending
})

function sendChip(text: string) {
  message.value = text
  void handleSend()
}

async function handleSend() {
  if (!message.value.trim() || chat.sending || spent.value) return
  const msg = message.value
  message.value = ''
  try {
    await chat.sendMessage(msg)
    usage.countUse('agent_chat')
  } catch (e) {
    message.value = msg
    reportApiError(e, { error: 'Erro ao enviar mensagem.' })
  }
}

function startNew() {
  chat.newConversation()
  message.value = ''
  inputRef.value?.focus()
}

async function openConversation(id: string) {
  showHistory.value = false
  try {
    await chat.loadConversation(id)
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível abrir a conversa.' })
  }
}

watch(() => chat.isOpen, async (open) => {
  if (!open) return
  // Opened without context (search "Perguntar ao tira-dúvidas"): the caderno of the route (05/#6)
  if (!chat.currentContext.topicId) {
    const topicId = scopeTopicOfRoute(route)
    if (topicId) chat.currentContext = { ...chat.currentContext, topicId, source: chat.currentContext.source ?? 'manual' }
  }
  if (chat.draft) {
    message.value = chat.draft
    chat.draft = ''
  }
  if (!chat.conversations.length) void chat.fetchConversations()
  void usage.fetchUsageForNotice()
  await nextTick()
  // rAF: the sheet focuses its first control; the input wins
  requestAnimationFrame(() => inputRef.value?.focus())
}, { immediate: true }) // lazy-mounted by the layout already open

watch(() => chat.messages.length, async () => {
  await nextTick()
  endRef.value?.scrollIntoView({ block: 'end' })
})
</script>

<style scoped>
.prose-chat :deep(p) { margin: 0.25em 0; }
.prose-chat :deep(strong) { font-weight: 600; }
.prose-chat :deep(ul), .prose-chat :deep(ol) { padding-left: 1.2em; margin: 0.25em 0; }
.prose-chat :deep(li) { margin: 0.1em 0; }
.prose-chat :deep(code) { background: var(--line); padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.85em; }
.prose-chat :deep(pre) { background: var(--line); padding: 0.5em; border-radius: 6px; overflow-x: auto; margin: 0.5em 0; }
</style>
