<template>
  <div>
    <div v-if="docStore.error && !documents.length" class="mt-3">
      <UiErrorState title="Não foi possível carregar os PDFs" @retry="docStore.fetchForTopic(props.topicId, true)" />
    </div>
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
            class="p-1.5 rounded-lg text-base-muted hover:text-[var(--badge-danger-text)] hover:bg-danger/10 transition-colors shrink-0"
            title="Remover PDF"
            @click="confirmDelete(doc)"
           aria-label="Remover PDF">
            <Trash2 :size="14" aria-hidden="true" />
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
            <div v-if="doc.note_total_batches" class="w-full h-2 bg-[var(--border-base)] rounded-full overflow-hidden mt-1.5">
              <div
                class="h-full bg-[var(--color-accent-primary)] rounded-full transition-all duration-700 ease-out"
                :style="{ width: `${Math.max(5, Math.round((doc.note_generation_progress / doc.note_total_batches) * 100))}%` }"
              />
            </div>
            <p v-if="doc.note_generation_progress" class="text-micro text-base-muted">Pode ler o que já está pronto na nota abaixo</p>
          </div>

          <!-- Failed -->
          <div v-else-if="doc.note_generation_status === 'failed'" class="flex items-center gap-2 text-small">
            <XCircle :size="14" class="text-[var(--badge-danger-text)] shrink-0" />
            <span class="text-[var(--badge-danger-text)]">Falhou.</span>
            <button class="text-accent-primary hover:underline" @click="openGenerateNote(doc)">Tentar novamente</button>
          </div>

          <!-- Completed: resumo pronto -->
          <div v-else-if="doc.has_generated_note">
            <div class="flex items-center gap-2 flex-wrap">
              <CheckCircle :size="14" class="text-[var(--badge-success-text)] shrink-0" />
              <span class="text-small text-[var(--badge-success-text)] font-medium">Resumo pronto</span>
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

            <!-- PDF → cards (RF-F5.2) -->
            <div class="mt-2" aria-live="polite">
              <div v-if="doc.auto_cards_status === 'pending' || doc.auto_cards_status === 'generating'" class="flex items-center gap-2 text-small text-base-secondary">
                <Loader2 :size="14" class="animate-spin text-accent-primary" aria-label="Criando cards" />
                <span>Resumo pronto · Criando cards…</span>
              </div>
              <div v-else-if="doc.auto_cards_status === 'completed'" class="flex items-center gap-3 flex-wrap">
                <span class="px-2 py-0.5 rounded-full text-micro font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]">{{ doc.auto_cards_count }} cards</span>
                <NuxtLink :to="`/revisar?topic_id=${topicId}`" class="btn-primary !py-1.5 !px-3 !min-h-[44px] text-small">
                  Revisar {{ doc.auto_cards_count }} cards
                </NuxtLink>
                <button type="button" class="text-small text-accent-primary underline underline-offset-2 min-h-[44px]" @click="$emit('viewCards', doc.note_id ?? null)">
                  Ver e editar cards
                </button>
              </div>
              <div v-else-if="doc.auto_cards_status === 'skipped_quota'" class="flex items-center gap-3 flex-wrap text-small">
                <span class="text-base-secondary">Resumo pronto. Sem gerações de cards este mês.</span>
                <button type="button" class="text-accent-primary font-medium underline underline-offset-2 min-h-[44px]" :disabled="retryingCards === doc.id" @click="retryAutoCards(doc)">
                  Gerar cards
                </button>
              </div>
              <p v-else-if="doc.auto_cards_status === 'skipped_empty'" class="text-small text-base-muted">
                Resumo curto demais para gerar cards.
              </p>
              <div v-else-if="doc.auto_cards_status === 'failed'" class="flex items-center gap-3 flex-wrap text-small">
                <span class="text-[var(--badge-danger-text)]">Não conseguimos criar os cards.</span>
                <button type="button" class="text-accent-primary font-medium underline underline-offset-2 min-h-[44px]" :disabled="retryingCards === doc.id" @click="retryAutoCards(doc)">
                  {{ retryingCards === doc.id ? 'Enviando…' : 'Tentar de novo' }}
                </button>
              </div>
              <button
                v-else
                class="inline-flex items-center gap-1.5 text-small text-accent-primary font-medium hover:underline transition-colors min-h-[44px]"
                @click="openGenerateCards(doc)"
              >
                <Sparkles :size="13" aria-hidden="true" /> Gerar cards
              </button>
            </div>

            <!-- Re-generation banner (mode changed after note was generated) -->
            <div
              v-if="doc.learning_mode_used && props.topicLearningMode && doc.learning_mode_used !== props.topicLearningMode"
              class="mt-2 px-3 py-2 rounded-lg bg-[var(--badge-warning-bg)] border border-[var(--badge-warning-text)]"
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

          <!-- Upload succeeded but the automatic note was not started (RF-63) -->
          <div v-else-if="blockedDocs[doc.id]" class="px-3 py-2 rounded-lg bg-surface-secondary border border-base">
            <template v-if="blockedDocs[doc.id] === 'feature_limit'">
              <p class="text-small text-base-primary mb-1.5">Nota não gerada: limite do mês.</p>
              <button class="text-small text-accent-primary font-medium hover:underline" @click="openNoteUpgrade">Ver o que o Pro libera</button>
            </template>
            <p v-else-if="blockedDocs[doc.id] === 'pages_cap'" class="text-small text-base-secondary">
              Limite de leitura da IA atingido este mês. Agente e flashcards continuam funcionando normalmente.
            </p>
            <template v-else>
              <p class="text-small text-base-primary mb-1.5">Outra nota está sendo gerada; gere esta quando terminar.</p>
              <button class="text-small text-accent-primary font-medium hover:underline" @click="openGenerateNote(doc)">Gerar nota</button>
            </template>
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
      <Sparkles :size="16" class="text-[var(--badge-primary-text)]" />
      <div class="flex-1">
        <p class="text-small font-medium text-accent-primary">Gerar cards</p>
        <p class="text-micro text-base-muted">Sua cota acabou este mês</p>
      </div>
      <span class="text-small text-accent-primary font-medium shrink-0">Pro →</span>
    </button>

    <!-- Success banner after note generation -->
    <div v-if="completedDoc" class="mt-3 p-4 rounded-xl bg-accent-primary-subtle/50 border border-[var(--color-accent-primary)]/10">
      <div class="flex items-center gap-2 mb-2">
        <CheckCircle :size="16" class="text-[var(--badge-success-text)]" />
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
    <LazyTopicPdfViewer
      v-if="viewerLoaded"
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
import type { Document, DocumentAutoGeneration } from '~/types'

