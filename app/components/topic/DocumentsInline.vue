<template>
  <div>
    <!-- Upload area -->
    <label
      class="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all"
      :class="uploading ? 'opacity-50 pointer-events-none border-base' : 'border-accent-primary/30 hover:border-accent-primary hover:bg-accent-primary-subtle'"
    >
      <Upload :size="20" class="text-accent-primary shrink-0" />
      <div>
        <p class="text-small text-base-primary">{{ uploading ? `Enviando ${uploadProgress}%...` : 'Subir PDF' }}</p>
        <p v-if="!uploading" class="text-small text-base-muted">A IA transforma em resumo + flashcards</p>
      </div>
      <input type="file" accept=".pdf" class="hidden" @change="onFileSelect" />
    </label>

    <!-- Paywall banner -->
    <button
      v-if="showPaywall"
      class="w-full mt-3 px-4 py-3 rounded-xl bg-accent-primary-subtle border border-accent-primary/20 flex items-center gap-3 text-left hover:bg-accent-primary/10 transition-colors"
      @click="openUpgrade"
    >
      <span class="text-body">✨</span>
      <div class="flex-1">
        <p class="text-small font-medium text-accent-primary">Deixar a IA criar os cards</p>
        <p class="text-micro text-base-muted">Sua cota de IA acabou este mês</p>
      </div>
      <span class="text-small text-accent-primary font-medium shrink-0">Desbloquear Pro →</span>
    </button>

    <!-- Documents list -->
    <!-- Documents list -->
    <div v-if="documents.length" class="space-y-3 mt-3">
      <div v-for="doc in documents" :key="doc.id" class="rounded-xl bg-surface-secondary/60 border border-accent-primary/10 p-4">
        <!-- File info -->
        <button class="flex items-center gap-2 group w-full text-left" @click="openViewer(doc)">
          <FileText :size="16" class="text-accent-primary shrink-0" />
          <p class="text-body text-accent-primary truncate font-medium group-hover:underline">{{ doc.original_name }}</p>
          <span v-if="doc.pages_count" class="text-micro text-base-muted shrink-0">{{ doc.pages_count }} pág</span>
        </button>

        <!-- Status: Generating -->
        <div v-if="doc.note_generation_status === 'generating'" class="mt-3 flex items-center gap-2 text-small text-accent-primary">
          <Loader2 :size="14" class="animate-spin" />
          <span>A IA está lendo {{ doc.pages_count || '' }} páginas... Pode sair, avisamos quando estiver pronto.</span>
        </div>

        <!-- Status: Failed -->
        <div v-else-if="doc.note_generation_status === 'failed'" class="mt-3 flex items-center gap-2 text-small text-danger">
          <XCircle :size="14" />
          <span>Falhou ao gerar.</span>
          <button class="text-accent-primary hover:underline" @click="openGenerateNote(doc)">Tentar novamente</button>
        </div>

        <!-- Status: Ready -->
        <div v-else-if="doc.has_generated_note" class="mt-3">
          <div class="flex items-center gap-2 mb-2">
            <CheckCircle :size="14" class="text-success shrink-0" />
            <span class="text-small text-success">Resumo pronto</span>
          </div>
          <button
            class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small w-full justify-center"
            @click="openGenerateCards(doc)"
          >
            <Sparkles :size="14" /> Gerar cards a partir do resumo
          </button>
          <button
            v-if="!doc.topic_tree_generated && doc.study_structure_status !== 'generating' && doc.study_structure_status !== 'failed'"
            class="btn-secondary !py-2 !px-4 !min-h-[2.75rem] text-small w-full justify-center mt-2"
            :disabled="studyStructureLoading"
            @click="generateStudyStructure(doc)"
          >
            <Layers :size="14" />
            <span v-if="studyStructureLoading">Criando estrutura...</span>
            <span v-else>📋 Criar estrutura de estudo</span>
          </button>
          <div v-else-if="doc.study_structure_status === 'generating'" class="mt-2 flex items-center gap-2 text-small text-accent-primary">
            <Loader2 :size="14" class="animate-spin" />
            <span>Organizando seus cadernos com IA...</span>
          </div>
          <div v-else-if="doc.study_structure_status === 'failed'" class="mt-2 flex items-center gap-2 text-small text-danger">
            <XCircle :size="14" />
            <span>Falhou ao criar estrutura.</span>
            <button class="text-accent-primary hover:underline ml-1" @click="generateStudyStructure(doc)">Tentar novamente</button>
          </div>
          <div v-else-if="doc.topic_tree_generated" class="mt-2 flex items-center gap-2 text-small text-success">
            <CheckCircle :size="14" />
            <span>Estrutura de estudo criada</span>
            <NuxtLink to="/cadernos" class="text-accent-primary hover:underline ml-auto text-micro">Ver cadernos →</NuxtLink>
          </div>
        </div>

        <!-- Status: Processing embeddings -->
        <div v-else-if="doc.status === 'processing'" class="mt-3 flex items-center gap-2 text-small text-base-muted">
          <Loader2 :size="14" class="animate-spin text-accent-primary" />
          <span>Processando...</span>
        </div>

        <!-- CTA: Generate note (visible directly, no collapse needed) -->
        <div v-else class="mt-3">
          <button
            class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small w-full justify-center"
            :disabled="doc.pages_count && doc.pages_count > 100"
            @click="openGenerateNote(doc)"
          >
            <Sparkles :size="14" /> Gerar resumo com IA
          </button>
          <p class="text-micro text-base-muted text-center mt-1.5">Extrai conceitos, pegadinhas e pontos-chave</p>
          <p v-if="doc.pages_count && doc.pages_count > 100" class="text-micro text-amber-400 text-center mt-1">
            ⚠️ Máximo 100 páginas para processar com IA
          </p>
        </div>
      </div>
    </div>

    <!-- Success banner after note generation -->
    <div v-if="completedDoc" class="mt-3 p-4 rounded-xl bg-accent-primary-subtle">
      <div class="flex items-center gap-2 mb-2">
        <CheckCircle :size="18" class="text-success" />
        <p class="text-body font-semibold text-base-primary">Resumo pronto!</p>
      </div>
      <p v-if="completedDoc.note_stats" class="text-small text-base-secondary mb-3">
        {{ completedDoc.note_stats.sections }} seções
        <span v-if="completedDoc.note_stats.gotchas"> · {{ completedDoc.note_stats.gotchas }} pegadinhas</span>
        <span v-if="completedDoc.note_stats.insights"> · {{ completedDoc.note_stats.insights }} dicas</span>
      </p>
      <div class="flex gap-2">
        <button class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small" @click="handleGenerateCards">
          <Sparkles :size="14" /> Gerar cards agora
        </button>
        <button class="btn-secondary !py-2 !px-3 !min-h-[2.75rem] text-small" @click="completedDoc = null">
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
      :message="`Isso consome créditos de geração de cards IA. Deseja gerar cards a partir de &quot;${selectedDoc?.original_name}&quot;?`"
      confirm-label="Gerar cards"
      variant="primary"
      @confirm="confirmGenerateCards"
    />
  </div>
