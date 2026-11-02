<template>
  <UiDialog v-model="open" :title="isEdit ? 'Editar card' : 'Novo card'" size="xl">
    <div class="flex gap-6 pb-1">
      <!-- Form -->
      <form :id="formId" class="flex min-w-0 flex-1 flex-col gap-4" @submit.prevent="submit">
        <!-- Paywall hint -->
        <button
          v-if="showAiHint"
          type="button"
          class="flex w-full items-center gap-2 rounded-row bg-action-subtle px-3 py-2.5 text-left transition-colors duration-nav hover:bg-subtle"
          @click="openUpgrade"
        >
          <Lightbulb class="size-4 text-action-fg" aria-hidden="true" />
          <span class="flex-1 text-meta text-action-fg">A IA pode criar cards automaticamente</span>
          <span class="text-label font-medium text-action-fg">Pro →</span>
        </button>

        <UiSelect
          v-if="!props.topicId"
          v-model="form.topic_id"
          label="Caderno"
          :options="topicOptions"
          placeholder="Selecione um caderno"
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-label font-medium text-fg">Frente</span>
          <UiRichInput
            v-model="form.front"
            v-model:audio-blob="form.frontAudioBlob"
            :existing-audio-url="form.existingFrontAudioUrl"
            placeholder="Digite a pergunta..."
            :min-height="80"
            :max-height="160"
            enable-cloze
            @focus="previewSide = 'front'"
          />
        </div>

        <div v-if="!hasCloze" class="flex flex-col gap-1.5">
          <span class="text-label font-medium text-fg">Verso</span>
          <UiRichInput
            v-model="form.back"
            v-model:audio-blob="form.backAudioBlob"
            :existing-audio-url="form.existingBackAudioUrl"
            placeholder="Digite a resposta..."
            :min-height="80"
            :max-height="160"
            @focus="previewSide = 'back'"
          />
        </div>
        <p v-else class="rounded-row bg-subtle px-4 py-6 text-center text-meta text-fg-muted">O verso é gerado automaticamente pelas lacunas.</p>

        <div class="flex flex-col gap-1.5">
          <span class="text-label font-medium text-fg">Etiquetas</span>
          <UiTagInput v-model="form.tags" placeholder="#difícil, #pegadinha, #prova2024..." />
        </div>
      </form>

      <!-- Preview -->
      <div class="hidden w-72 shrink-0 flex-col gap-3 md:flex" aria-label="Prévia do card">
        <p class="text-label font-medium text-fg-muted">Prévia</p>
        <div v-if="hasCloze && clozeIndices.length > 1" class="flex gap-1" role="group" aria-label="Lacuna da prévia">
          <button
            v-for="idx in clozeIndices"
            :key="idx"
            type="button"
            class="min-h-touch rounded-tag px-2 text-label font-medium transition-colors duration-nav"
            :class="previewClozeIndex === idx ? 'bg-action text-on-action' : 'bg-subtle text-fg-muted hover:text-fg-strong'"
            :aria-pressed="previewClozeIndex === idx ? 'true' : 'false'"
            @click="previewClozeIndex = idx"
          >
            c{{ idx }}
          </button>
        </div>
        <div class="flex min-h-48 flex-col justify-center rounded-card border border-line-strong bg-raised p-5 text-center shadow-card">
          <p class="mb-2 text-label text-fg-muted">{{ previewSide === 'front' ? (selectedTopicName || 'Pergunta') : 'Resposta' }}</p>
          <div class="max-h-60 overflow-y-auto break-words text-body text-fg-strong" v-html="sanitize(previewSide === 'front' ? frontPreview : backPreview)" />
        </div>
        <UiButton size="sm" variant="ghost" @click="flipPreview">{{ previewSide === 'front' ? 'Ver a resposta' : 'Ver a pergunta' }}</UiButton>
      </div>
    </div>

    <template #footer="{ close }">
      <UiButton variant="ghost" @click="close">Cancelar</UiButton>
      <UiButton v-if="!isEdit" :disabled="!canSubmit" @click="submitAndContinue">Salvar e criar outro</UiButton>
      <UiButton type="submit" :form="formId" variant="primary" :loading="saving" :disabled="!canSubmit">Salvar</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
import { Lightbulb } from 'lucide-vue-next'
import type { Flashcard, Topic } from '~/types'

const props = defineProps<{
  deckId?: string
  topicId?: string
  card?: Flashcard | null
  initialFront?: string
  initialBack?: string
  localOnly?: boolean
  /** The note the card is made from (material panel): its origin (prd-4c-material-v3 RF-B4) */
  sourceNoteId?: string | null
}>()
const emit = defineEmits<{
  (e: 'created'): void
  (e: 'updated', card?: { id: string; front: string; back: string }): void
  (e: 'local-save', card: { front: string; back: string; tags: string[]; frontAudioBlob: Blob | null; backAudioBlob: Blob | null }): void
}>()
const open = defineModel<boolean>({ required: true })

const isEdit = computed(() => !!props.card)

const auth = useAuthStore()
const featureUsage = useFeatureUsage()
const showAiHint = computed(() =>
  !isEdit.value && auth.user?.plan === 'free' && featureUsage.remaining('cards_ai') === 0,
)

function openUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', {
    detail: { feature: 'cards_ai', planRequired: 'pro' },
  }))
}

