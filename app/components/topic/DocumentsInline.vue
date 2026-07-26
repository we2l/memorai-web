<template>
  <div>
    <!-- Upload area (compact) -->
    <label
      class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all"
      :class="uploading ? 'opacity-50 pointer-events-none border-base bg-[var(--bg-card)]' : 'border-[var(--color-accent-primary)]/30 bg-[var(--color-primary-50)] hover:border-[var(--color-accent-primary)]/50 hover:bg-[var(--color-primary-100)]'"
      title="Aceita PDF de até 50MB (Free) ou 100MB (Pro). A IA lê o documento e cria uma nota estruturada com conceitos, pegadinhas e pontos-chave."
    >
      <Upload :size="18" class="text-accent-primary shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-accent-primary">{{ uploading ? `Enviando ${uploadProgress}%...` : 'Adicionar PDF' }}</p>
        <p v-if="!uploading" class="text-micro text-base-muted">Suba apostilas, livros ou slides — a IA gera resumo e cards pra você</p>
      </div>
      <input type="file" accept=".pdf" class="hidden" @change="onFileSelect" />
    </label>

    <!-- Documents list (compact cards) -->
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
          <!-- Generating -->
          <div v-if="doc.note_generation_status === 'generating'" class="flex items-center gap-2 text-small text-accent-primary">
            <Loader2 :size="14" class="animate-spin" />
            <span>Gerando resumo{{ doc.pages_count ? ` (${doc.pages_count} pág)` : '' }}...</span>
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
                <Sparkles :size="13" /> Gerar cards
              </button>
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
  </div>
</template>

<script setup lang="ts">
import { Upload, FileText, Loader2, CheckCircle, XCircle, Sparkles, Lock, Trash2 } from 'lucide-vue-next'
import type { Document } from '~/types'

const props = defineProps<{ topicId: string }>()
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

const uploading = ref(false)
const uploadProgress = ref(0)
const completedDoc = ref<Document | null>(null)

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

  uploading.value = true
  uploadProgress.value = 0

  try {
    const config = useRuntimeConfig()
    const token = useCookie('auth_token').value

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('topic_id', props.topicId)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
      xhr.onload = () => xhr.status < 400 ? resolve() : reject(new Error('Erro ao enviar'))
      xhr.onerror = () => reject(new Error('Erro de rede'))
      xhr.open('POST', `${config.public.apiBase}/documents`)
      xhr.setRequestHeader('Accept', 'application/json')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })

    toast.show('PDF enviado!')
    await docStore.fetchForTopic(props.topicId, true)
  } catch (e: any) {
    toast.show(e?.message || 'Erro ao enviar', 'error')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
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
