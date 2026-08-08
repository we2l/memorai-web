<template>
  <div
    class="material-input"
    :class="{
      'material-input--focus': isFocused,
      'material-input--drag': isDragging,
    }"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <!-- Text input area -->
    <form class="flex items-start gap-3" @submit.prevent="handleSubmit">
      <div class="flex-1 min-w-0">
        <input
          v-model="text"
          class="w-full bg-transparent border-0 outline-none text-body text-base-primary placeholder:text-base-muted/60"
          placeholder="Comece escrevendo..."
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown.stop
        />
        <p class="text-[11px] text-base-muted/70 mt-1 leading-relaxed">
          {{ isDragging ? 'Solte o PDF para começar' : 'Cole texto ou importe um PDF. A IA organiza o restante.' }}
        </p>
      </div>
      <button
        v-if="text.trim()"
        type="submit"
        class="btn-primary !py-1.5 !px-3 !min-h-0 text-small shrink-0 mt-0.5"
      >
        Salvar
      </button>
    </form>

    <!-- Divider (almost invisible) -->
    <div class="border-t border-[var(--border-base)]/25 my-2.5" />

    <!-- PDF import (inline action, not a button) -->
    <label
      class="flex items-center gap-2 cursor-pointer -mx-1 px-1 py-1 rounded-md transition-colors hover:bg-[var(--border-base)]/10"
      :class="{ 'opacity-50 pointer-events-none': uploading }"
    >
      <FileUp :size="13" class="text-base-muted/60 shrink-0" />
      <p v-if="uploading" class="text-[12px] text-base-muted">Enviando {{ uploadProgress }}%...</p>
      <p v-else class="text-[12px] text-base-muted/80">Importar PDF, slides ou apostilas</p>
      <input type="file" accept=".pdf" class="hidden" @change="handleFileSelect" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { FileUp } from 'lucide-vue-next'

const props = defineProps<{
  uploading?: boolean
  uploadProgress?: number
}>()

const emit = defineEmits<{
  (e: 'submit-text', text: string): void
  (e: 'select-file', file: File): void
}>()

const text = ref('')
const isFocused = ref(false)
const isDragging = ref(false)

function handleSubmit() {
  if (!text.value.trim()) return
  emit('submit-text', text.value.trim())
  text.value = ''
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('select-file', file)
    input.value = ''
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type === 'application/pdf') {
    emit('select-file', file)
  }
}
</script>

<style scoped>
.material-input {
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 16px;
  padding: 16px 20px;
  transition: all 150ms ease-out;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.material-input:hover {
  border-color: color-mix(in srgb, var(--color-accent-primary) 20%, var(--border-base));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.material-input--focus {
  border-color: color-mix(in srgb, var(--color-accent-primary) 40%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 8%, transparent),
              0 2px 8px rgba(0, 0, 0, 0.04);
}

.material-input--drag {
  border-color: var(--color-accent-primary);
  background: color-mix(in srgb, var(--color-accent-primary) 3%, var(--bg-card));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 10%, transparent);
}
</style>
