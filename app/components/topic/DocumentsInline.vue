<template>
  <div>
    <!-- Documents list (compact cards) — upload area is now in MaterialInput -->
    <div v-if="documents.length" class="space-y-2 mt-3">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="rounded-xl bg-[var(--bg-card)] border border-base p-3 shadow-sm"
      >
        <!-- Row 1: File info + delete -->
        <div class="flex items-center gap-2">
          <button class="flex items-center gap-2 group flex-1 min-w-0 text-left" @click="openViewer(doc)">
            <FileText :size="16" class="text-accent-primary shrink-0" />
            <span class="text-body text-base-primary truncate font-medium group-hover:text-accent-primary group-hover:underline transition-colors">{{ doc.original_name }}</span>
          </button>
          <span v-if="doc.pages_count" class="text-micro text-base-muted shrink-0">{{ doc.pages_count }} pág</span>
          <button
            class="p-1.5 rounded-lg text-base-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
            title="Remover PDF"
            @click="confirmDelete(doc)"
          >
            <Trash2 :size="14" />
          </button>
        </div>

        <!-- Row 2: Status + actions (inline, compact) -->
        <div class="mt-2 pl-6">
          <!-- Generating (with progress) -->
          <div v-if="doc.note_generation_status === 'generating'" class="space-y-1.5">
            <div class="flex items-center gap-2 text-small text-accent-primary">
              <Loader2 :size="14" class="animate-spin" />
              <span v-if="doc.note_total_batches && doc.note_generation_progress">
                Gerando material... ({{ doc.note_generation_progress }}/{{ doc.note_total_batches }} seções)
              </span>
              <span v-else>Preparando material de estudo...</span>
            </div>
            <div v-if="doc.note_total_batches" class="w-full h-2 bg-[#e5e7eb] rounded-full overflow-hidden mt-1.5">
              <div
                class="h-full bg-[var(--color-accent-primary)] rounded-full transition-all duration-700 ease-out"
                :style="{ width: `${Math.max(5, Math.round((doc.note_generation_progress / doc.note_total_batches) * 100))}%` }"
              />
            </div>
            <p v-if="doc.note_generation_progress" class="text-micro text-base-muted">Pode ler o que já está pronto na nota abaixo</p>
          </div>

          <!-- Failed -->
          <div v-else-if="doc.note_generation_status === 'failed'" class="flex items-center gap-2 text-small">
            <XCircle :size="14" class="text-danger shrink-0" />
            <span class="text-danger">Falhou.</span>
            <button class="text-accent-primary hover:underline" @click="openGenerateNote(doc)">Tentar novamente</button>
          </div>

          <!-- Completed: resumo pronto -->
          <div v-else-if="doc.has_generated_note">
            <div class="flex items-center gap-2 flex-wrap">
              <CheckCircle :size="14" class="text-success shrink-0" />
              <span class="text-small text-success font-medium">Resumo pronto</span>
              <span v-if="doc.processed_pages && doc.pages_count && doc.processed_pages < doc.pages_count" class="text-micro text-base-muted">
                ({{ doc.processed_pages }}/{{ doc.pages_count }} pág)
              </span>
            </div>

            <!-- Partial banner (compact) -->
            <div
              v-if="doc.processed_pages && doc.pages_count && doc.processed_pages < doc.pages_count"
              class="mt-2 px-3 py-2 rounded-lg bg-accent-primary-subtle/50 border border-[var(--color-accent-primary)]/10 flex items-center gap-2"
            >
              <Lock :size="13" class="text-accent-primary shrink-0" />
              <p class="text-micro text-base-secondary flex-1">
                Parcial ({{ doc.processed_pages }}/{{ doc.pages_count }} pág).
                <NuxtLink to="/planos" class="text-accent-primary hover:underline">Desbloquear →</NuxtLink>
              </p>
            </div>

            <!-- Actions row (text buttons, not full-width) -->
            <div class="mt-2 flex items-center gap-3 flex-wrap">
              <button
                class="inline-flex items-center gap-1.5 text-small text-accent-primary font-medium hover:underline transition-colors"
                @click="openGenerateCards(doc)"
              >
                <Sparkles :size="13" /> Transformar em flashcards
              </button>
            </div>

            <!-- Re-generation banner (mode changed after note was generated) -->
            <div
              v-if="doc.learning_mode_used && props.topicLearningMode && doc.learning_mode_used !== props.topicLearningMode"
              class="mt-2 px-3 py-2 rounded-lg bg-[var(--color-warning-50,#fef3c7)] border border-[var(--color-warning-200,#fde68a)]"
            >
              <p class="text-small text-base-primary mb-1.5">⚠️ Esta nota foi criada com modo diferente do caderno.</p>
              <button
                class="btn-primary !py-1.5 !px-3 !min-h-0 text-small"
                :disabled="regeneratingDoc === doc.id"
                @click="regenerateNote(doc)"
              >
                {{ regeneratingDoc === doc.id ? 'Re-gerando...' : 'Re-gerar nota' }}
              </button>
            </div>

            <!-- Language inference banner -->
            <div
              v-if="doc.language_detected && !dismissedLanguageBanners.has(doc.id)"
              class="mt-2 px-3 py-2.5 rounded-lg bg-[var(--color-primary-50)] border border-[var(--color-accent-primary)]/15"
            >
              <p class="text-small text-base-primary mb-2">
                📖 Este material está em <strong>{{ languageName(doc.source_language) }}</strong>. Como você quer estudá-lo?
              </p>
              <div class="flex items-center gap-2 flex-wrap">
                <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="setLanguageMode(doc)">
                  Aprender {{ languageName(doc.source_language) }}
                </button>
                <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="dismissLanguageBanner(doc.id)">
                  Só os conceitos
                </button>
                <button class="text-micro text-base-muted hover:text-base-secondary" @click="dismissLanguageBanner(doc.id)">
                  Agora não
                </button>
              </div>
            </div>
          </div>

          <!-- Processing embeddings -->
          <div v-else-if="doc.status === 'processing'" class="flex items-center gap-2 text-small text-base-muted">
            <Loader2 :size="14" class="animate-spin text-accent-primary" />
            <span>Processando...</span>
          </div>

          <!-- Default: waiting for auto-generation -->
          <div v-else class="flex items-center gap-2 text-small text-base-muted">
            <Loader2 :size="14" class="animate-spin text-accent-primary" />
            <span>Preparando material de estudo...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Paywall banner (appears only when quota exhausted) -->
    <button
      v-if="showPaywall"
      class="w-full mt-3 px-4 py-3 rounded-xl bg-accent-primary-subtle border border-accent-primary/20 flex items-center gap-3 text-left hover:bg-accent-primary/10 transition-colors"
      @click="openUpgrade"
    >
      <Sparkles :size="16" class="text-[var(--color-accent-soft)]" />
      <div class="flex-1">
        <p class="text-small font-medium text-accent-primary">Criar cards com IA</p>
        <p class="text-micro text-base-muted">Sua cota acabou este mês</p>
      </div>
      <span class="text-small text-accent-primary font-medium shrink-0">Pro →</span>
    </button>

    <!-- Success banner after note generation -->
    <div v-if="completedDoc" class="mt-3 p-4 rounded-xl bg-accent-primary-subtle/50 border border-[var(--color-accent-primary)]/10">
      <div class="flex items-center gap-2 mb-2">
        <CheckCircle :size="16" class="text-success" />
        <p class="text-body font-semibold text-base-primary">Resumo pronto!</p>
      </div>
      <p v-if="completedDoc.note_stats" class="text-small text-base-secondary mb-3">
        {{ completedDoc.note_stats.sections }} seções
        <span v-if="completedDoc.note_stats.gotchas"> · {{ completedDoc.note_stats.gotchas }} pegadinhas</span>
        <span v-if="completedDoc.note_stats.insights"> · {{ completedDoc.note_stats.insights }} dicas</span>
      </p>
      <div class="flex gap-2">
        <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="handleGenerateCards">
          <Sparkles :size="13" /> Gerar cards agora
        </button>
        <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="completedDoc = null">
          Depois
        </button>
      </div>
    </div>

    <!-- PDF Viewer -->
    <TopicPdfViewer
      v-model="showViewer"
      :url="viewerUrl"
      :filename="viewerFilename"
      :topic-id="topicId"
    />

    <!-- Generate Note Sheet -->
    <TopicGenerateNoteSheet
      v-model="showGenerateNote"
      :document="selectedDoc"
      @generated="onNoteGenerated"
    />

    <!-- Confirm cards generation -->
    <UiConfirmModal
      v-model="showConfirmCards"
      title="Gerar cards com IA"
      :message="`Gerar cards a partir de &quot;${selectedDoc?.original_name}&quot;? Isso consome créditos de IA.`"
      confirm-label="Gerar cards"
      variant="primary"
      @confirm="confirmGenerateCards"
    />

    <!-- Confirm document deletion -->
    <UiConfirmModal
      v-model="showDeleteDoc"
      title="Remover PDF?"
      message="O PDF será removido. Resumos e cards já gerados serão mantidos."
      confirm-label="Remover"
      @confirm="handleDeleteDoc"
    />

    <!-- Upload modal (learning mode selection) -->
    <TopicUploadModal
      v-model="showUploadModal"
      :default-mode="auth.user?.default_learning_mode || 'general'"
      @confirm="onUploadModalConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { Upload, FileText, Loader2, CheckCircle, XCircle, Sparkles, Lock, Trash2 } from 'lucide-vue-next'
