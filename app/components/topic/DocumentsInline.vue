<template>
  <div>
    <!-- Upload area -->
    <label
      class="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all"
      :class="uploading ? 'opacity-50 pointer-events-none border-base' : 'border-accent-primary/30 hover:border-accent-primary hover:bg-accent-primary-subtle'"
    >
      <Upload :size="20" class="text-accent-primary shrink-0" />
      <div>
        <p class="text-small text-base-primary">{{ uploading ? `Enviando ${uploadProgress}%...` : 'Adicionar material' }}</p>
        <p v-if="!uploading" class="text-small text-base-muted">PDF como referência — grátis e ilimitado</p>
      </div>
      <input type="file" accept=".pdf" class="hidden" @change="onFileSelect" />
    </label>

    <!-- Documents list -->
    <div v-if="documents.length" class="space-y-2 mt-3">
      <div v-for="doc in documents" :key="doc.id" class="rounded-lg bg-surface-tertiary overflow-hidden">
        <!-- Clickable header -->
        <!-- Row: click name = open PDF, click chevron = toggle actions -->
        <div class="flex items-center px-4 py-3">
          <button
            class="min-w-0 flex-1 text-left group"
            @click="openViewer(doc)"
          >
            <p class="text-body text-accent-primary truncate font-medium group-hover:underline">📄 {{ doc.original_name }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span v-if="doc.pages_count" class="text-micro text-base-muted">{{ doc.pages_count }} páginas</span>
              <span v-if="doc.status === 'processing'" class="text-micro text-accent-primary">⚙️ Processando...</span>
              <span v-if="doc.has_generated_note" class="text-micro text-success">✅ Nota gerada</span>
            </div>
          </button>
          <button
            class="p-2 -mr-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Ações do documento"
            @click="expandedDoc = expandedDoc === doc.id ? null : doc.id"
          >
            <ChevronDown
              :size="16"
              class="text-base-muted transition-transform"
              :class="expandedDoc === doc.id ? 'rotate-180' : ''"
            />
          </button>
        </div>

        <!-- Collapsible actions -->
        <div v-if="expandedDoc === doc.id" class="flex gap-2 px-4 pb-3">
          <button
            class="btn-primary !py-2 !px-3.5 !min-h-[2.75rem] text-small flex-1"
            :disabled="doc.status === 'processing' || (doc.pages_count && doc.pages_count > 100)"
            :title="doc.pages_count && doc.pages_count > 100 ? 'Máximo 100 páginas' : ''"
            @click="openGenerateNote(doc)"
          >
            ✨ Criar material de estudo
          </button>
          <button class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small" @click="openGenerateCards(doc)">
            🃏 Cards
          </button>
        </div>
      </div>
    </div>

    <!-- PDF Viewer -->
    <TopicPdfViewer
      v-model="showViewer"
      :url="viewerUrl"
      :filename="viewerFilename"
      :topic-id="topicId"
    />

    <!-- Generate Note Sheet (already has credit confirmation) -->
    <TopicGenerateNoteSheet
      v-model="showGenerateNote"
      :document="selectedDoc"
      @generated="onNoteGenerated"
    />

    <!-- Confirm cards generation (consumes credits) -->
    <UiConfirmModal
      v-model="showConfirmCards"
      title="Gerar cards com IA"
      :message="`Isso consome créditos de geração de cards IA. Deseja gerar cards a partir de &quot;${selectedDoc?.original_name}&quot;?`"
      confirm-label="Gerar cards"
      variant="primary"
      @confirm="confirmGenerateCards"
    />
  </div>
</template>

<script setup lang="ts">
import { Upload, ChevronDown } from 'lucide-vue-next'
import type { Document } from '~/types'

const props = defineProps<{ topicId: string }>()
const emit = defineEmits<{ generateFromPdf: [documentId: string] }>()

const { $api } = useNuxtApp()
const toast = useToast()

const documents = ref<Document[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const expandedDoc = ref<string | null>(null)

// Viewer state
const showViewer = ref(false)
const viewerUrl = ref('')
const viewerFilename = ref('')

// Generate note state
const showGenerateNote = ref(false)
const selectedDoc = ref<Document | null>(null)

// Generate cards confirmation
const showConfirmCards = ref(false)

async function resolveViewerUrl(doc: Document): Promise<string> {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  try {
    const res = await $api<{ url: string }>(`/documents/${doc.id}/file`, {
      params: { token: auth.token },
    })
    // If backend returns JSON with signed URL
    if (res.url) return res.url
  } catch {}
  // Fallback: direct endpoint (local dev)
  const config2 = useRuntimeConfig()
  return `${config2.public.apiBase}/documents/${doc.id}/file?token=${auth.token}`
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
  startPolling()
  fetchDocuments()
}

async function fetchDocuments() {
  try {
    const res = await $api<{ data: Document[] }>('/documents', { params: { topic_id: props.topicId } })
    documents.value = res.data.filter(d => d.topic_id === props.topicId)
  } catch {}
}

async function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 50 * 1024 * 1024) { toast.show('Máximo 50MB', 'error'); return }
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
    await fetchDocuments()
  } catch (e: any) {
    toast.show(e?.message || 'Erro ao enviar', 'error')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

// Polling for processing status
const hasProcessing = computed(() => documents.value.some(d => d.status === 'processing'))
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    await fetchDocuments()
    if (!hasProcessing.value) { clearInterval(pollTimer!); pollTimer = null }
  }, 5000)
}

watch(() => props.topicId, () => { if (props.topicId) fetchDocuments() }, { immediate: true })
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

defineExpose({ documents })
</script>
