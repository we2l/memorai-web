<template>
  <div class="px-4 pt-4 pb-4">
    <!-- AI generated cards -->
    <TopicAiGeneratedCards
      :cards="generatedCards"
      :loading="aiGenerating"
      @accept="$emit('accept-card', $event)"
      @accept-all="$emit('accept-all-cards')"
      @edit="$emit('edit-generated', $event)"
      @discard="$emit('discard-generated', $event)"
    />

    <!-- Weak cards (errors compact) -->
    <div v-if="errorPatterns && errorPatterns.total_errors > 0" class="mb-4 px-4 py-3 rounded-xl bg-[var(--border-divider)]/50 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-small text-base-muted flex-wrap">
        <span>Pontos fracos:</span>
        <span v-for="(count, reason) in errorPatterns.patterns" :key="reason">
          {{ reasonLabel(reason as string) }} {{ count }}x
        </span>
      </div>
      <NuxtLink
        :to="`/revisar?topic_id=${topicId}&errors_only=1`"
        class="text-small text-accent-primary hover:underline shrink-0"
      >
        Reforçar
      </NuxtLink>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 mb-4">
      <UiTooltip text="Criar um flashcard manualmente (frente e verso)">
        <button class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small" @click="$emit('create-card')">
          <Plus :size="14" /> Criar card
        </button>
      </UiTooltip>
      <UiTooltip v-if="canUseOcr" text="Tire foto de uma página e a IA cria cards automaticamente">
        <button
          class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small"
          :disabled="ocrLoading"
          @click="triggerOcr"
        >
          <Camera :size="14" />
          <span v-if="ocrLoading">Analisando...</span>
          <span v-else>Foto do material</span>
        </button>
      </UiTooltip>
      <input
        ref="ocrInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="handleOcrFile"
      />
      <slot name="ai-generate" />
    </div>

    <!-- OCR loading -->
    <div v-if="ocrLoading" class="mb-4 px-4 py-4 rounded-xl bg-accent-primary-subtle flex items-center gap-3">
      <div class="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin shrink-0" />
      <p class="text-small text-accent-primary">Analisando imagem...</p>
    </div>

    <!-- Card list -->
    <div v-if="cards.length" class="space-y-4">
      <div v-if="cards.length > 10 || serverMode" class="flex items-center gap-2 p-2 rounded-lg bg-[var(--border-divider)] mb-2">
        <Search :size="14" class="text-base-muted shrink-0" />
        <input
          v-model="search"
          class="bg-transparent text-small text-base-primary outline-none flex-1 placeholder:text-base-muted"
          placeholder="Buscar card..."
          @input="onSearchInput"
          @keydown.stop
        />
      </div>

      <div
        v-for="card in displayed"
        :key="card.id"
        :id="`card-${card.id}`"
        class="group px-5 py-5 rounded-2xl bg-[var(--bg-card)] border border-base shadow-sm hover:shadow-lg hover:scale-[1.005] hover:border-[var(--color-accent-primary)]/20 transition-all duration-150 cursor-pointer"
        :class="highlightId === card.id ? 'ring-2 ring-accent-primary' : ''"
        @click="expandedCardId = expandedCardId === card.id ? null : card.id"
      >
        <div class="flex gap-4 items-start">
          <!-- State indicator (larger) -->
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-base font-semibold"
            :class="{
              'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]': card.state === 'review',
              'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]': card.state === 'learning' || card.state === 'relearning',
              'bg-[var(--border-base)]/40 text-base-muted': card.state === 'new',
            }"
          >
            {{ stateIcon(card.state) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-body text-base-primary line-clamp-2 card-front-preview" v-html="card.frontHtml" />
            <div class="flex items-center gap-2 mt-2">
              <span
                class="text-micro font-medium px-2 py-0.5 rounded-full"
                :class="{
                  'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]': card.state === 'review',
                  'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]': card.state === 'learning' || card.state === 'relearning',
                  'bg-[var(--border-base)]/40 text-base-muted': card.state === 'new',
                }"
              >
                {{ stateLabel(card.state) }}
              </span>
              <span v-if="card.lapses > 0" class="text-micro text-[var(--badge-danger-text)]">{{ card.lapses }}x errado</span>
              <span v-if="card.source_note_id" class="text-micro text-base-muted">· {{ noteNameById(card.source_note_id) }}</span>
            </div>
            <!-- Verso (expandable with transition) -->
            <div class="grid transition-[grid-template-rows] duration-200" :class="expandedCardId === card.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
              <div class="overflow-hidden">
                <div class="mt-3 pt-3 border-t border-base">
                  <p class="text-micro text-base-muted mb-1">Verso</p>
                  <div class="text-[1rem] leading-relaxed text-base-secondary card-front-preview" v-html="card.backHtml" />
                </div>
              </div>
            </div>
          </div>
          <!-- Actions: hover-only -->
          <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
            <button
              class="p-1.5 rounded text-base-muted hover:text-accent-primary transition-colors"
              title="Editar card"
              @click="$emit('edit-card', card)"
             aria-label="Editar card">
              <Pencil :size="14" aria-hidden="true" />
            </button>
            <button
              class="p-1.5 rounded text-base-muted hover:text-[var(--badge-danger-text)] transition-colors"
              title="Excluir card"
              @click="$emit('delete-card', card.id)"
             aria-label="Excluir card">
              <Trash2 :size="14" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="serverMode ? (visibleCount < filtered.length || hasMore) : visibleCount < filtered.length"
        class="w-full py-3 text-small text-accent-primary hover:underline disabled:opacity-60"
        :disabled="loadingMore"
        @click="showMore"
      >
        <template v-if="loadingMore">Carregando...</template>
        <template v-else-if="serverMode">Mostrar mais</template>
        <template v-else>Mostrar mais ({{ filtered.length - visibleCount }} restantes)</template>
      </button>
    </div>
    <p v-else-if="serverMode && search.trim()" class="text-center py-8 text-body text-base-muted">Nenhum card encontrado.</p>
    <div v-else class="text-center py-8">
      <picture class="contents"><source srcset="~/assets/mascots/mascot-baigi-thinking.avif" type="image/avif"><img src="~/assets/mascots/mascot-baigi-thinking.webp" alt="Baigi pensando" class="w-20 h-20 object-contain mx-auto mb-3" width="80" height="80" loading="lazy" decoding="async" /></picture>
      <p class="text-body text-base-muted mb-3">Nenhum card ainda. Crie manualmente ou gere com IA.</p>
      <button class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small" @click="$emit('create-card')">Criar primeiro card</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Search, Trash2, Pencil, Camera } from 'lucide-vue-next'

const { sanitize } = useSanitize()

const props = defineProps<{
  topicId: string
  cards: any[]
  generatedCards: any[]
  aiGenerating: boolean
  errorPatterns: any
  noteNameById: (id: string) => string
  highlightId?: string
  canUseOcr?: boolean
  /** Topic with > 200 cards: search and "mostrar mais" go to the server (useTopicCards) */
  serverMode?: boolean
  hasMore?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  (e: 'create-card'): void
  (e: 'delete-card', id: string): void
  (e: 'edit-card', card: any): void
  (e: 'accept-card', index: number): void
  (e: 'accept-all-cards'): void
  (e: 'edit-generated', index: number): void
  (e: 'discard-generated', index: number): void
  (e: 'ocr-cards', cards: any[]): void
  (e: 'search', q: string): void
  (e: 'load-more'): void
}>()

const search = ref('')
const visibleCount = ref(20)
const expandedCardId = ref<string | null>(null)

watch(search, () => { visibleCount.value = 20 })

// From the input only (not from the reset on topic change)
function onSearchInput() {
  if (props.serverMode) emit('search', search.value)
}

// Sanitized HTML and plain text memoized per card: sanitize() only reruns when the
// card content changes, not on every render (RF-09).
interface CardView { front: string, back: string, frontHtml?: string, backHtml?: string, plain: string }
const views = new Map<string, CardView>()

function viewOf(card: any): CardView {
  let view = views.get(card.id)
  if (!view || view.front !== card.front || view.back !== card.back) {
    view = { front: card.front, back: card.back, plain: `${htmlToPlain(card.front)} ${htmlToPlain(card.back)}`.toLowerCase() }
    views.set(card.id, view)
  }
  return view
}

const filtered = computed(() => {
  // Server mode: the list already comes filtered by the endpoint
  if (props.serverMode || !search.value.trim()) return props.cards
  const q = search.value.trim().toLowerCase()
  return props.cards.filter(c => viewOf(c).plain.includes(q))
})

const displayed = computed(() => filtered.value.slice(0, visibleCount.value).map((card) => {
  const view = viewOf(card)
  view.frontHtml ??= sanitize(card.front ?? '')
  view.backHtml ??= sanitize(card.back ?? '')
  return { ...card, frontHtml: view.frontHtml, backHtml: view.backHtml }
}))

function showMore() {
  // Reveal what is loaded first; then ask the next page
  if (visibleCount.value < filtered.value.length) visibleCount.value += 20
  else if (props.serverMode && props.hasMore) {
    visibleCount.value += 20
    emit('load-more')
  }
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = { confused: 'Confundi', didnt_know: 'Não sabia', forgot: 'Esqueci', silly_mistake: 'Erro bobo' }
  return map[reason] ?? reason
}

function stateLabel(state: string): string {
  const map: Record<string, string> = { review: 'Dominado', learning: 'Aprendendo', relearning: 'Reaprendendo', new: 'Novo' }
  return map[state] ?? state
}

function stateIcon(state: string): string {
  const map: Record<string, string> = { review: '✓', learning: '◐', relearning: '↻', new: '○' }
  return map[state] ?? '?'
}

// Reset on topic change
watch(() => props.topicId, () => {
  search.value = ''
  visibleCount.value = 20
  views.clear()
})

// OCR
const { $api } = useNuxtApp()
const toast = useToast()
const ocrInput = ref<HTMLInputElement | null>(null)
const ocrLoading = ref(false)

function triggerOcr() {
  ocrInput.value?.click()
}

async function handleOcrFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  ocrLoading.value = true
  try {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('topic_id', props.topicId)
    formData.append('count', '5')

    const res = await $api<any>('/flashcards/from-image', { method: 'POST', body: formData })
    const jobId = res.data.id

    // Poll for result
    const cards = await pollOcrStatus(jobId)
    if (cards) {
      emit('ocr-cards', cards)
    }
  } catch (err: any) {
    const msg = err?.data?.message || 'Erro ao processar imagem.'
    toast.show(msg, 'error')
  } finally {
    ocrLoading.value = false
    if (ocrInput.value) ocrInput.value.value = ''
  }
}

async function pollOcrStatus(jobId: string): Promise<any[] | null> {
  try {
    const data = await pollUntil(async (signal) => {
      const res = await $api<any>(`/flashcards/from-image/${jobId}/status`, { signal })
      return res.data
    }, { interval: 2000, immediate: false, timeout: 60_000, until: d => d.status === 'done' || d.status === 'failed' })
    if (data.status === 'done') return data.cards
    toast.show('Falha ao gerar cards da imagem.', 'error')
  } catch (e) {
    if (e instanceof PollTimeoutError) toast.show('Tempo esgotado. Tente novamente.', 'error')
  }
  return null
}
</script>