import type { Document } from '~/types'

const props = defineProps<{ topicId: string; topicLearningMode?: string | null }>()
const emit = defineEmits<{
  generateFromPdf: [documentId: string]
  noteReady: []
  generateCards: [noteId: string]
}>()

const { $api } = useNuxtApp()
const toast = useToast()
const auth = useAuthStore()
const featureUsage = useFeatureUsage()
const docStore = useDocumentStore()

const documents = computed(() => docStore.documents)

const uploadMaxSize = computed(() =>
  (auth.user?.plan === 'pro' ? 100 : 50) * 1024 * 1024,
)

const showPaywall = computed(() =>
  auth.user?.plan === 'free' && featureUsage.remaining('cards_ai') === 0,
)

function openUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', {
    detail: { feature: 'Geração de cards com IA', planRequired: 'pro' },
  }))
}

const docUpload = useDocumentUpload()
const uploading = docUpload.uploading
const uploadProgress = docUpload.uploadProgress
const completedDoc = ref<Document | null>(null)
const dismissedLanguageBanners = ref(new Set<string>())

// Upload modal (when topic has no learning mode)
const showUploadModal = ref(false)
const pendingFile = ref<File | null>(null)
const regeneratingDoc = ref<string | null>(null)

async function regenerateNote(doc: Document) {
  regeneratingDoc.value = doc.id
  try {
    await $api(`/documents/${doc.id}/regenerate-note`, { method: 'POST' })
    toast.show('Nota sendo re-gerada com o novo modo!')
    await docStore.fetchForTopic(props.topicId, true)
    docStore.startPolling()
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao re-gerar.', 'error')
  } finally {
    regeneratingDoc.value = null
  }
}

