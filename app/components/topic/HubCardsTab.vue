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
    <div v-if="errorPatterns && errorPatterns.total_errors > 0" class="mb-4 px-4 py-3 rounded-xl bg-surface-tertiary/50 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-small text-base-muted flex-wrap">
        <span>Pontos fracos:</span>
        <span v-for="(count, reason) in errorPatterns.patterns" :key="reason">
          {{ reasonLabel(reason as string) }} {{ count }}x
        </span>
      </div>
      <NuxtLink
        :to="`/review?topic_id=${topicId}&errors_only=1`"
        class="text-small text-accent-primary hover:underline shrink-0"
      >
        Reforçar
      </NuxtLink>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 mb-4">
      <button class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small" @click="$emit('create-card')">
        <Plus :size="14" /> Criar card
      </button>
      <slot name="ai-generate" />
    </div>

    <!-- Card list -->
    <div v-if="cards.length" class="space-y-1.5">
      <div v-if="cards.length > 10" class="flex items-center gap-2 p-2 rounded-lg bg-surface-tertiary mb-2">
        <Search :size="14" class="text-base-muted shrink-0" />
        <input
          v-model="search"
          class="bg-transparent text-small text-base-primary outline-none flex-1 placeholder:text-base-muted"
          placeholder="Buscar card..."
          @keydown.stop
        />
      </div>

      <div
        v-for="card in displayed"
        :key="card.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-tertiary/50 hover:bg-surface-tertiary transition-colors group"
      >
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="card.state === 'review' ? 'bg-success' : card.state === 'new' ? 'bg-[#6B7280]' : 'bg-warning'"
        />
        <div class="flex-1 min-w-0">
          <div class="text-body text-base-primary line-clamp-2 card-front-preview" v-html="card.front" />
          <span v-if="card.source_note_id" class="text-micro text-base-muted">{{ noteNameById(card.source_note_id) }}</span>
        </div>
        <span
          class="text-micro px-2 py-0.5 rounded-full font-medium shrink-0"
          :class="{
            'bg-success/15 text-success': card.state === 'review',
            'bg-warning/15 text-warning': card.state === 'learning' || card.state === 'relearning',
            'bg-[#6B7280]/15 text-[#9CA3AF]': card.state === 'new',
          }"
        >
          {{ stateLabel(card.state) }}
        </span>
        <button
          class="text-base-muted hover:text-danger p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Excluir card"
          @click="$emit('delete-card', card.id)"
        >
          <Trash2 :size="14" />
        </button>
      </div>

      <button
        v-if="visibleCount < filtered.length"
        class="w-full py-3 text-small text-accent-primary hover:underline"
        @click="visibleCount += 20"
      >
        Mostrar mais ({{ filtered.length - visibleCount }} restantes)
      </button>
    </div>
    <div v-else class="text-center py-8">
      <p class="text-body text-base-muted mb-3">Nenhum card ainda. Crie manualmente ou gere com IA.</p>
      <button class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small" @click="$emit('create-card')">Criar primeiro card</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Search, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  topicId: string
  cards: any[]
  generatedCards: any[]
  aiGenerating: boolean
  errorPatterns: any
  noteNameById: (id: string) => string
}>()

defineEmits<{
  (e: 'create-card'): void
  (e: 'delete-card', id: string): void
  (e: 'accept-card', index: number): void
  (e: 'accept-all-cards'): void
  (e: 'edit-generated', index: number): void
  (e: 'discard-generated', index: number): void
}>()

const search = ref('')
const visibleCount = ref(20)

watch(search, () => { visibleCount.value = 20 })

const filtered = computed(() => {
  if (!search.value.trim()) return props.cards
  const q = search.value.toLowerCase()
  return props.cards.filter(c => c.front?.toLowerCase().includes(q))
})

const displayed = computed(() => filtered.value.slice(0, visibleCount.value))

function reasonLabel(reason: string): string {
  const map: Record<string, string> = { confused: 'Confundi', didnt_know: 'Não sabia', forgot: 'Esqueci', silly_mistake: 'Erro bobo' }
  return map[reason] ?? reason
}

function stateLabel(state: string): string {
  const map: Record<string, string> = { review: 'Dominado', learning: 'Aprendendo', relearning: 'Reaprendendo', new: 'Novo' }
  return map[state] ?? state
}

// Reset on topic change
watch(() => props.topicId, () => {
  search.value = ''
  visibleCount.value = 20
})
</script>
