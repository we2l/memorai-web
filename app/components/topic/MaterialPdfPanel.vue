<template>
  <div v-if="hasNotice" class="mt-4 flex flex-col gap-2" data-testid="material-pdf-panel">
      <!-- Partial: the plan read only part of the PDF -->
      <p v-if="partial" class="text-meta text-fg-muted">
        Parcial: {{ reader }} leu {{ doc.processed_pages }} de {{ doc.pages_count }} páginas. <UiLink to="/planos">Desbloquear o resto</UiLink>
      </p>

      <!-- PDF → cards (RF-F5.2), now by the note it opened -->
      <p v-if="doc.auto_cards_status === 'pending' || doc.auto_cards_status === 'generating'" class="flex items-center gap-2 text-meta text-fg" aria-live="polite">
        <UiSpinner size="sm" /> Nota pronta · criando os cards das primeiras partes…
      </p>
      <p v-else-if="doc.auto_cards_status === 'skipped_quota'" class="flex flex-wrap items-center gap-x-2 text-meta text-fg">
        Sem gerações de cards {{ auth.onTrial ? 'no teste' : 'este mês' }}.
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
        <UiButton size="sm" @click="$emit('regenerate')">Gerar de novo</UiButton>
      </div>

      <!-- Material in another language: study the language or only the concepts -->
      <div v-if="doc.language_detected && !languageDismissed" class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-row bg-soft px-3 py-2">
        <p class="min-w-0 flex-1 text-meta text-fg-strong">Este material está em {{ languageName }}. Como você quer estudá-lo?</p>
        <UiButton size="sm" @click="setLanguageMode">Aprender {{ languageName }}</UiButton>
        <UiButton size="sm" variant="ghost" @click="languageDismissed = true">Só os conceitos</UiButton>
      </div>
  </div>
</template>

<script setup lang="ts">
// Notices of the PDF a note came from, under the source line of the material (prd-4c-material-v3: the
// viewer moved to "Ver no PDF"): the partial read, the automatic cards (and their retry), the "other mode"
// regeneration and the language offer. Nothing to say: nothing rendered.
import type { Document } from '~/types'
import { TARGET_LANGUAGES } from '~/utils/learningModes'

const props = defineProps<{ doc: Document; topicId: string; topicLearningMode?: string | null }>()
const emit = defineEmits<{ (e: 'changed'): void; (e: 'regenerate'): void }>()

const { $api } = useNuxtApp()
const { run } = useApiAction()

// The trial reads up to its 100 pages (prd-planos-lancamento RF-F5)
const auth = useAuthStore()
const reader = computed(() => (auth.onTrial ? 'o teste' : auth.user?.plan === 'pro' ? 'a IA' : 'o plano grátis'))
const partial = computed(() => !!props.doc.processed_pages && !!props.doc.pages_count && props.doc.processed_pages < props.doc.pages_count)
const modeChanged = computed(() => !!props.doc.learning_mode_used && !!props.topicLearningMode && props.doc.learning_mode_used !== props.topicLearningMode)
const languageName = computed(() => TARGET_LANGUAGES.find(l => l.value === props.doc.source_language)?.label ?? 'outro idioma')
const languageDismissed = ref(false)

const cardsBusy = computed(() => props.doc.auto_cards_status === 'pending' || props.doc.auto_cards_status === 'generating')
const cardsProblem = computed(() => ['skipped_quota', 'skipped_empty', 'failed'].includes(props.doc.auto_cards_status ?? ''))
const hasNotice = computed(() => partial.value || cardsBusy.value || cardsProblem.value || modeChanged.value || (!!props.doc.language_detected && !languageDismissed.value))

const retrying = ref(false)
async function retryCards() {
  retrying.value = true
  const ok = await run(() => $api(`/documents/${props.doc.id}/generate-cards`, { method: 'POST' }), { error: 'Não foi possível criar os cards agora.' })
  retrying.value = false
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
