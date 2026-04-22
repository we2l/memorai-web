<template>
  <div>
    <!-- Documents list -->
    <div v-if="documents.length" class="space-y-2 mb-3">
      <div v-for="doc in documents" :key="doc.id" class="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-tertiary">
        <div class="min-w-0 flex-1">
          <p class="text-small text-base-primary truncate">📄 {{ doc.original_name }}</p>
          <div class="flex gap-2 mt-0.5">
            <span
              class="text-micro"
              :class="doc.status === 'completed' ? 'text-success' : doc.status === 'failed' ? 'text-danger' : 'text-base-muted'"
            >
              {{ statusLabel(doc.status) }}
              <template v-if="doc.status === 'processing' && doc.total_chunks">
                {{ Math.round(((doc.chunks_count || 0) / doc.total_chunks) * 100) }}%
              </template>
            </span>
            <span v-if="doc.chunks_count" class="text-micro text-base-muted">{{ doc.chunks_count }} trechos</span>
          </div>
        </div>
        <button
          v-if="doc.status === 'completed'"
          class="btn-secondary !py-1 !px-2 !min-h-0 text-micro shrink-0 ml-2"
          @click="$emit('generateFromPdf', doc.id)"
        >
          ✨ Gerar cards
        </button>
      </div>
    </div>

    <!-- Upload area -->
    <label
      class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-base cursor-pointer hover:border-accent-primary transition-colors"
      :class="uploading && 'opacity-50 pointer-events-none'"
    >
      <Upload :size="16" class="text-base-muted shrink-0" />
      <span class="text-small text-base-muted">{{ uploading ? `Enviando ${uploadProgress}%...` : 'Upload PDF' }}</span>
      <input type="file" accept=".pdf" class="hidden" @change="onFileSelect" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import type { Document } from '~/types'

const props = defineProps<{ topicId: string }>()
defineEmits<{ generateFromPdf: [documentId: string] }>()

const { $api } = useNuxtApp()
const toast = useToast()

const documents = ref<Document[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)

function statusLabel(s: string) {
  return { pending: 'Aguardando...', processing: 'Processando...', completed: '✅ Pronto', failed: '❌ Erro' }[s] || s
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

    toast.show('PDF enviado! Processamento iniciado.')
    await fetchDocuments()
    startPolling()
  } catch (e: any) {
    toast.show(e?.message || 'Erro ao enviar', 'error')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

const hasProcessing = computed(() => documents.value.some(d => d.status === 'pending' || d.status === 'processing'))
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    if (hasProcessing.value) await fetchDocuments()
    else { clearInterval(pollTimer!); pollTimer = null }
  }, 5000)
}

watch(() => props.topicId, () => { if (props.topicId) fetchDocuments() }, { immediate: true })
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

defineExpose({ documents })
</script>
