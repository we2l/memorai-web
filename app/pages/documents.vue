<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-display">Meus PDFs</h1>
    </div>

    <!-- Upload -->
    <div
      class="card p-8 mb-6 border-2 border-dashed border-base text-center cursor-pointer hover:border-accent-primary transition-colors"
      @click="fileInput?.click()"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
      :class="{ 'border-accent-primary bg-accent-primary/5': dragOver }"
      role="button"
      aria-label="Fazer upload de PDF"
    >
      <Upload :size="32" class="mx-auto mb-2 text-base-muted" />
      <p class="text-base-secondary">Arraste um PDF aqui ou clique para selecionar</p>
      <p class="text-small text-base-muted mt-1">Máximo 50MB, formato .pdf</p>
      <input
        ref="fileInput"
        type="file"
        accept=".pdf"
        class="hidden"
        @change="onFileSelect"
      />
    </div>

    <!-- Upload progress -->
    <div v-if="uploading" class="card p-4 mb-6">
      <div class="flex justify-between mb-2">
        <p class="text-small text-base-muted">Enviando {{ uploadName }}...</p>
        <span class="text-small text-base-primary font-medium">{{ uploadProgress }}%</span>
      </div>
      <div class="w-full bg-surface-tertiary rounded-full h-2">
        <div class="bg-accent-primary h-2 rounded-full transition-all duration-300" :style="{ width: uploadProgress + '%' }" />
      </div>
    </div>

    <!-- List -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card p-4"><div class="skeleton h-6 w-48" /></div>
    </div>

    <div v-else-if="documents.length" class="space-y-3">
      <div v-for="doc in documents" :key="doc.id" class="card p-4 flex items-center justify-between">
        <div>
          <p class="text-base-primary font-medium">{{ doc.original_name }}</p>
          <div class="flex gap-3 mt-1">
            <span class="text-small text-base-muted">{{ formatSize(doc.file_size) }}</span>
            <span v-if="doc.pages_count" class="text-small text-base-muted">{{ doc.pages_count }} páginas</span>
            <span v-if="doc.chunks_count" class="text-small text-base-muted">{{ doc.chunks_count }} trechos</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="px-2 py-1 rounded text-small"
            :class="statusClass(doc.status)"
          >
            {{ statusLabel(doc.status) }}
            <template v-if="doc.status === 'processing' && doc.total_chunks">
              {{ Math.round(((doc.chunks_count || 0) / doc.total_chunks) * 100) }}%
            </template>
          </span>
          <button
            class="text-danger hover:text-danger/80 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Deletar documento"
            :disabled="doc.status === 'pending' || doc.status === 'processing'"
            @click="confirmDeleteDoc(doc.id)"
          >
            <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card p-8 text-center">
      <FileText :size="48" class="mx-auto mb-3 text-base-muted" />
      <p class="text-base-secondary">Nenhum PDF enviado ainda</p>
      <p class="text-small text-base-muted mt-1">Envie apostilas e provas para gerar cards com IA</p>
    </div>
    <UiConfirmModal
      v-model="showDeleteDoc"
      title="Excluir documento?"
      message="O documento e todos os trechos processados serão removidos. Essa ação não pode ser desfeita."
      confirm-label="Excluir"
      @confirm="handleDeleteDoc"
    />
  </div>
</template>

<script setup lang="ts">
import { Upload, Trash2, FileText } from 'lucide-vue-next'
import type { Document } from '~/types'



const { $api } = useNuxtApp()

const documents = ref<Document[]>([])
const loading = ref(true)
const uploading = ref(false)
const uploadName = ref('')
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement>()
const showDeleteDoc = ref(false)
const deleteDocId = ref<string | null>(null)

function confirmDeleteDoc(id: string) {
  deleteDocId.value = id
  showDeleteDoc.value = true
}

async function handleDeleteDoc() {
  if (!deleteDocId.value) return
  try {
    await $api(`/documents/${deleteDocId.value}`, { method: 'DELETE' })
    documents.value = documents.value.filter(d => d.id !== deleteDocId.value)
    useToast().show('Documento removido')
  } catch {
    useToast().show('Erro ao remover documento', 'error')
  }
  deleteDocId.value = null
  showDeleteDoc.value = false
}

async function fetchDocuments() {
  loading.value = true
  try {
    const res = await $api<{ data: Document[] }>('/documents')
    documents.value = res.data
  } finally {
    loading.value = false
  }
}

const uploadProgress = ref(0)

async function uploadFile(file: File) {
  if (file.size > 50 * 1024 * 1024) {
    useToast().show('Arquivo deve ter no máximo 50MB', 'error')
    return
  }
  if (!file.name.endsWith('.pdf')) {
    useToast().show('Apenas arquivos PDF são aceitos', 'error')
    return
  }

  uploading.value = true
  uploadName.value = file.name
  uploadProgress.value = 0

  try {
    const config = useRuntimeConfig()
    const token = useCookie('auth_token').value

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          uploadProgress.value = Math.round((e.loaded / e.total) * 100)
        }
      }
      xhr.onload = () => {
        if (xhr.status < 400) {
          resolve()
        } else {
          try {
            const data = JSON.parse(xhr.responseText)
            reject(new Error(data.message || 'Erro ao enviar PDF'))
          } catch {
            reject(new Error('Erro ao enviar PDF'))
          }
        }
      }
      xhr.onerror = () => reject(new Error('Erro de rede'))
      xhr.open('POST', `${config.public.apiBase}/documents`)
      xhr.setRequestHeader('Accept', 'application/json')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })

    useToast().show('PDF enviado! Processamento iniciado.')
    await fetchDocuments()
    startPolling()
  } catch (e: any) {
    useToast().show(e?.message || 'Erro ao enviar PDF', 'error')
  } finally {
    uploading.value = false
    uploadName.value = ''
    uploadProgress.value = 0
  }
}

function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadFile(file)
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) uploadFile(file)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(s: string) {
  return { pending: 'Aguardando', processing: 'Processando', completed: 'Pronto', failed: 'Erro' }[s] || s
}

function statusClass(s: string) {
  return {
    pending: 'bg-amber-500/10 text-amber-600',
    processing: 'bg-blue-500/10 text-blue-600',
    completed: 'bg-green-500/10 text-green-600',
    failed: 'bg-red-500/10 text-red-600',
  }[s] || ''
}

const hasProcessing = computed(() =>
  documents.value.some(d => d.status === 'pending' || d.status === 'processing'),
)

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (hasProcessing.value) {
      const res = await $api<{ data: Document[] }>('/documents').catch(() => null)
      if (res) documents.value = res.data
    } else {
      stopPolling()
    }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(hasProcessing, (val) => {
  if (val) startPolling()
  else stopPolling()
})

onMounted(fetchDocuments)
onUnmounted(stopPolling)
</script>