const flashcardStore = useFlashcardStore()
const deckStore = useDeckStore()
const toast = useToast()
const { $api } = useNuxtApp()

const saving = ref(false)
const formId = useId()
const previewSide = ref<'front' | 'back'>('front')
const topics = ref<Topic[]>([])

function flipPreview() {
  previewSide.value = previewSide.value === 'front' ? 'back' : 'front'
}

const form = reactive({
  front: '',
  back: '',
  topic_id: '',
  tags: [] as string[],
  frontAudioBlob: null as Blob | null,
  backAudioBlob: null as Blob | null,
  existingFrontAudioUrl: null as string | null,
  existingBackAudioUrl: null as string | null,
})

function populateForm() {
  if (props.card) {
    form.front = props.card.front
    form.back = props.card.back
    form.topic_id = props.card.topic_id ?? ''
    form.tags = props.card.tags ?? []
    form.existingFrontAudioUrl = props.card.front_audio_url ?? null
    form.existingBackAudioUrl = props.card.back_audio_url ?? null
  } else {
    form.front = props.initialFront ?? ''
    form.back = props.initialBack ?? ''
    form.topic_id = props.topicId ?? ''
    form.tags = []
    form.existingFrontAudioUrl = null
    form.existingBackAudioUrl = null
  }
  form.frontAudioBlob = null
  form.backAudioBlob = null
  previewSide.value = 'front'
}

// Populate immediately on mount (handles v-if creation)
onMounted(() => {
  populateForm()
  if (!topics.value.length) loadTopics()
})

const topicOptions = computed(() =>
  topics.value.filter(t => !t.parent_id).map(t => ({ value: t.id, label: t.name })),
)

const selectedTopicName = computed(() =>
  topics.value.find(t => t.id === form.topic_id)?.name ?? '',
)

const isEmpty = (html: string) => !html || html === '<p></p>'

const hasCloze = computed(() => /\{\{c\d+::/.test(form.front))

const clozeIndices = computed(() => {
  const matches = form.front.matchAll(/\{\{c(\d+)::/g)
  const indices = [...new Set([...matches].map(m => parseInt(m[1])))]
  return indices.sort((a, b) => a - b)
})

const previewClozeIndex = ref(1)

watch(clozeIndices, (indices) => {
  if (indices.length && !indices.includes(previewClozeIndex.value)) {
    previewClozeIndex.value = indices[0]
  }
})

const canSubmit = computed(() => {
  if (!form.front || !form.topic_id || saving.value) return false
  return hasCloze.value || !!form.back
})

const { renderQuestion, renderAnswer } = useCloze()
const { sanitize } = useSanitize()

const frontPreview = computed(() => {
  if (isEmpty(form.front)) return 'Sua pergunta aqui...'
  return hasCloze.value ? renderQuestion(form.front, previewClozeIndex.value) : form.front
})

const backPreview = computed(() => {
  if (hasCloze.value) return renderAnswer(form.front, previewClozeIndex.value)
  return isEmpty(form.back) ? 'Sua resposta aqui...' : form.back
})

async function loadTopics() {
  try {
    const res = await $api<any>('/topics')
    topics.value = flattenTopics(res.data)
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

async function uploadAudio(blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('audio', blob, 'recording.webm')
  const res = await $api<any>('/audio/upload', { method: 'POST', body: formData })
  return res.data.url
}

async function submit() {
  await doSubmit(true)
}

async function submitAndContinue() {
  await doSubmit(false)
}

async function doSubmit(closeAfter: boolean) {
  if (props.localOnly) {
    emit('local-save', {
      front: form.front,
      back: form.back,
      tags: [...form.tags],
      frontAudioBlob: form.frontAudioBlob,
      backAudioBlob: form.backAudioBlob,
    })
    if (closeAfter) open.value = false
    return
  }
  saving.value = true
  try {
    let front_audio_url: string | undefined
    let back_audio_url: string | undefined

    if (form.frontAudioBlob) front_audio_url = await uploadAudio(form.frontAudioBlob)
    if (form.backAudioBlob) back_audio_url = await uploadAudio(form.backAudioBlob)

    if (isEdit.value && props.card) {
      await flashcardStore.update(props.card.id, {
        front: form.front,
        back: form.back,
        topic_id: form.topic_id,
        tags: form.tags.length ? form.tags : undefined,
        front_audio_url,
        back_audio_url,
      })
      toast.show('Card atualizado!', 'success')
      emit('updated', { id: props.card.id, front: form.front, back: form.back })
      open.value = false
    } else {
      await $api('/flashcards', {
        method: 'POST',
        body: {
          front: form.front,
          back: form.back,
          topic_id: form.topic_id,
          tags: form.tags.length ? form.tags : undefined,
          front_audio_url,
          back_audio_url,
          ...(props.sourceNoteId ? { source_note_id: props.sourceNoteId } : {}),
        },
      })
      toast.show('Card criado!', 'success')
      emit('created')
      if (closeAfter) {
        open.value = false
      } else {
        form.front = ''
        form.back = ''
        form.tags = []
        form.frontAudioBlob = null
        form.backAudioBlob = null
        form.existingFrontAudioUrl = null
        form.existingBackAudioUrl = null
        previewSide.value = 'front'
      }
    }
  } catch {
    toast.show(isEdit.value ? 'Erro ao atualizar card.' : 'Erro ao criar card.', 'error')
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val) populateForm()
})
</script>
