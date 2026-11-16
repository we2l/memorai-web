<template>
  <div class="mx-auto flex max-w-reading flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <UiPageHeader title="Montar o caderno pelo edital" :back="{ to: '/cadernos', label: 'Cadernos' }" />

    <!-- 1. Fonte (e 2. lendo) -->
    <UiSection v-if="stage === 'source'" data-testid="edital-source-step">
      <h2 ref="heading" tabindex="-1" class="text-title font-semibold text-fg-strong outline-none">Mande o edital</h2>
      <p class="mt-1 text-body text-fg-muted">Lemos só o conteúdo programático e propomos as matérias e os assuntos. Você confere antes de criar.</p>

      <form class="mt-4 flex flex-col gap-4" @submit.prevent="readEdital()">
        <UiTabs v-model="kind" :tabs="tabs" label="Como mandar o edital">
          <div v-if="kind === 'pdf'" class="flex flex-col gap-3">
            <label
              class="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-tile bg-soft p-5 text-center transition-colors duration-fast hover:bg-hover has-focus-visible:outline-2 has-focus-visible:outline-focus"
              data-testid="edital-file"
            >
              <FileText class="size-6 text-fg-muted" aria-hidden="true" />
              <span class="font-semibold text-fg-strong">{{ file ? file.name : 'Escolher o PDF do edital' }}</span>
              <span class="text-meta text-fg-muted">{{ file ? `${(file.size / MB).toFixed(1)} MB` : 'O edital inteiro serve: achamos o anexo sozinhos.' }}</span>
              <input type="file" accept=".pdf,application/pdf" class="sr-only" @change="onFile">
            </label>
            <p v-if="fileError" class="text-meta text-danger" role="alert">{{ fileError }}</p>

            <UiButton v-if="!showPages" variant="ghost" size="sm" class="self-start" @click="openPages">Dizer as páginas do conteúdo programático</UiButton>
            <fieldset v-else class="min-w-0">
              <legend class="mb-2 text-meta font-semibold text-fg-strong">Páginas do conteúdo programático</legend>
              <div class="grid grid-cols-2 gap-3">
                <UiInput ref="pageFromRef" v-model="pageFrom" type="number" inputmode="numeric" min="1" label="Da página" data-testid="edital-page-from" />
                <UiInput v-model="pageTo" type="number" inputmode="numeric" min="1" label="Até a página" data-testid="edital-page-to" />
              </div>
            </fieldset>
          </div>
          <UiTextarea
            v-else
            v-model="text"
            label="Conteúdo programático"
            :hint="`Cole a parte do edital com as matérias e os assuntos. ${text.length.toLocaleString('pt-BR')} de 60.000 caracteres.`"
            :rows="10"
            maxlength="60000"
            data-testid="edital-text"
          />
        </UiTabs>

        <div v-if="readError" role="alert" class="rounded-tile bg-warning-subtle p-4" data-testid="edital-read-error">
          <p class="text-body text-fg-strong">{{ readError }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton v-if="kind === 'pdf' && !showPages" variant="outline" size="sm" @click="openPages">Dizer as páginas</UiButton>
            <UiButton v-if="kind === 'pdf'" variant="outline" size="sm" @click="kind = 'text'">Colar o texto</UiButton>
          </div>
        </div>

        <p v-if="reading" class="flex items-center gap-2 text-body text-fg-muted" role="status" data-testid="edital-reading">
          <UiSpinner size="sm" />Achando o conteúdo programático e lendo as matérias…
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <UiButton type="submit" variant="primary" :loading="reading" :disabled="!canRead" data-testid="edital-read">Ler o edital</UiButton>
          <span class="text-meta text-fg-muted">Usa 1 leitura de edital do seu plano.</span>
        </div>
      </form>
    </UiSection>

    <!-- Um Diário com mais de um edital -->
    <UiSection v-else-if="stage === 'choose'" data-testid="edital-choose-step">
      <h2 ref="heading" tabindex="-1" class="text-title font-semibold text-fg-strong outline-none">{{ byCargo ? 'Qual é o seu cargo?' : 'Este PDF tem mais de um edital' }}</h2>
      <p class="mt-1 text-body text-fg-muted">{{ byCargo ? 'Cada cargo tem conhecimentos próprios: o caderno sai só com as matérias do seu. Escolher não gastou leitura; ler o cargo usa 1.' : 'Escolha o seu. Esta busca não gastou leitura; ler o escolhido usa 1.' }}</p>
      <UiInput v-if="alternatives.length > 8" v-model="filter" class="mt-4" type="search" :label="byCargo ? 'Buscar o cargo' : 'Buscar o edital'" data-testid="edital-choose-filter" />
      <ul class="mt-4 flex flex-col divide-y divide-hairline">
        <li v-for="alt in shownAlternatives" :key="`${alt.section ?? ''}:${alt.cargo ?? ''}:${alt.label}`">
          <UiListRow
            as="button"
            :title="alt.label"
            :meta="!byCargo && alt.pages ? `Páginas ${alt.pages.from} a ${alt.pages.to}` : undefined"
            :disabled="reading"
            data-testid="edital-alternative"
            @click="chooseAlternative(alt)"
          />
        </li>
      </ul>
      <p v-if="!shownAlternatives.length" class="mt-3 text-body text-fg-muted" role="status">Nenhum {{ byCargo ? 'cargo' : 'edital' }} com esse nome.</p>
      <p v-if="reading" class="mt-3 flex items-center gap-2 text-body text-fg-muted" role="status"><UiSpinner size="sm" />{{ byCargo ? 'Lendo as matérias do cargo escolhido…' : 'Lendo o edital escolhido…' }}</p>
      <p v-if="readError" class="mt-3 text-meta text-danger" role="alert">{{ readError }}</p>
      <UiButton variant="ghost" class="mt-3" @click="restart">Mandar outro edital</UiButton>
    </UiSection>

    <!-- 3. Proposta -->
    <template v-else-if="stage === 'review' && draft && readResult">
      <div>
        <h2 ref="heading" tabindex="-1" class="text-title font-semibold text-fg-strong outline-none">Confira o caderno</h2>
        <p class="mt-1 text-body text-fg-muted">{{ countsText }}. Renomeie, tire ou acrescente o que quiser: nada existe até você criar.</p>
      </div>
      <EditalProposalEditor v-model="draft" :source="readResult.source" :had-date="!!originalProposal?.exam_date" />

      <!-- Last, optional step (prd-cronograma RF-W3): with the hours, the caderno is born with its cronograma -->
      <UiSection data-testid="edital-hours">
        <h3 class="text-title font-semibold text-fg-strong">Quantas horas por dia? <span class="text-body font-normal text-fg-muted">(opcional)</span></h3>
        <p class="mt-1 text-body text-fg-muted">Com as horas, o caderno já nasce com o cronograma: o que estudar em cada dia{{ draft.examDate ? ' até a prova' : '' }}. Dá para pular e montar depois.</p>
        <UiCheckbox v-model="withSchedule" class="mt-3" label="Montar o cronograma junto" data-testid="edital-hours-toggle" />
        <div v-if="withSchedule" class="mt-3 grid gap-3 sm:grid-cols-3">
          <UiSelect v-model="weekdayHours" :options="HOUR_OPTIONS" label="Segunda a sexta" data-testid="edital-hours-weekday" />
          <UiSelect v-model="saturdayHours" :options="HOUR_OPTIONS" label="Sábado" />
          <UiSelect v-model="sundayHours" :options="HOUR_OPTIONS" label="Domingo" />
        </div>
        <p v-if="withSchedule && weightsLine" class="mt-3 text-meta text-fg-muted" data-testid="edital-weights">{{ weightsLine }}</p>
      </UiSection>
      <div v-if="nameTaken" role="alert" class="rounded-tile bg-warning-subtle p-4" data-testid="edital-name-taken">
        <p class="text-body text-fg-strong">Já existe um caderno com esse nome: {{ nameTaken.name }}.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UiButton variant="outline" size="sm" :to="cadernoPath(nameTaken.id)" data-testid="edital-open-existing">Abrir o existente</UiButton>
          <UiButton variant="outline" size="sm" :loading="applying" data-testid="edital-create-anyway" @click="applyProposal(true)">Criar outro mesmo assim</UiButton>
        </div>
      </div>
      <p v-else-if="applyError" class="text-meta text-danger" role="alert">{{ applyError }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <UiButton variant="primary" :loading="applying" :disabled="!canApply" data-testid="edital-apply" @click="applyProposal()">Criar o caderno · {{ countsText }}</UiButton>
        <UiButton variant="ghost" :disabled="applying" @click="restart">Começar de novo</UiButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Edital vira caderno (prd-edital-caderno RF-F1): send the edital (PDF or pasted text, pages if the person knows them),
// the API finds the "conteúdo programático" and the AI proposes matérias and assuntos (useAiJob), the person edits and
// creates the caderno. A Diário with two editais asks which one first, without AI. Errors keep the file and offer
// the next step (pages or paste).
import { FileText } from 'lucide-vue-next'
import type { EditalProposal, EditalReadResult } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'
import { EDITAL_NAME_TAKEN } from '~/composables/useEditalReader'
import type { EditalSource } from '~/composables/useEditalReader'
import { alternativeMatches } from '~/utils/publicEdital'
import { editalCountsLabel, isEditalEdited, toEditalDraft, editalPayload, editalTopicsCount, EDITAL_LIMITS, type EditalDraft } from '~/utils/editalProposal'
import { DEFAULT_HOURS, DEFAULT_SESSION_MINUTES, HOUR_OPTIONS } from '~/utils/studySchedule'

useHead({ title: 'Montar pelo edital · Baigi' })

const MB = 1024 * 1024
const reader = useEditalReader()
const upload = useDocumentUpload()
const toast = useToast()
const { track } = useAnalytics()

type Stage = 'source' | 'choose' | 'review'
const stage = ref<Stage>('source')
const heading = ref<HTMLElement | null>(null)
const kind = ref<'pdf' | 'text'>('pdf')
const tabs = [{ key: 'pdf', label: 'PDF do edital' }, { key: 'text', label: 'Colar o texto' }]

const file = ref<File | null>(null)
const fileError = ref('')
const text = ref('')
const showPages = ref(false)
const pageFrom = ref<string | number>('')
const pageTo = ref<string | number>('')
const pageFromRef = ref<{ focus: () => void } | null>(null)

const reading = ref(false)
const readError = ref('')
const jobId = ref('')
const readResult = ref<EditalReadResult | null>(null)
const alternatives = computed(() => readResult.value?.alternatives ?? [])
const byCargo = computed(() => readResult.value?.choose === 'cargo')
const filter = ref('')
const shownAlternatives = computed(() => alternatives.value.filter(a => alternativeMatches(a.label, filter.value)))
/** The last source sent: a cargo goes back with exactly it (the API maps the cargos of that same text) */
let lastSent: EditalSource | null = null
const originalProposal = ref<EditalProposal | null>(null)
const draft = ref<EditalDraft | null>(null)

const applying = ref(false)
const applyError = ref('')
/** 409 caderno_name_taken: the live caderno with the same name (open it or create another) */
const nameTaken = ref<{ id: string; name: string } | null>(null)

const pages = computed(() => {
  const from = Number(pageFrom.value)
  const to = Number(pageTo.value)
  return showPages.value && from >= 1 && to >= from ? { from, to } : null
})
const canRead = computed(() => !reading.value && (kind.value === 'pdf' ? !!file.value && !fileError.value && (!showPages.value || !!pages.value) : text.value.trim().length >= 200))
const countsText = computed(() => (draft.value ? editalCountsLabel(draft.value.subjects.length, editalTopicsCount(draft.value)) : ''))
const canApply = computed(() => {
  const d = draft.value
  if (!d || applying.value || !d.name.trim() || !d.subjects.some(s => s.name.trim())) return false
  return editalTopicsCount(d) <= EDITAL_LIMITS.topics && d.subjects.every(s => s.name.trim() !== '')
})

// --- The optional hours: PUT /topics/{novo}/schedule after the apply (the API copies the edital's weights) ---
const withSchedule = ref(false)
const weekdayHours = ref(String(DEFAULT_HOURS[1]))
const saturdayHours = ref(String(DEFAULT_HOURS[6]))
const sundayHours = ref(String(DEFAULT_HOURS[0]))
const weightsLine = computed(() => {
  const w = readResult.value?.weights ?? []
  if (!w.length) return ''
  const shown = w.slice(0, 4).map(x => `${x.subject} ${x.points.toLocaleString('pt-BR')}`).join(', ')
  return `Peso do edital: ${shown}${w.length > 4 ? ` e mais ${w.length - 4}` : ''}. Dá para mudar no cronograma.`
})

/** The cronograma of the new caderno; false when it did not go (the caderno exists anyway) */
async function createSchedule(topicId: string): Promise<boolean> {
  const wk = Number(weekdayHours.value)
  try {
    await useScheduleApi().save(topicId, {
      hours_by_weekday: [Number(sundayHours.value), wk, wk, wk, wk, wk, Number(saturdayHours.value)],
      session_minutes: DEFAULT_SESSION_MINUTES,
    })
    return true
  } catch (e) {
    reportApiError(e, { silent: true })
    return false
  }
}

watch(stage, () => { void nextTick(() => heading.value?.focus()) })
// A new name answers the warning about the twin caderno
watch(() => draft.value?.name, () => { nameTaken.value = null })

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  input.value = ''
  if (!picked) return
  file.value = picked
  readError.value = ''
  fileError.value = (await upload.validate(picked)) ?? ''
}

function openPages() {
  showPages.value = true
  kind.value = 'pdf'
  void nextTick(() => pageFromRef.value?.focus())
}

async function readEdital(chosen: Alternative | null = null) {
  if (reading.value) return
  reading.value = true
  readError.value = ''
  let source: EditalSource
  if (chosen?.cargo != null && lastSent) {
    // A cargo: the same request as the list came from, plus the cargo
    source = { ...lastSent, cargo: chosen.cargo }
  } else {
    // A pick from the list goes back as its section (the exact part the API found); old results without it, as pages
    const section = chosen?.section ?? null
    const range = section === null ? (chosen?.pages ?? pages.value) : null
    source = kind.value === 'pdf' ? { file: file.value, pageFrom: range?.from, pageTo: range?.to, section } : { text: text.value }
  }
  track('edital_started', { source: kind.value, manual_pages: !chosen && !!(source.pageFrom && source.pageTo) })
  try {
    const { jobId: id, result } = await reader.read(source)
    lastSent = { ...source, cargo: null }
    jobId.value = id
    readResult.value = result
    if (result.status === 'choose') {
      filter.value = ''
      track('edital_choose', { editais: result.alternatives?.length ?? 0, kind: result.choose ?? 'edital' })
      stage.value = 'choose'
      return
    }
    originalProposal.value = result.proposal
    draft.value = toEditalDraft(result.proposal!)
    track('edital_read', { subjects: result.counts.subjects, topics: result.counts.topics, found: result.source.found })
    stage.value = 'review'
  } catch (e) {
    track('edital_failed', { stage: 'read' })
    // 402 opens the UpgradeModal (plugins/api.ts); the rest says the next step
    const message = (e as { data?: { message?: string } }).data?.message
    readError.value = message || 'Não foi possível ler o edital agora. Tente de novo.'
    reportApiError(e, { silent: true })
  } finally {
    reading.value = false
  }
}

type Alternative = NonNullable<EditalReadResult['alternatives']>[number]

function chooseAlternative(alt: Alternative) {
  if (alt.section == null && alt.cargo == null && !alt.pages) return
  void readEdital(alt)
}

function restart() {
  stage.value = 'source'
  readResult.value = null
  draft.value = null
  readError.value = ''
  applyError.value = ''
  nameTaken.value = null
}

async function applyProposal(allowDuplicate = false) {
  if (!draft.value || !canApply.value) return
  applying.value = true
  applyError.value = ''
  nameTaken.value = null
  const body = { ...editalPayload(draft.value), ...(allowDuplicate ? { allow_duplicate: true } : {}) }
  try {
    const res = await reader.apply(jobId.value, body)
    track('edital_applied', {
      subjects: res.counts.subjects,
      topics: res.counts.topics,
      edited: originalProposal.value ? isEditalEdited(draft.value, originalProposal.value) : false,
      exam: !!res.exam,
    })
    void useTopicStore().fetchTree()
    const scheduled = withSchedule.value ? await createSchedule(res.topic.id) : false
    const counts = editalCountsLabel(res.counts.subjects, res.counts.topics)
    if (scheduled) toast.show(`Caderno criado com ${counts}, e o cronograma está pronto.`, 'success')
    else toast.show(`Caderno criado com ${counts}. Envie o material da primeira.`, 'success')
    if (withSchedule.value && !scheduled) toast.show('O cronograma não foi criado. Monte pelo caderno.', 'info')
    if (res.exam_skipped === 'exam_limit_reached') toast.show('A prova não entrou: o Grátis tem até 2 provas ativas.', 'info')
    await navigateTo(cadernoPath(res.topic.id, scheduled ? { view: 'cronograma' } : {}))
  } catch (e) {
    const data = (e as { data?: { code?: string; topic?: { id: string; name: string } } }).data
    if (getErrorStatus(e) === 409 && data?.code === EDITAL_NAME_TAKEN && data.topic) {
      nameTaken.value = data.topic
      return
    }
    track('edital_failed', { stage: 'apply' })
    applyError.value = (e as { data?: { message?: string } }).data?.message || 'Não foi possível criar o caderno. Tente de novo.'
    reportApiError(e, { silent: true })
  } finally {
    applying.value = false
  }
}
</script>