function languageName(code?: string | null): string {
  const map: Record<string, string> = { en: 'Inglês', es: 'Espanhol', fr: 'Francês', de: 'Alemão', it: 'Italiano', ja: 'Japonês', ko: 'Coreano', zh: 'Chinês' }
  return map[code ?? ''] ?? code ?? 'idioma estrangeiro'
}

function dismissLanguageBanner(docId: string) {
  dismissedLanguageBanners.value.add(docId)
}

async function setLanguageMode(doc: Document) {
  dismissLanguageBanner(doc.id)
  try {
    await $api(`/topics/${props.topicId}`, {
      method: 'PUT',
      body: { learning_mode: 'language', target_language: doc.source_language || 'en' },
    })
    toast.show(`Modo idioma ativado! Próxima geração usará formato bilíngue.`, 'success')
  } catch {
    toast.show('Erro ao atualizar modo.', 'error')
  }
}

// Viewer state
const showViewer = ref(false)
const viewerUrl = ref('')
const viewerFilename = ref('')

// Generate note state
const showGenerateNote = ref(false)
const selectedDoc = ref<Document | null>(null)

// Generate cards confirmation
const showConfirmCards = ref(false)

// Delete document
const showDeleteDoc = ref(false)
const deleteDocId = ref<string | null>(null)

