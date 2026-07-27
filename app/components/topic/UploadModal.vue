<template>
  <UiModal :model-value="modelValue" size="sm" aria-label="Modo de estudo" @update:model-value="$emit('update:modelValue', $event)">
    <h2 class="text-headline mb-1">Como você vai estudar este material?</h2>
    <p class="text-small text-base-muted mb-4">Isso ajuda a IA a gerar a nota no formato ideal.</p>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="mode in modes"
        :key="mode.value"
        type="button"
        class="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center"
        :class="selected === mode.value
          ? 'border-[var(--color-accent-primary)] bg-accent-primary-subtle'
          : 'border-base bg-[var(--bg-card)] hover:border-[var(--color-accent-primary)]/50'"
        @click="selected = mode.value"
      >
        <span class="text-xl">{{ mode.icon }}</span>
        <span class="text-small font-medium text-base-primary leading-tight">{{ mode.label }}</span>
        <span class="text-micro text-base-muted leading-tight">{{ mode.desc }}</span>
      </button>
    </div>

    <!-- Language sub-fields -->
    <div v-if="selected === 'language'" class="mt-3 p-3 rounded-xl bg-[var(--bg-card)] border border-base space-y-2">
      <select v-model="targetLang" class="input-base w-full !text-small">
        <option value="">Idioma-alvo...</option>
        <option value="en">🇺🇸 Inglês</option>
        <option value="es">🇪🇸 Espanhol</option>
        <option value="fr">🇫🇷 Francês</option>
        <option value="de">🇩🇪 Alemão</option>
        <option value="it">🇮🇹 Italiano</option>
        <option value="ja">🇯🇵 Japonês</option>
        <option value="ko">🇰🇷 Coreano</option>
        <option value="zh">🇨🇳 Chinês</option>
      </select>
      <div class="flex gap-1.5">
        <button
          v-for="lvl in levels"
          :key="lvl.value"
          type="button"
          class="flex-1 py-1.5 rounded-lg text-micro font-medium transition-all border"
          :class="langLevel === lvl.value
            ? 'border-[var(--color-accent-primary)] bg-accent-primary-subtle text-accent-primary'
            : 'border-base text-base-secondary hover:border-[var(--color-accent-primary)]/50'"
          @click="langLevel = lvl.value"
        >
          {{ lvl.label }}
        </button>
      </div>
    </div>

    <div class="flex gap-3 justify-end mt-4">
      <button class="btn-secondary" @click="$emit('update:modelValue', false)">Cancelar</button>
      <label
        class="btn-primary cursor-pointer"
        :class="{ 'opacity-50 pointer-events-none': !canConfirm }"
      >
        Selecionar PDF →
        <input
          ref="fileInput"
          type="file"
          accept=".pdf"
          class="hidden"
          :disabled="!canConfirm"
          @change="onFileSelected"
        />
      </label>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  defaultMode?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: { learning_mode: string; target_language?: string; language_level?: string; file: File }]
}>()

const selected = ref(props.defaultMode || 'general')
const targetLang = ref('')
const langLevel = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const modes = [
  { value: 'exam', icon: '🏛️', label: 'Concurso / OAB', desc: 'Leis, pegadinhas' },
  { value: 'academic', icon: '🎓', label: 'Faculdade / Escola', desc: 'Conceitos, exemplos' },
  { value: 'language', icon: '🌍', label: 'Idiomas', desc: 'Frases, vocabulário' },
  { value: 'technical', icon: '💻', label: 'Programação / TI', desc: 'Código, fórmulas' },
  { value: 'professional', icon: '📋', label: 'Certificações', desc: 'Cenários práticos' },
  { value: 'general', icon: '📝', label: 'Uso geral', desc: 'Formato padrão' },
]

const levels = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
]

const canConfirm = computed(() => {
  if (!selected.value) return false
  if (selected.value === 'language' && (!targetLang.value || !langLevel.value)) return false
  return true
})

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const data: any = { learning_mode: selected.value, file }
  if (selected.value === 'language') {
    data.target_language = targetLang.value
    data.language_level = langLevel.value
  }
  emit('confirm', data)
  emit('update:modelValue', false)

  // Reset input
  if (fileInput.value) fileInput.value.value = ''
}

watch(() => props.modelValue, (v) => {
  if (v) {
    selected.value = props.defaultMode || 'general'
    targetLang.value = ''
    langLevel.value = ''
  }
})
</script>
