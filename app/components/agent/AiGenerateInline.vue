<template>
  <div class="relative inline-block">
    <button class="btn-secondary !py-1 !px-2.5 !min-h-0 text-micro" @click="handleClick">
      <Sparkles :size="14" /> Gerar com IA
    </button>

    <!-- Popover (only when ambiguous) -->
    <Transition name="fade">
      <div
        v-if="showPopover"
        class="absolute top-full left-0 mt-2 w-64 bg-overlay border border-base rounded-lg p-3 shadow-lg z-20"
      >
        <p class="text-micro text-base-muted mb-2">De onde?</p>
        <div class="space-y-1.5 mb-3">
          <button
            v-if="hasNotes"
            class="w-full text-left px-3 py-2 rounded-lg text-small hover:bg-surface-tertiary transition-colors"
            :class="selectedSource === 'notes' && 'bg-accent-primary-subtle text-accent-primary'"
            @click="selectedSource = 'notes'"
          >
            📝 Das notas
          </button>
          <button
            v-if="hasDocuments"
            class="w-full text-left px-3 py-2 rounded-lg text-small hover:bg-surface-tertiary transition-colors"
            :class="selectedSource === 'pdf' && 'bg-accent-primary-subtle text-accent-primary'"
            @click="selectedSource = 'pdf'"
          >
            📄 Do PDF
          </button>
          <button
            class="w-full text-left px-3 py-2 rounded-lg text-small hover:bg-surface-tertiary transition-colors"
            :class="selectedSource === 'free' && 'bg-accent-primary-subtle text-accent-primary'"
            @click="selectedSource = 'free'"
          >
            ✏️ Tema livre
          </button>
        </div>
        <div class="flex items-center gap-2 mb-3">
          <label class="text-micro text-base-muted">Quantidade:</label>
          <select v-model.number="quantity" class="input-base !py-1 !min-h-0 text-micro w-16">
            <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button class="btn-secondary !py-1 !px-2.5 !min-h-0 text-micro flex-1" @click="showPopover = false">Cancelar</button>
          <button class="btn-primary !py-1 !px-2.5 !min-h-0 text-micro flex-1" :disabled="!selectedSource" @click="generate">Gerar</button>
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
  generate: [source: string, quantity: number]
}>()

const showPopover = ref(false)
const selectedSource = ref<string>('')
const quantity = ref(5)

function handleClick() {
  // Inference: if only one source, skip popover
  if (props.hasNotes && !props.hasDocuments) {
    emit('generate', 'notes', quantity.value)
    return
  }
  if (props.hasDocuments && !props.hasNotes) {
    emit('generate', 'pdf', quantity.value)
    return
  }
  // Ambiguous or no material: show popover
  selectedSource.value = props.hasNotes ? 'notes' : props.hasDocuments ? 'pdf' : 'free'
  showPopover.value = true
}

function generate() {
  showPopover.value = false
  emit('generate', selectedSource.value, quantity.value)
}
</script>
