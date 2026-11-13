<template>
  <div class="edital-print flex flex-col gap-6">
    <header class="flex flex-col gap-3">
      <p class="text-label font-semibold text-fg-muted">Edital verticalizado</p>
      <h1 ref="heading" tabindex="-1" class="break-words text-page-title text-fg-strong outline-none" data-testid="edital-result-title">{{ proposal.name }}</h1>
      <p v-if="exam" class="text-body text-fg" data-testid="edital-result-exam">{{ exam }}</p>
      <p class="text-body text-fg-muted" data-testid="edital-result-counts">{{ countsLine(proposal.subjects.length, total) }}</p>
      <UiProgressBar class="edital-noprint" :value="studied" :max="Math.max(total, 1)" label="Assuntos estudados" :value-text="`${studied} de ${total} estudados`" show-value size="md" data-testid="edital-result-progress" />
    </header>

    <div class="edital-noprint flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UiButton variant="primary" :loading="applying" data-testid="edital-apply" @click="apply()">Estudar isso no Baigi</UiButton>
        <UiButton variant="outline" :icon-left="Download" data-testid="edital-csv" @click="exportCsv">Baixar planilha</UiButton>
        <UiButton variant="outline" :icon-left="Printer" data-testid="edital-pdf" @click="exportPdf">Baixar PDF</UiButton>
        <UiButton variant="outline" :icon-left="Link2" data-testid="edital-share" @click="share">Copiar link para a turma</UiButton>
      </div>
      <p class="text-meta text-fg-muted">
        <template v-if="auth.user">O Baigi cria o caderno com as matérias e os assuntos, e marca a prova se o edital trouxer a data.</template>
        <template v-else>
          Cria uma conta grátis e já abre o caderno com as matérias e os assuntos.
          <button type="button" class="inline-block py-1 font-medium text-action-fg underline" data-testid="edital-login" @click="goLogin">Já tenho conta</button>
        </template>
      </p>
      <div v-if="nameTaken" role="alert" class="rounded-tile bg-warning-subtle p-4" data-testid="edital-name-taken">
        <p class="text-body text-fg-strong">Já existe um caderno com esse nome: {{ nameTaken.name }}.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UiButton variant="outline" size="sm" :to="cadernoPath(nameTaken.id)" data-testid="edital-open-existing">Abrir o existente</UiButton>
          <UiButton variant="outline" size="sm" :loading="applying" data-testid="edital-create-anyway" @click="apply(true)">Criar outro mesmo assim</UiButton>
        </div>
      </div>
      <p v-else-if="applyError" role="alert" class="text-meta text-danger" data-testid="edital-apply-error">{{ applyError }}</p>
    </div>

    <section aria-label="Matérias e assuntos">
      <div class="edital-noprint mb-1 flex justify-end">
        <UiButton variant="ghost" size="sm" data-testid="edital-toggle-all" @click="toggleAll">{{ allOpen ? 'Recolher todas' : 'Abrir todas' }}</UiButton>
      </div>
      <ol class="edital-list rounded-card bg-raised px-4 shadow-1">
        <EditalPublicSubject
          v-for="(subject, si) in proposal.subjects"
          :key="si"
          :subject="subject"
          :index="si"
          :open="opened.has(si)"
          :checked="checked"
          @toggle="toggle(si)"
          @check="setChecked"
        />
      </ol>
    </section>

    <footer class="flex flex-col gap-2 border-t border-hairline pt-4 text-meta text-fg-muted">
      <p v-if="curatedLine" data-testid="edital-curated">{{ curatedLine.before }}<a v-if="curatedLine.url" :href="curatedLine.url" rel="noopener noreferrer nofollow" target="_blank" class="text-action-fg underline">edital oficial</a><template v-else>edital oficial</template>{{ curatedLine.after }}</p>
      <p v-else data-testid="edital-notice">Gerado automaticamente a partir de um edital enviado por um visitante. Confira no edital oficial.</p>
      <p class="edital-noprint">
        <button type="button" class="inline-flex min-h-touch items-center underline" data-testid="edital-report-open" @click="reporting = true">Denunciar</button>
      </p>
    </footer>

    <LazyEditalPublicReportDialog v-if="reporting" v-model="reporting" :reading-id="reading.id" />
  </div>