function confirmDelete(doc: Document) {
  deleteDocId.value = doc.id
  showDeleteDoc.value = true
}

async function handleDeleteDoc() {
  if (!deleteDocId.value) return
  try {
    await $api(`/documents/${deleteDocId.value}`, { method: 'DELETE' })
    toast.show('PDF removido.')
    await docStore.fetchForTopic(props.topicId, true)
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao remover.', 'error')
  } finally {
    showDeleteDoc.value = false
    deleteDocId.value = null
  }
}

async function resolveViewerUrl(doc: Document): Promise<string> {
  const auth = useAuthStore()
  try {
    const res = await $api<{ url: string }>(`/documents/${doc.id}/file`, {
      params: { token: auth.token },
    })
    if (res.url) return res.url
  } catch {}
  const config = useRuntimeConfig()
  const auth2 = useAuthStore()
  return `${config.public.apiBase}/documents/${doc.id}/file?token=${auth2.token}`
}

async function openViewer(doc: Document) {
  viewerFilename.value = doc.original_name
  viewerUrl.value = await resolveViewerUrl(doc)
  showViewer.value = true
}

function openGenerateNote(doc: Document) {
  selectedDoc.value = doc
  showGenerateNote.value = true
}

function openGenerateCards(doc: Document) {
  selectedDoc.value = doc
  showConfirmCards.value = true
}

function confirmGenerateCards() {
  if (selectedDoc.value) {
    emit('generateFromPdf', selectedDoc.value.id)
  }
  showConfirmCards.value = false
}

function onNoteGenerated() {
  docStore.fetchForTopic(props.topicId, true)
  docStore.startPolling()
}

function handleGenerateCards() {
  if (completedDoc.value?.note_stats?.note_id) {
    emit('generateCards', completedDoc.value.note_stats.note_id)
  }
  completedDoc.value = null
}

async function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > uploadMaxSize.value) { toast.show(`Máximo ${auth.user?.plan === 'pro' ? '100' : '50'}MB`, 'error'); return }
  if (!file.name.endsWith('.pdf')) { toast.show('Apenas PDF', 'error'); return }

  // If topic has no learning mode, show modal first
  if (!props.topicLearningMode) {
    pendingFile.value = file
    showUploadModal.value = true
    return
  }

  await doUpload(file)
}

async function onUploadModalConfirm(data: { learning_mode: string; target_language?: string; language_level?: string }) {
  // Set mode on topic before uploading
  try {
    await $api(`/topics/${props.topicId}`, { method: 'PUT', body: data })
  } catch {}

  if (pendingFile.value) {
    await doUpload(pendingFile.value)
    pendingFile.value = null
  }
}

async function doUpload(file: File) {
  const success = await docUpload.upload(file, props.topicId)
  if (success) await docStore.fetchForTopic(props.topicId, true)
}

// Watch store documents for completion events (toasts + emits)
let prevGeneratingIds: string[] = []

watch(documents, (docs) => {
  for (const id of prevGeneratingIds) {
    const doc = docs.find(d => d.id === id)
    if (doc && doc.note_generation_status !== 'generating') {
      if (doc.note_generation_status === 'completed') {
        toast.show('Material de estudo gerado!')
        completedDoc.value = doc
        emit('noteReady')
      } else if (doc.note_generation_status === 'failed') {
        toast.show('Falha ao gerar nota. Tente novamente.', 'error')
      }
    }
  }

  prevGeneratingIds = docs.filter(d => d.note_generation_status === 'generating').map(d => d.id)
}, { deep: true })
</script>