</template>

<script setup lang="ts">
import { Upload, ChevronDown, FileText, Loader2, CheckCircle, XCircle, Sparkles, Layers } from 'lucide-vue-next'
import type { Document } from '~/types'

const props = defineProps<{ topicId: string }>()
const emit = defineEmits<{
  generateFromPdf: [documentId: string]
  noteReady: []
  generateCards: [noteId: string]
  structureReady: []
}>()

const { $api } = useNuxtApp()
const toast = useToast()
const auth = useAuthStore()
const featureUsage = useFeatureUsage()

const showPaywall = computed(() =>
  auth.user?.plan === 'free' && featureUsage.remaining('cards_ai') === 0,
)

function openUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', {
    detail: { feature: 'Geração de cards com IA', planRequired: 'pro' },
  }))
}

const documents = ref<Document[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const expandedDoc = ref<string | null>(null)
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

// Study structure
const studyStructureLoading = ref(false)

async function generateStudyStructure(doc: Document) {
  studyStructureLoading.value = true
  try {
    await $api('/topics/from-document', { method: 'POST', body: { document_id: doc.id } })
    toast.show('Estrutura sendo criada com IA...')
    doc.study_structure_status = 'generating'
    startPolling()
  } catch (e: any) {
    const msg = e?.data?.message || 'Erro ao criar estrutura.'
    toast.show(msg, 'error')
  } finally {
    studyStructureLoading.value = false
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
  startPolling()
  fetchDocuments()
}

function handleGenerateCards() {
  if (completedDoc.value?.note_stats?.note_id) {
    emit('generateCards', completedDoc.value.note_stats.note_id)
  }
  completedDoc.value = null
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

// Polling: check for generating notes + processing documents
const needsPolling = computed(() =>
  documents.value.some(d => d.note_generation_status === 'generating' || d.status === 'processing' || d.study_structure_status === 'generating'),
)
let pollTimer: ReturnType<typeof setInterval> | null = null
let pollStartedAt: number | null = null
const POLL_TIMEOUT = 10 * 60 * 1000 // 10 minutes

function startPolling() {
  if (pollTimer) return
  pollStartedAt = Date.now()
  pollTimer = setInterval(async () => {
    // Timeout protection: stop polling but don't mark as failed
    if (pollStartedAt && Date.now() - pollStartedAt > POLL_TIMEOUT) {
      toast.show('Processamento em andamento. Atualize a página para verificar.', 'success')
      clearInterval(pollTimer!)
      pollTimer = null
      pollStartedAt = null
      return
    }

    const prevGenerating = documents.value.filter(d => d.note_generation_status === 'generating').map(d => d.id)
    const prevStructure = documents.value.filter(d => d.study_structure_status === 'generating').map(d => d.id)
    await fetchDocuments()

    // Check if any note just finished generating
    for (const id of prevGenerating) {
      const doc = documents.value.find(d => d.id === id)
      if (doc && doc.note_generation_status !== 'generating') {
        if (doc.note_generation_status === 'completed') {
          toast.show('Material de estudo gerado! 🎉')
          completedDoc.value = doc
          emit('noteReady')
        } else if (doc.note_generation_status === 'failed') {
          toast.show('Falha ao gerar nota. Tente novamente.', 'error')
        }
      }
    }

    // Check if study structure finished
    for (const id of prevStructure) {
      const doc = documents.value.find(d => d.id === id)
      if (doc && doc.study_structure_status !== 'generating') {
        if (doc.study_structure_status === 'completed') {
          toast.show('Estrutura de estudo criada! Seus cadernos foram organizados. 📚')
          emit('structureReady')
        } else if (doc.study_structure_status === 'failed') {
          toast.show('Falha ao criar estrutura. Tente novamente.', 'error')
        }
      }
    }

    if (!needsPolling.value) {
      clearInterval(pollTimer!)
      pollTimer = null
      pollStartedAt = null
    }
  }, 4000)
}

watch(needsPolling, (val) => { if (val) startPolling() })
watch(() => props.topicId, () => { if (props.topicId) fetchDocuments() }, { immediate: true })
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

defineExpose({ documents })
</script>
