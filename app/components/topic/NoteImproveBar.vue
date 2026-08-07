<template>
  <div v-if="visible" class="note-improve-bar" :class="stateClass">
    <!-- Idle: suggestion -->
    <template v-if="state === 'idle'">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <Sparkles :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
        <p class="text-small text-base-primary truncate">Essa nota pode ficar mais organizada</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('improve')">
          Melhorar com IA
        </button>
        <button class="p-1 rounded text-base-muted hover:text-base-primary" @click="$emit('dismiss')">
          <X :size="14" />
        </button>
      </div>
    </template>

    <!-- Loading -->
    <template v-if="state === 'loading'">
      <div class="flex items-center gap-2 flex-1">
        <Loader2 :size="16" class="text-[var(--color-accent-soft)] animate-spin shrink-0" />
        <p class="text-small text-base-primary">Gerando nota melhorada...</p>
      </div>
    </template>

    <!-- Preview -->
    <template v-if="state === 'preview'">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <Sparkles :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
        <p class="text-small text-base-primary">Nota melhorada!</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('apply')">
          Aplicar melhoria
        </button>
        <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('discard')">
          Manter original
        </button>
      </div>
    </template>

    <!-- Paywall -->
    <template v-if="state === 'paywall'">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <Sparkles :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
        <p class="text-small text-base-primary">Melhore suas notas com IA</p>
      </div>
      <NuxtLink to="/planos" class="btn-primary !py-1.5 !px-3 !min-h-0 text-small shrink-0">
        Seja Pro →
      </NuxtLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, X, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  state: 'idle' | 'loading' | 'preview' | 'paywall'
}>()

defineEmits<{
  (e: 'improve'): void
  (e: 'apply'): void
  (e: 'discard'): void
  (e: 'dismiss'): void
}>()

const stateClass = computed(() => ({
  'bg-[var(--color-primary-50)]': props.state === 'idle' || props.state === 'preview',
  'bg-[var(--color-primary-50)]/50': props.state === 'loading',
  'bg-[var(--color-warning-50,#fef3c7)]': props.state === 'paywall',
}))
</script>

<style scoped>
.note-improve-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
}
</style>
