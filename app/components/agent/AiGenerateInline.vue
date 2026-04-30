<template>
  <div class="relative inline-block">
    <button class="btn-primary !py-2 !px-3.5 !min-h-[2.75rem] text-small" @click="handleClick">
      <Sparkles :size="16" /> Gerar com IA
    </button>

    <!-- Popover (only when ambiguous) -->
    <Transition name="fade">
      <div
        v-if="showPopover"
        class="absolute right-0 top-full mt-2 w-64 bg-overlay border border-base rounded-lg p-3 shadow-lg z-20"
      >
        <p class="text-micro text-base-muted mb-2">De onde?</p>
        <div class="space-y-1.5 mb-3">
          <button
            v-if="hasNotes"
            class="w-full text-left px-3 py-2 rounded-lg text-small transition-colors"
            :class="selectedSource === 'notes' ? 'bg-accent-primary-subtle text-accent-primary' : 'text-base-secondary hover:bg-surface-tertiary'"
            @click="selectedSource = 'notes'"
          >
            📝 Das notas
          </button>
          <button
            v-if="hasDocuments"
            class="w-full text-left px-3 py-2 rounded-lg text-small transition-colors"
            :class="selectedSource === 'pdf' ? 'bg-accent-primary-subtle text-accent-primary' : 'text-base-secondary hover:bg-surface-tertiary'"
            @click="selectedSource = 'pdf'"
          >
            📄 Do PDF
          </button>
          <button
            class="w-full text-left px-3 py-2 rounded-lg text-small transition-colors"
            :class="selectedSource === 'free' ? 'bg-accent-primary-subtle text-accent-primary' : 'text-base-secondary hover:bg-surface-tertiary'"
            @click="selectedSource = 'free'"
          >
            ✏️ Tema livre
          </button>
        </div>
        <div class="flex items-center gap-2 mb-3">
          <label class="text-micro text-base-muted">Quantidade:</label>
          <div class="flex items-center gap-1">
            <button class="w-7 h-7 rounded-md bg-surface-tertiary text-base-muted hover:text-base-primary text-small flex items-center justify-center" @click="quantity = Math.max(1, quantity - 1)">−</button>
            <span class="w-6 text-center text-small text-base-primary">{{ quantity }}</span>
            <button class="w-7 h-7 rounded-md bg-surface-tertiary text-base-muted hover:text-base-primary text-small flex items-center justify-center" @click="quantity = Math.min(10, quantity + 1)">+</button>
          </div>
        </div>
        <div v-if="selectedSource === 'free'" class="mb-3">
          <input
            v-model="freePrompt"
            class="input-base w-full !text-small"
            placeholder="Ex: Direito Constitucional — Art. 5º"
            @keydown.stop
          />
        </div>
        <div class="flex gap-2">
          <button class="btn-secondary !py-1 !px-2.5 !min-h-[2.75rem] text-small flex-1" @click="showPopover = false">Cancelar</button>
          <button class="btn-primary !py-1 !px-2.5 !min-h-[2.75rem] text-small flex-1" :disabled="!canGenerate" @click="generate">Gerar</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const props = defineProps<{
  topicId: string
  hasNotes?: boolean
  hasDocuments?: boolean
}>()

const emit = defineEmits<{
  generate: [source: string, quantity: number, prompt?: string]
}>()

const showPopover = ref(false)
const selectedSource = ref<string>('')
const quantity = ref(5)
const freePrompt = ref('')

const canGenerate = computed(() => {
  if (!selectedSource.value) return false
  if (selectedSource.value === 'free' && !freePrompt.value.trim()) return false
  return true
})

function handleClick() {
  // Always show popover so user can see/adjust quantity
  selectedSource.value = props.hasNotes ? 'notes' : props.hasDocuments ? 'pdf' : 'free'
  showPopover.value = true
}

function generate() {
  showPopover.value = false
  emit('generate', selectedSource.value, quantity.value, freePrompt.value)
}
</script>