</template>

<script setup lang="ts">
// Result of a public reading (prd-edital-verticalizado-publico RF-F3, RF-F4, RF-F5, RF-F6): the header with the exam
// countdown and the "X de M estudados" bar, the list to mark (state on this device), the exports, the link for the
// class and "Estudar isso no Baigi". Text from the API is always interpolated, never v-html.
import { Download, Link2, Printer } from 'lucide-vue-next'
import type { EditalApplied } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'
import { EDITAL_NAME_TAKEN } from '~/composables/useEditalReader'
import { downloadEditalCsv } from '~/utils/editalCsv'
import { pendingEditalIntent, publicEditalResultPath } from '~/utils/editalIntent'
import { editalCountsLabel } from '~/utils/editalProposal'
import { claimCheckEvent, clearEditalIntent, countsLine, examLine, loadChecked, pctBucket, saveChecked, saveEditalIntent, studiedCount, topicsTotal, type PublicEditalReading } from '~/utils/publicEdital'
import { cadernoPath } from '~/utils/scope'

const props = defineProps<{ reading: PublicEditalReading & { proposal: NonNullable<PublicEditalReading['proposal']> } }>()

const { $api } = useNuxtApp()
const auth = useAuthStore()
const route = useRoute()
const toast = useToast()
const { track } = useAnalytics()

const proposal = computed(() => props.reading.proposal)
const total = computed(() => topicsTotal(proposal.value))
const checked = ref<Set<string>>(new Set())
const studied = computed(() => studiedCount(proposal.value, checked.value))
const exam = computed(() => examLine(proposal.value.exam_date))
const heading = ref<HTMLElement | null>(null)

// Few matérias open at once; many start closed (the 12 of a big edital would be a wall)
const opened = ref<Set<number>>(new Set())
const allOpen = computed(() => opened.value.size === proposal.value.subjects.length)

const curatedLine = computed(() => {
  const c = props.reading.curated
  if (!c) return null
  const [y, m, d] = (c.checked_at || '').slice(0, 10).split('-')
  const url = /^https?:\/\//i.test(c.source_url) ? c.source_url : ''
  return { before: 'Conferido pelo Baigi com o ', url, after: y && m && d ? `, em ${d}/${m}.` : '.' }
})

const reporting = ref(false)
const applying = ref(false)
const applyError = ref('')
const nameTaken = ref<{ id: string, name: string } | null>(null)

function toggle(i: number) {
  const next = new Set(opened.value)
  if (!next.delete(i)) next.add(i)
  opened.value = next
}

function toggleAll() {
  opened.value = allOpen.value ? new Set() : new Set(proposal.value.subjects.map((_, i) => i))
}

function setChecked(key: string, value: boolean) {
  const next = new Set(checked.value)
  if (value) next.add(key)
  else next.delete(key)
  checked.value = next
  saveChecked(props.reading.id, next)
  if (value && claimCheckEvent()) track('edital_public_check', { pct_bucket: pctBucket(studiedCount(proposal.value, next), total.value) })
}

function exportCsv() {
  downloadEditalCsv(proposal.value, checked.value)
  track('edital_public_export', { format: 'csv' })
}

function exportPdf() {
  track('edital_public_export', { format: 'pdf' })
  window.print()
}

async function share() {
  const link = `${window.location.origin}${publicEditalResultPath(props.reading.id)}?utm_source=edital&utm_medium=share`
  track('edital_public_share', {})
  try {
    await navigator.clipboard.writeText(link)
    toast.show('Link copiado', 'success')
  } catch {
    toast.show('Não foi possível copiar. Copie o endereço da barra do navegador.', 'error')
  }
}

