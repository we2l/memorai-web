<template>
  <div class="card-workshop">
    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-4">
      <div class="w-10 h-10 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      <div class="text-center">
        <p class="text-body text-base-primary font-medium">Analisando seu material...</p>
        <p class="text-small text-base-muted mt-1">A IA está encontrando conceitos para revisar</p>
      </div>
    </div>

    <!-- Workshop -->
    <template v-else-if="cards.length">
      <!-- Header -->
      <div class="px-5 py-4 max-w-3xl mx-auto">
        <div class="flex items-center gap-2">
          <Sparkles :size="18" class="text-[var(--color-accent-soft)]" />
          <div>
            <h3 class="text-body font-semibold text-base-primary">
              {{ cards.length }} {{ cards.length === 1 ? 'sugestão' : 'sugestões' }} de flashcards
            </h3>
            <p class="text-small text-base-muted mt-0.5">Revise rapidamente antes de adicionar à sua coleção.</p>
          </div>
        </div>
      </div>

      <!-- Card list -->
      <div class="px-4 pb-4 space-y-2.5 max-h-[65vh] overflow-y-auto max-w-3xl mx-auto">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="card-item group"
          :class="acceptedIndexes.has(index) ? 'ring-1 ring-success/30 bg-success/5' : ''"
        >
          <!-- Edit mode -->
          <template v-if="editingIndex === index">
            <div class="space-y-3 p-4">
              <div>
                <label class="text-micro font-medium text-base-muted uppercase tracking-wide">Frente</label>
                <textarea
                  v-model="editFront"
                  class="input-base w-full !text-body mt-1.5"
                  rows="2"
                  @keydown.stop
                />
              </div>
              <div>
                <label class="text-micro font-medium text-base-muted uppercase tracking-wide">Verso</label>
                <textarea
                  v-model="editBack"
                  class="input-base w-full !text-small mt-1.5"
                  rows="3"
                  @keydown.stop
                />
              </div>
              <div class="flex gap-2 pt-1">
                <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="confirmEdit(index)">Salvar</button>
                <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="editingIndex = null">Cancelar</button>
              </div>
            </div>
          </template>

          <!-- View mode -->
          <template v-else>
            <div class="p-4 flex items-start gap-3">
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm text-base-primary font-semibold leading-snug">{{ card.front }}</p>
                <p class="text-small text-base-secondary leading-relaxed mt-2.5">{{ card.back }}</p>
                <p v-if="card.source_excerpt" class="flex items-center gap-1 text-micro text-base-muted mt-2.5">
                  <FileText :size="11" class="shrink-0 opacity-60" />
                  <span class="truncate">{{ card.source_excerpt }}</span>
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-0.5 shrink-0" :class="acceptedIndexes.has(index) ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'">
                <button
                  v-if="!acceptedIndexes.has(index)"
                  class="p-1.5 rounded-lg text-success/70 hover:text-success hover:bg-success/10 transition-colors"
                  title="Aceitar"
                  @click="$emit('accept-card', index)"
                >
                  <Check :size="15" />
                </button>
                <span v-else class="p-1.5 text-success">
                  <Check :size="15" />
                </span>

                <button
                  v-if="!acceptedIndexes.has(index)"
                  class="p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-secondary transition-colors"
                  title="Editar"
                  @click="startEdit(index, card)"
                >
                  <Pencil :size="13" />
                </button>

                <button
                  v-if="!acceptedIndexes.has(index)"
                  class="p-1.5 rounded-lg text-base-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Descartar"
                  @click="$emit('remove-card', index)"
                >
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-4 border-t border-base max-w-3xl mx-auto">
        <div class="flex items-center justify-between">
          <button class="btn-secondary !py-2.5 !px-4 text-small" @click="$emit('discard')">
            Descartar tudo
          </button>
          <button class="btn-primary !py-2.5 !px-5 text-small font-medium" :disabled="saving" @click="$emit('save')">
            {{ saving ? 'Salvando...' : `Adicionar ${cards.length - acceptedCount} card${(cards.length - acceptedCount) !== 1 ? 's' : ''}` }}
          </button>
        </div>
      </div>
    </template>

    <!-- Post-save state -->
    <div v-else-if="showSuccess" class="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div class="text-3xl">🎉</div>
      <div>
        <p class="text-body font-semibold text-base-primary">Tudo pronto!</p>
        <p class="text-small text-base-muted mt-1">{{ savedCount }} card{{ savedCount !== 1 ? 's' : '' }} adicionado{{ savedCount !== 1 ? 's' : '' }} à sua coleção.</p>
      </div>
      <div class="flex flex-col gap-2 w-full max-w-xs mt-2">
        <slot name="post-save-actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, Pencil, Trash2, Check, FileText } from 'lucide-vue-next'

const props = defineProps<{
  cards: Array<{ front: string; back: string; source_excerpt?: string }>
  loading: boolean
  saving?: boolean
  acceptedIndexes?: Set<number>
  showSuccess?: boolean
  savedCount?: number
}>()

const emit = defineEmits<{
  save: []
  discard: []
  'edit-card': [index: number, data: { front: string; back: string }]
  'remove-card': [index: number]
  'accept-card': [index: number]
}>()

const acceptedCount = computed(() => props.acceptedIndexes?.size ?? 0)

const editingIndex = ref<number | null>(null)
const editFront = ref('')
const editBack = ref('')

function startEdit(index: number, card: { front: string; back: string }) {
  editingIndex.value = index
  editFront.value = card.front
  editBack.value = card.back
}

function confirmEdit(index: number) {
  emit('edit-card', index, { front: editFront.value, back: editBack.value })
  editingIndex.value = null
}
</script>

<style scoped>
.card-workshop {
  border: 1px solid var(--border-divider);
  border-radius: 0.75rem;
  background: var(--bg-card);
  overflow: hidden;
}

.card-item {
  background: var(--bg-base, #fafbfd);
  border: 1px solid var(--border-divider);
  border-radius: 0.625rem;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.card-item:hover {
  border-color: color-mix(in srgb, var(--color-accent-soft) 40%, var(--border-divider));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent-soft) 8%, transparent);
}

:root.dark .card-item {
  background: color-mix(in srgb, var(--bg-card) 60%, transparent);
}

:root.dark .card-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
