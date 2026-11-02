<template>
  <UiDialog v-model="open" :title="title" :description="description" size="sm">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <UiInput
        ref="nameRef"
        v-model="name"
        :label="nameLabel"
        :error="nameError"
        autocomplete="off"
        maxlength="255"
        data-testid="topic-dialog-name"
      />

      <fieldset v-if="showColor" class="min-w-0">
        <legend class="mb-2 text-meta font-semibold text-fg-strong">Cor</legend>
        <div class="flex flex-wrap gap-1">
          <label
            v-for="c in NOTEBOOK_COLORS"
            :key="c.value"
            class="relative flex size-touch cursor-pointer items-center justify-center rounded-full transition-colors duration-nav hover:bg-subtle has-checked:bg-action-subtle has-focus-visible:outline-2 has-focus-visible:outline-focus"
          >
            <input v-model="color" type="radio" :name="`${uid}-color`" :value="c.value" class="sr-only">
            <UiSubjectMark :color="c.value" size="lg" />
            <span class="sr-only">{{ c.label }}</span>
          </label>
        </div>
      </fieldset>

      <template v-if="showMode">
        <UiSelect v-model="mode" :options="modeOptions" label="Modo de estudo" hint="Vale para o caderno inteiro: matérias e assuntos herdam." />
        <div v-if="mode === 'language'" class="grid gap-3 sm:grid-cols-2">
          <UiSelect v-model="targetLanguage" :options="languageOptions" label="Idioma" placeholder="Escolha" />
          <UiSelect v-model="languageLevel" :options="levelOptions" label="Nível" placeholder="Escolha" />
        </div>
      </template>

      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
        <UiButton type="submit" variant="primary" :loading="pending" :disabled="!canSubmit">{{ submitLabel }}</UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<script setup lang="ts">
// Create a caderno, a matéria or an assunto, or edit one (prd-4b-caderno-v3 RF-F2, RF-F5, RF-F3 ⋯): name;
// color for cadernos and matérias (only the dot shows it); study mode only on the caderno (the subtree
// inherits it). The API refuses a 3rd level with 422 depth_exceeded (RF-B5): said on the field, the dialog
// stays open with the name typed. The color list is the API's (`in:purple,…`).
import { NOTEBOOK_COLORS } from '~/utils/colors'
import { LANGUAGE_LEVELS, LEARNING_MODES, TARGET_LANGUAGES } from '~/utils/learningModes'
import type { Topic } from '~/types'

export type TopicDialogMode = 'create' | 'edit'

export interface TopicDialogTarget {
  id: string
  name: string
  /** 0 = caderno */
  depth: number
  color?: string | null
  learning_mode?: string | null
  target_language?: string | null
  language_level?: string | null
}

const props = defineProps<{
  mode: TopicDialogMode
  /** create: the parent (null = a new caderno) · edit: the topic */
  target: TopicDialogTarget | null
}>()
const emit = defineEmits<{ (e: 'saved', topic: Topic): void }>()
const open = defineModel<boolean>({ required: true })

const topicStore = useTopicStore()
const auth = useAuthStore()
const toast = useToast()
const pending = ref(false)
const uid = useId()

const name = ref('')
const color = ref<string>('')
const mode = ref<string>('general')
const targetLanguage = ref('')
const languageLevel = ref('')
const nameError = ref<string | undefined>(undefined)
const nameRef = ref<{ focus: () => void } | null>(null)

/** Depth of the topic the form is about (the new one, or the edited one). */
const depth = computed(() => (props.mode === 'create' ? (props.target ? props.target.depth + 1 : 0) : props.target?.depth ?? 0))
const kind = computed(() => (depth.value === 0 ? 'caderno' : depth.value === 1 ? 'matéria' : 'assunto'))
const showColor = computed(() => depth.value <= 1)
const showMode = computed(() => depth.value === 0)

const title = computed(() => {
  if (props.mode === 'edit') return `Editar ${kind.value}`
  return depth.value === 0 ? 'Novo caderno' : depth.value === 1 ? 'Nova matéria' : 'Novo assunto'
})
const description = computed(() => (props.mode === 'create' && props.target ? `Em ${props.target.name}` : undefined))
const nameLabel = computed(() => `Nome ${depth.value === 0 ? 'do caderno' : depth.value === 1 ? 'da matéria' : 'do assunto'}`)
const submitLabel = computed(() => (props.mode === 'edit' ? 'Salvar' : 'Criar'))

const modeOptions = LEARNING_MODES.map(m => ({ value: m.value, label: `${m.label} · ${m.description}` }))
const languageOptions = TARGET_LANGUAGES.map(l => ({ ...l }))
const levelOptions = LANGUAGE_LEVELS.map(l => ({ ...l }))

const canSubmit = computed(() => {
  if (!name.value.trim()) return false
  if (showMode.value && mode.value === 'language') return !!targetLanguage.value && !!languageLevel.value
  return true
})

watch(open, (isOpen) => {
  if (!isOpen) return
  nameError.value = undefined
  if (props.mode === 'edit' && props.target) {
    name.value = props.target.name
    color.value = props.target.color ?? ''
    mode.value = props.target.learning_mode ?? 'general'
    targetLanguage.value = props.target.target_language ?? ''
    languageLevel.value = props.target.language_level ?? ''
  } else {
    name.value = ''
    color.value = ''
    mode.value = auth.user?.default_learning_mode || 'general'
    targetLanguage.value = ''
    languageLevel.value = ''
  }
  nextTick(() => requestAnimationFrame(() => nameRef.value?.focus()))
}, { immediate: true })

watch(name, () => { nameError.value = undefined })

function body(): Record<string, unknown> {
  const out: Record<string, unknown> = { name: name.value.trim() }
  if (showColor.value && color.value) out.color = color.value
  if (showMode.value) {
    out.learning_mode = mode.value
    if (mode.value === 'language') {
      out.target_language = targetLanguage.value || null
      out.language_level = languageLevel.value || null
    }
  }
  return out
}

async function submit() {
  if (!canSubmit.value || pending.value) return
  const isEdit = props.mode === 'edit'
  const what = kind.value === 'caderno' ? 'o caderno' : kind.value === 'matéria' ? 'a matéria' : 'o assunto'
  pending.value = true
  try {
    const saved = isEdit
      ? await topicStore.update(props.target!.id, body())
      : await topicStore.create({ ...body(), name: name.value.trim(), parent_id: props.target?.id ?? null })
    open.value = false
    toast.show(isEdit ? 'Salvo!' : `${kind.value === 'caderno' ? 'Caderno criado' : kind.value === 'matéria' ? 'Matéria criada' : 'Assunto criado'}!`, 'success')
    emit('saved', saved as Topic)
  } catch (e) {
    // 3rd level (RF-B5): the field says why; any other failure keeps the name typed and says so
    if (getErrorStatus(e) === 422 && (e as { data?: { code?: string } })?.data?.code === 'depth_exceeded') {
      nameError.value = 'Aqui já é o último nível (matéria → assunto). Crie dentro de uma matéria.'
    } else {
      reportApiError(e, { error: isEdit ? 'Não foi possível salvar. Tente de novo.' : `Não foi possível criar ${what}. Tente de novo.` })
    }
  } finally {
    pending.value = false
  }
}
</script>