const props = defineProps<{ topicId: string; topicLearningMode?: string | null }>()
const emit = defineEmits<{
  generateFromPdf: [documentId: string]
  noteReady: []
  generateCards: [noteId: string]
  viewCards: [noteId: string | null]
}>()

const { $api } = useNuxtApp()
const toast = useToast()
const auth = useAuthStore()
const featureUsage = useFeatureUsage()
const docStore = useDocumentStore()

const documents = computed(() => docStore.documents)

const showPaywall = computed(() =>
  auth.user?.plan === 'free' && featureUsage.remaining('cards_ai') === 0,
)

function openUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', {
    detail: { feature: 'cards_ai', planRequired: 'pro' },
  }))
}

const docUpload = useDocumentUpload()
const uploading = docUpload.uploading
const uploadProgress = docUpload.uploadProgress
// Documents whose automatic note was blocked on upload, by reason
const blockedDocs = ref<Record<string, NonNullable<DocumentAutoGeneration['blocked_reason']>>>({})

function openNoteUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', {
    detail: { feature: 'pdf_to_note', planRequired: 'pro' },
  }))
}
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
    if (e?.response?.status !== 402) toast.show(e?.data?.message || 'Erro ao re-gerar.', 'error')
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
const viewerLoaded = useLoadedOnce(() => showViewer.value) // component + styles only on first open
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
  // Short-lived signed URL (15 min, RN-05): resolved on every open, so a
  // viewer reopened later always gets a fresh one.
  const res = await $api<{ data: { url: string } }>(`/documents/${doc.id}/file-url`)
  return res.data.url
}

async function openViewer(doc: Document) {
  try {
    const url = await resolveViewerUrl(doc)
    viewerFilename.value = doc.original_name
    viewerUrl.value = url
    showViewer.value = true
  } catch {
    toast.show('Não foi possível abrir o PDF.', 'error')
  }
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
  // Type/size against GET /api/plans (RN-UX-06: no hardcoded limits)
  const invalid = await docUpload.validate(file)
  if (invalid) { toast.show(invalid, 'error'); return }

  // If topic has no learning mode, show modal first
  if (!props.topicLearningMode) {
    pendingFile.value = file
    showUploadModal.value = true
    return
  }

  await doUpload(file)
}

const { run: runAction } = useApiAction()

async function onUploadModalConfirm(data: { learning_mode: string; target_language?: string; language_level?: string; auto_cards?: boolean }) {
  const { auto_cards: autoCards, ...mode } = data as typeof data & { file?: File }
  delete (mode as any).file
  // Set mode on topic before uploading (the upload continues even if this fails)
  await runAction(() => $api(`/topics/${props.topicId}`, { method: 'PUT', body: mode }), {
    error: 'Não foi possível salvar o modo de estudo do caderno.',
  })

  if (pendingFile.value) {
    await doUpload(pendingFile.value, autoCards)
    pendingFile.value = null
  }
}

const retryingCards = ref<string | null>(null)

async function retryAutoCards(doc: Document) {
  retryingCards.value = doc.id
  const ok = await runAction(() => $api(`/documents/${doc.id}/generate-cards`, { method: 'POST' }), {
    error: 'Não foi possível criar os cards agora.',
  })
  retryingCards.value = null
  if (ok !== undefined) {
    await docStore.fetchForTopic(props.topicId, true)
    docStore.startPolling()
  }
}

async function doUpload(file: File, autoCards = readAutoCardsPref()) {
  const success = await docUpload.upload(file, { topicId: props.topicId, autoCards, source: 'caderno' })
  const auto = docUpload.autoGeneration.value
  if (success && auto && !auto.dispatched && auto.blocked_reason) {
    blockedDocs.value = { ...blockedDocs.value, [auto.documentId]: auto.blocked_reason }
  }
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
        // With automatic cards the next step is already running: no "Gerar cards agora" banner
        if (!doc.auto_cards) completedDoc.value = doc
        emit('noteReady')
      } else if (doc.note_generation_status === 'failed') {
        toast.show('Falha ao gerar nota. Tente novamente.', 'error')
      }
    }
  }

  prevGeneratingIds = docs.filter(d => d.note_generation_status === 'generating').map(d => d.id)
}, { deep: true })
</script>
