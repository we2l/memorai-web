<template>
  <UiModal v-model="open" size="xl" :aria-label="isEdit ? 'Editar flashcard' : 'Adicionar flashcard'">
    <div class="flex gap-6 min-h-[480px]">
      <!-- Form -->
      <div class="flex-1 flex flex-col min-w-0">
        <h2 class="text-headline mb-5">{{ isEdit ? 'Editar card' : 'Novo card' }}</h2>

        <!-- Paywall hint -->
        <button
          v-if="showAiHint"
          class="w-full mb-4 px-3 py-2.5 rounded-lg bg-accent-primary-subtle/50 flex items-center gap-2 text-left hover:bg-accent-primary-subtle transition-colors"
          @click="openUpgrade"
        >
          <span class="text-small">💡</span>
          <p class="text-small text-accent-primary flex-1">A IA pode criar cards automaticamente</p>
          <span class="text-micro text-accent-primary font-medium">Pro →</span>
        </button>
        <form @submit.prevent="submit" class="flex flex-col gap-4 flex-1">
          <div v-if="!props.topicId">
            <label class="text-label mb-1 block">Caderno</label>
            <UiSelect
              v-model="form.topic_id"
              :options="topicOptions"
              placeholder="Selecione um caderno"
            />
          </div>

          <div class="flex-1 flex flex-col">
            <label class="text-label mb-1 block">Frente</label>
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

          <div v-if="!hasCloze" class="flex-1 flex flex-col">
            <label class="text-label mb-1 block">Verso</label>
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
          <div v-else class="flex-1 flex items-center justify-center rounded-lg border border-dashed border-base bg-surface-tertiary/50 px-4 py-6">
            <p class="text-small text-base-muted text-center">O verso é gerado automaticamente pelas lacunas.</p>
          </div>

          <div>
            <label class="text-label mb-1 block">Tags</label>
            <UiTagInput v-model="form.tags" placeholder="#difícil, #pegadinha, #prova2024..." />
          </div>

          <div class="flex gap-2 justify-end pt-2">
            <button type="button" class="btn-secondary !py-1.5 !px-3 !min-h-[2.75rem] !text-small" @click="open = false">Cancelar</button>
            <button
              v-if="!isEdit"
              type="button"
              class="btn-secondary !py-1.5 !px-3 !min-h-[2.75rem] !text-small"
              :disabled="!canSubmit"
              @click="submitAndContinue"
            >
              {{ saving ? 'Salvando...' : 'Salvar e criar outro' }}
            </button>
            <button type="submit" class="btn-primary !py-1.5 !px-3 !min-h-[2.75rem] !text-small" :disabled="!canSubmit">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Preview -->
      <div class="hidden md:flex flex-col items-center w-80 shrink-0 pt-10">
        <p class="text-label mb-3">Preview</p>
        <!-- Cloze index selector -->
        <div v-if="hasCloze && clozeIndices.length > 1" class="flex gap-1 mb-3">
          <button
            v-for="idx in clozeIndices"
            :key="idx"
            type="button"
            class="px-2 py-0.5 rounded text-micro font-medium transition-colors"
            :class="previewClozeIndex === idx ? 'bg-accent-primary text-white' : 'bg-surface-tertiary text-base-muted hover:text-base-primary'"
            @click="previewClozeIndex = idx"
          >
            c{{ idx }}
          </button>
        </div>
        <div class="w-full card-scene">
          <div class="card-inner" :class="previewSide === 'back' && 'flipped'">
            <div class="card-face card-front" @click="flipPreview">
              <div class="card-body">
                <p class="text-micro text-base-muted mb-2 uppercase tracking-wider">{{ selectedTopicName || 'Caderno' }}</p>
                <div class="text-base-primary leading-relaxed break-words preview-content max-h-[250px] overflow-y-auto" v-html="frontPreview" />
              </div>
            </div>
            <div class="card-face card-back" @click="flipPreview">
              <div class="card-body">
                <p class="text-micro text-base-muted mb-2 uppercase tracking-wider">Resposta</p>
                <div class="text-base-primary leading-relaxed break-words preview-content max-h-[250px] overflow-y-auto" v-html="backPreview" />
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="text-micro text-base-muted mt-3 cursor-pointer hover:text-accent-primary transition-colors" @click="flipPreview">
          Clique pra virar
        </button>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import type { Flashcard, Topic } from '~/types'

const props = defineProps<{
  deckId?: string
  topicId?: string
  card?: Flashcard | null
  initialFront?: string
  initialBack?: string
  localOnly?: boolean
}>()
const emit = defineEmits<{
  (e: 'created'): void
  (e: 'updated'): void
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
    detail: { feature: 'Geração de cards com IA', planRequired: 'pro' },
  }))
}

const flashcardStore = useFlashcardStore()
const deckStore = useDeckStore()
const toast = useToast()
const { $api } = useNuxtApp()

const saving = ref(false)
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

const frontPreview = computed(() => {
  if (isEmpty(form.front)) return '<span style="opacity:0.4">Sua pergunta aqui...</span>'
  return hasCloze.value ? renderQuestion(form.front, previewClozeIndex.value) : form.front
})

const backPreview = computed(() => {
  if (hasCloze.value) return renderAnswer(form.front, previewClozeIndex.value)
  return isEmpty(form.back) ? '<span style="opacity:0.4">Sua resposta aqui...</span>' : form.back
})

async function loadTopics() {
  try {
    const res = await $api<any>('/topics')
    topics.value = flattenTopics(res.data)
  } catch {}
}

function flattenTopics(tree: Topic[], result: Topic[] = []): Topic[] {
  for (const t of tree) {
    result.push(t)
    if (t.children?.length) flattenTopics(t.children, result)
  }
  return result
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
      emit('updated')
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

<style scoped>
.card-scene { perspective: 800px; }
.card-inner {
  position: relative;
  width: 100%;
  height: 280px;
  transition: transform 0.5s ease;
  transform-style: preserve-3d;
}
.card-inner.flipped { transform: rotateY(180deg); }
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 1rem;
  overflow: hidden;
  cursor: pointer;
}
.card-back { transform: rotateY(180deg); }
.card-body {
  height: 100%;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--bg-secondary);
  border: 2px solid var(--border-strong);
  border-radius: 1rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}
.preview-content p { margin: 0.25em 0; }
</style>