function goLogin() {
  saveEditalIntent(props.reading.id)
  void navigateTo('/entrar')
}

async function apply(allowDuplicate = false, auto = false) {
  if (applying.value) return
  if (!allowDuplicate && !auto) track('edital_public_apply_clicked', { logged_in: !!auth.user })
  // No account yet: the intent waits on the device and the sign-up brings the person back here (postAuthRedirect)
  if (!auth.user) {
    saveEditalIntent(props.reading.id)
    await navigateTo('/criar-conta')
    return
  }
  applying.value = true
  applyError.value = ''
  nameTaken.value = null
  try {
    const res = (await $api<{ data: EditalApplied }>(`/editais/publicos/${encodeURIComponent(props.reading.id)}/apply`, {
      method: 'POST',
      body: allowDuplicate ? { allow_duplicate: true } : {},
    })).data
    clearEditalIntent()
    track('edital_public_applied', {})
    void useTopicStore().fetchTree()
    toast.show(`Caderno pronto: ${editalCountsLabel(res.counts.subjects, res.counts.topics)}.`, 'success')
    if (res.exam_skipped === 'exam_limit_reached') toast.show('A prova não entrou: o Grátis tem até 2 provas ativas.', 'info')
    else if ((res.exam_skipped as string | null) === 'exam_date_past') toast.show('A data da prova já passou, então ela não entrou.', 'info')
    await navigateTo(cadernoPath(res.topic.id))
  } catch (e) {
    const data = (e as { data?: { code?: string, message?: string, topic?: { id: string, name: string } } }).data
    const status = getErrorStatus(e)
    if (status === 409 && data?.code === EDITAL_NAME_TAKEN && data.topic) {
      nameTaken.value = data.topic
      return
    }
    applyError.value = status === 404
      ? 'Este resultado não está mais disponível. Envie o edital de novo.'
      : data?.message || 'Não foi possível criar o caderno. Tente de novo.'
    reportApiError(e, { silent: true })
  } finally {
    applying.value = false
  }
}

onMounted(() => {
  checked.value = loadChecked(props.reading.id)
  if (proposal.value.subjects.length <= 3) opened.value = new Set(proposal.value.subjects.map((_, i) => i))
  // "Estudar isso" before sign-up: the redirect lands here with ?aplicar=1 and the intent of this very reading
  if (route.query.aplicar === '1' && auth.user && pendingEditalIntent() === props.reading.id) void apply(false, true)
  void nextTick(() => heading.value?.focus())
  // Print: the rules in the style block below only act while this page is open
  document.documentElement.classList.add('print-edital')
})
onBeforeUnmount(() => document.documentElement.classList.remove('print-edital'))
</script>

<style>
/* The list on the screen: a hairline between matérias, the item of the edital under its checkbox, matérias that
   skip the paint while they are off screen (400 assuntos). Kept here, not in utilities, to stay out of entry.css */
.edital-subject {
  border-bottom: 1px solid var(--hairline);
  content-visibility: auto;
  contain-intrinsic-size: auto 320px;
}
.edital-subject:last-child { border-bottom: 0; }
.edital-item { padding-left: 2rem; }
.edital-closed { display: none; }

/* "Baixar PDF" = the browser's print: only the header and the list, boxes empty to tick by hand */
@media print {
  .edital-noprint { display: none; }
  .edital-closed { display: block; }
  html.print-edital header:not(.edital-print header),
  html.print-edital footer:not(.edital-print footer),
  html.print-edital [role="dialog"][aria-labelledby="consent-title"] {
    display: none;
  }
  html.print-edital .edital-list { padding-inline: 0; box-shadow: none; }
  html.print-edital .edital-list input[type="checkbox"] {
    background: Canvas;
    border-color: CanvasText;
    transition: none;
  }
  html.print-edital .edital-list input[type="checkbox"] + svg { display: none; }
  html.print-edital .edital-subject {
    break-inside: avoid;
    content-visibility: visible;
  }
}
</style>
