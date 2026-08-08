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
    <!-- Text input section -->
    <div class="px-5 pt-5 pb-4">
      <form class="flex items-start gap-3" @submit.prevent="handleSubmit">
        <div class="flex-1 min-w-0">
          <input
            v-model="text"
            class="w-full bg-transparent border-0 outline-none text-[15px] text-base-primary placeholder:text-base-muted/50"
            placeholder="Cole texto, resumo ou anotações..."
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keydown.stop
          />
          <p class="text-[11.5px] text-base-muted/60 mt-2 leading-relaxed">
            A IA transforma seu material em notas, flashcards, simulados e podcast.
          </p>
        </div>
        <button
          v-if="text.trim()"
          type="submit"
          class="btn-primary !py-1.5 !px-3.5 !min-h-0 text-small shrink-0"
        >
          Salvar
        </button>
      </form>
    </div>

    <!-- Divider -->
    <div class="mx-5 border-t border-[var(--border-base)]/30" />

    <!-- PDF import section (same weight as text input) -->
    <label
      class="import-action"
      :class="{
        'import-action--drag': isDragging,
        'opacity-50 pointer-events-none': uploading,
      }"
    >
      <div class="import-action__icon">
        <FileUp :size="16" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[13.5px] font-medium text-base-primary">
          {{ isDragging ? 'Solte o arquivo para começar' : 'Importar material' }}
        </p>
        <p v-if="uploading" class="text-[11px] text-base-muted mt-0.5">Enviando {{ uploadProgress }}%...</p>
        <p v-else class="text-[11px] text-base-muted/70 mt-0.5">
          PDFs, apostilas, livros ou slides. A IA organiza tudo.
        </p>
      </div>
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
  overflow: hidden;
  transition: all 150ms ease-out;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.material-input:hover {
  border-color: color-mix(in srgb, var(--color-accent-primary) 15%, var(--border-base));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.material-input--focus {
  border-color: color-mix(in srgb, var(--color-accent-primary) 35%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 6%, transparent),
              0 2px 8px rgba(0, 0, 0, 0.03);
}

.material-input--drag {
  border-color: var(--color-accent-primary);
  background: color-mix(in srgb, var(--color-accent-primary) 2%, var(--bg-card));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 8%, transparent);
}

/* Import action — same visual weight as text area */
.import-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.import-action:hover {
  background: color-mix(in srgb, var(--color-accent-primary) 3%, transparent);
}

.import-action:hover .import-action__icon {
  transform: scale(1.05);
  background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent);
}

.import-action--drag {
  background: color-mix(in srgb, var(--color-accent-primary) 4%, transparent);
}

.import-action__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-accent-primary) 7%, transparent);
  color: var(--color-accent-soft);
  transition: all 150ms ease-out;
  flex-shrink: 0;
}
</style>
