<template>
  <div class="border-b border-line bg-subtle px-4 py-3 sm:px-6" data-testid="material-pdf-panel">
    <div class="mx-auto flex max-w-prose flex-col gap-2">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FileText class="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <p class="min-w-0 flex-1 text-meta text-fg">
          <span class="font-medium text-fg-strong">{{ doc.original_name }}</span>
          <template v-if="doc.pages_count"> · {{ doc.pages_count }} páginas</template>
          <template v-if="partial"> · lidas {{ doc.processed_pages }} de {{ doc.pages_count }}</template>
        </p>
        <UiButton size="sm" variant="ghost" :loading="opening" @click="openViewer">Ver o PDF</UiButton>
      </div>

      <!-- Partial: the plan read only part of the PDF -->
      <p v-if="partial" class="text-meta text-fg-muted">
        Parcial: o plano grátis lê parte do PDF. <UiLink to="/planos">Desbloquear o resto</UiLink>
      </p>

      <!-- PDF → cards (RF-F5.2), now by the note it opened -->
      <p v-if="doc.auto_cards_status === 'pending' || doc.auto_cards_status === 'generating'" class="flex items-center gap-2 text-meta text-fg" aria-live="polite">
        <UiSpinner size="sm" /> Resumo pronto · criando os cards…
      </p>
      <p v-else-if="doc.auto_cards_status === 'skipped_quota'" class="flex flex-wrap items-center gap-x-2 text-meta text-fg">
        Sem gerações de cards este mês.
        <UiButton size="sm" variant="ghost" :loading="retrying" @click="retryCards">Gerar cards</UiButton>
      </p>
      <p v-else-if="doc.auto_cards_status === 'skipped_empty'" class="text-meta text-fg-muted">Resumo curto demais para gerar cards.</p>
      <p v-else-if="doc.auto_cards_status === 'failed'" class="flex flex-wrap items-center gap-x-2 text-meta text-danger">
        Não conseguimos criar os cards.
        <UiButton size="sm" variant="ghost" :loading="retrying" @click="retryCards">Tentar de novo</UiButton>
      </p>

      <!-- The caderno changed its mode after the note was made -->
      <div v-if="modeChanged" class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-row bg-warning-subtle px-3 py-2">
        <p class="min-w-0 flex-1 text-meta text-fg-strong">Esta nota foi criada com outro modo de estudo.</p>
        <UiButton size="sm" :loading="regenerating" @click="regenerate">Gerar de novo</UiButton>
      </div>

      <!-- Material in another language: study the language or only the concepts -->
      <div v-if="doc.language_detected && !languageDismissed" class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-row bg-raised px-3 py-2">
        <p class="min-w-0 flex-1 text-meta text-fg-strong">Este material está em {{ languageName }}. Como você quer estudá-lo?</p>
        <UiButton size="sm" @click="setLanguageMode">Aprender {{ languageName }}</UiButton>
        <UiButton size="sm" variant="ghost" @click="languageDismissed = true">Só os conceitos</UiButton>
      </div>
    </div>

    <LazyTopicPdfViewer v-if="viewerLoaded" v-model="viewerOpen" :url="viewerUrl" :filename="doc.original_name" :topic-id="topicId" />
  </div>
</template>

<script setup lang="ts">
// The PDF a note came from, on the material route (prd-4b-caderno-v3 §3.3: what DocumentsInline did for one
// document, moved): the viewer, the partial read, the automatic cards (and their retry), the "other mode"
// regeneration and the language offer. Generating, failed and blocked live on the material line of the hub.
import { FileText } from 'lucide-vue-next'
import type { Document } from '~/types'
import { TARGET_LANGUAGES } from '~/utils/learningModes'

const props = defineProps<{ doc: Document; topicId: string; topicLearningMode?: string | null }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { $api } = useNuxtApp()
const toast = useToast()
const { run } = useApiAction()

const partial = computed(() => !!props.doc.processed_pages && !!props.doc.pages_count && props.doc.processed_pages < props.doc.pages_count)
const modeChanged = computed(() => !!props.doc.learning_mode_used && !!props.topicLearningMode && props.doc.learning_mode_used !== props.topicLearningMode)
const languageName = computed(() => TARGET_LANGUAGES.find(l => l.value === props.doc.source_language)?.label ?? 'outro idioma')
const languageDismissed = ref(false)

const viewerOpen = ref(false)
const viewerLoaded = useLoadedOnce(() => viewerOpen.value)
const viewerUrl = ref('')
const opening = ref(false)

async function openViewer() {
  opening.value = true
  try {
    // Short-lived signed URL (15 min, RN-05): asked on every open
    const res = await $api<{ data: { url: string } }>(`/documents/${props.doc.id}/file-url`)
    viewerUrl.value = res.data.url
    viewerOpen.value = true
  } catch {
    toast.show('Não foi possível abrir o PDF.', 'error')
  } finally {
    opening.value = false
  }
}

const retrying = ref(false)
async function retryCards() {
  retrying.value = true
  const ok = await run(() => $api(`/documents/${props.doc.id}/generate-cards`, { method: 'POST' }), { error: 'Não foi possível criar os cards agora.' })
  retrying.value = false
  if (ok !== undefined) emit('changed')
}

const regenerating = ref(false)
async function regenerate() {
  regenerating.value = true
  const ok = await run(() => $api(`/documents/${props.doc.id}/regenerate-note`, { method: 'POST' }), { success: 'A nota está sendo gerada de novo com o modo atual.', error: 'Não foi possível gerar de novo.' })
  regenerating.value = false
  if (ok !== undefined) emit('changed')
}

async function setLanguageMode() {
  languageDismissed.value = true
  await run(() => $api(`/topics/${props.topicId}`, { method: 'PUT', body: { learning_mode: 'language', target_language: props.doc.source_language || 'en' } }), {
    success: 'Modo idioma ligado: a próxima geração usa o formato bilíngue.',
    error: 'Não foi possível mudar o modo.',
  })
}
</script>
