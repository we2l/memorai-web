<template>
  <div class="mx-auto max-w-article-wide px-gutter pt-8 pb-6 lg:pt-12">
    <!-- Loading the first answer -->
    <div v-if="stage === 'loading'" class="mx-auto flex max-w-article flex-col gap-4" aria-busy="true">
      <UiSkeleton variant="block" size="lg" />
    </div>

    <!-- Reading: pending | processing -->
    <section v-else-if="stage === 'reading'" class="mx-auto flex max-w-article flex-col gap-4" data-testid="edital-reading">
      <h1 ref="heading" tabindex="-1" class="text-page-title text-fg-strong outline-none">Lendo o seu edital</h1>
      <p role="status" class="flex items-center gap-2 text-body text-fg-muted" data-testid="edital-reading-status"><UiSpinner size="sm" />{{ readingText }}</p>
      <p class="text-meta text-fg-muted">Leva até 1 minuto. Pode deixar esta página aberta: o endereço já é o link do resultado.</p>
      <UiSkeleton v-for="i in 3" :key="i" variant="block" />
    </section>

    <!-- A Diário with more than one edital -->
    <UiSection v-else-if="stage === 'choose'" class="mx-auto max-w-article" data-testid="edital-choose-step">
      <h1 ref="heading" tabindex="-1" class="text-title font-semibold text-fg-strong outline-none">Este PDF tem mais de um edital</h1>
      <p class="mt-1 text-body text-fg-muted">Escolha o seu. Esta busca não conta como leitura; ler o escolhido, sim.</p>
      <p v-if="!canChoose" class="mt-3 text-body text-fg" role="status">O arquivo não está mais nesta página. Envie o PDF de novo para escolher.</p>
      <ul v-else class="mt-4 flex flex-col divide-y divide-hairline">
        <li v-for="alt in reading?.alternatives ?? []" :key="alt.section">
          <UiListRow as="button" :title="alt.label" :meta="alternativePages(alt.pages) ?? undefined" :disabled="choosing" data-testid="edital-alternative" @click="pick(alt.section)" />
        </li>
      </ul>
      <p v-if="choosing" class="mt-3 flex items-center gap-2 text-body text-fg-muted" role="status"><UiSpinner size="sm" />Lendo o edital escolhido…</p>
      <div v-if="problem" role="alert" class="mt-3 rounded-tile bg-warning-subtle p-4" data-testid="edital-choose-error">
        <p class="text-body text-fg-strong">{{ problem.message }}</p>
      </div>
      <!-- Turnstile for the second POST -->
      <div ref="captchaHost" class="contents" data-testid="edital-captcha" />
      <UiButton variant="outline" class="mt-3" to="/ferramentas/edital-verticalizado">Enviar outro edital</UiButton>
    </UiSection>

    <!-- The reading failed: the message, the way on, the input kept -->
    <UiSection v-else-if="stage === 'failed'" class="mx-auto max-w-article" data-testid="edital-failed-step">
      <h1 ref="heading" tabindex="-1" class="text-title font-semibold text-fg-strong outline-none">Não deu para ler o edital</h1>
      <p role="alert" class="mt-2 text-body text-fg" data-testid="edital-failed-message">{{ failure?.message }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UiButton v-if="failure?.next === 'pages'" variant="primary" data-testid="edital-fix-pages" @click="fix('pages')">Dizer as páginas</UiButton>
        <UiButton v-if="failure?.next === 'text' || failure?.next === 'pages'" :variant="failure?.next === 'text' ? 'primary' : 'outline'" data-testid="edital-fix-text" @click="fix('text')">Colar o texto</UiButton>
        <UiButton :variant="failure?.next ? 'outline' : 'primary'" to="/ferramentas/edital-verticalizado" data-testid="edital-fix-again">Enviar outro edital</UiButton>
      </div>
    </UiSection>

    <!-- Gone, expired, unknown or slow -->
    <UiSection v-else-if="stage === 'gone' || stage === 'slow' || stage === 'error'" class="mx-auto max-w-article" data-testid="edital-gone-step">
      <h1 ref="heading" tabindex="-1" class="text-title font-semibold text-fg-strong outline-none">{{ goneTitle }}</h1>
      <p role="status" class="mt-2 text-body text-fg">{{ goneText }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UiButton v-if="stage !== 'gone'" variant="outline" data-testid="edital-retry" @click="begin">Tentar de novo</UiButton>
        <UiButton :variant="stage === 'gone' ? 'primary' : 'outline'" to="/ferramentas/edital-verticalizado">Verticalizar um edital</UiButton>
      </div>
    </UiSection>

    <EditalPublicResult v-else-if="stage === 'ready' && ready" :reading="ready" />
  </div>
</template>

<script setup lang="ts">
// /ferramentas/edital-verticalizado/r/{id} (prd-edital-verticalizado-publico RF-F2, RF-F3): client only (ssr false and
// no prerender in routeRules), never indexed (RF-F6, R5.6). Polls GET /public/editais/{id} every 2 s for up to 3 min:
// reading → choose | failed | ready. The id is the link to send to the class.
import { alternativePages, failedReading, submitFailure, topicsTotal, type PublicEditalMessage, type PublicEditalReading } from '~/utils/publicEdital'
import { PUBLIC_EDITAL_PATH, publicEditalResultPath } from '~/utils/editalIntent'
import { setRetryHint, takeLastSource } from '~/composables/usePublicEdital'
import { getErrorStatus } from '~/utils/apiErrors'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'

definePageMeta({ layout: 'public', quietHeaderCta: true })
// A visitor's page never goes to the index (the default head already says noindex; explicit here on purpose)
useHead({
  title: 'Edital verticalizado · Baigi',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const route = useRoute()
const edital = usePublicEdital()
const captchaHost = edital.captchaEl
const { track } = useAnalytics()

type Stage = 'loading' | 'reading' | 'choose' | 'failed' | 'ready' | 'gone' | 'slow' | 'error'
const stage = ref<Stage>('loading')
const reading = ref<PublicEditalReading | null>(null)
const heading = ref<HTMLElement | null>(null)
const choosing = ref(false)
const problem = ref<PublicEditalMessage | null>(null)
const slowStep = ref(false)

const id = computed(() => String(route.params.id ?? ''))
const ready = computed(() => (reading.value?.proposal ? reading.value as PublicEditalReading & { proposal: NonNullable<PublicEditalReading['proposal']> } : null))
const canChoose = computed(() => !!takeLastSource()?.file)
const failure = computed(() => (reading.value?.status === 'failed' ? failedReading(reading.value.error, takeLastSource()?.file ? 'pdf' : takeLastSource()?.text ? 'text' : 'pdf') : null))
const readingText = computed(() => (slowStep.value ? 'Lendo as matérias e os assuntos…' : 'Achando o conteúdo programático…'))
const goneTitle = computed(() => (stage.value === 'gone' ? 'Este resultado não está mais aqui' : stage.value === 'slow' ? 'Está demorando mais que o normal' : 'Não conseguimos abrir o resultado'))
const goneText = computed(() => {
  if (stage.value === 'gone') return 'O link venceu ou foi removido. Envie o edital de novo para gerar outro.'
  if (stage.value === 'slow') return 'A leitura ainda não terminou. Tente de novo em instantes; se não resolver, envie o edital outra vez.'
  return 'Não conseguimos falar com o servidor. Confira a conexão e tente de novo.'
})

interface Gone { gone: true, status: 404 | 410 }
type Answer = PublicEditalReading | Gone

let handled = ''

function handle(r: Answer) {
  if ('gone' in r) {
    stage.value = 'gone'
    return
  }
  reading.value = r
  if (r.status === 'pending' || r.status === 'processing') {
    stage.value = 'reading'
    return
  }
  if (r.status === 'expired') stage.value = 'gone'
  else if (r.status === 'choose') stage.value = 'choose'
  else if (r.status === 'failed') stage.value = 'failed'
  else stage.value = r.proposal ? 'ready' : 'error'
  // One event per reading and outcome, however many times the page asks
  const key = `${r.id}:${r.status}`
  if (handled === key) return
  handled = key
  if (r.status === 'choose') track('edital_public_choose', {})
  else if (r.status === 'failed') track('edital_public_failed', { code: r.error?.code ?? 'unknown' })
  else if (r.status === 'ready' && r.proposal) {
    track('edital_public_ready', { subjects: r.counts?.subjects ?? r.proposal.subjects.length, topics: r.counts?.topics ?? topicsTotal(r.proposal), cached: !!r.cached })
  }
}

const poll = usePoll<Answer>(async (signal) => {
  let answer: Answer
  try {
    answer = await edital.fetchReading(id.value, signal)
  } catch (e) {
    const status = getErrorStatus(e)
    if (status !== 404 && status !== 410) throw e
    answer = { gone: true, status }
  }
  handle(answer)
  return answer
}, {
  interval: 2000,
  timeout: 180_000,
  until: a => 'gone' in a || !['pending', 'processing'].includes(a.status),
  onTimeout: () => { stage.value = 'slow' },
  // The poll retries with backoff; with nothing on screen yet the person sees why
  onError: () => { if (stage.value === 'loading') stage.value = 'error' },
})

let slowTimer: ReturnType<typeof setTimeout> | null = null

function begin() {
  poll.stop()
  if (slowTimer) clearTimeout(slowTimer)
  if (!reading.value || reading.value.id !== id.value) stage.value = 'loading'
  slowStep.value = false
  problem.value = null
  slowTimer = setTimeout(() => { slowStep.value = true }, 8000)
  poll.start()
}

async function pick(section: number) {
  if (choosing.value) return
  choosing.value = true
  problem.value = null
  try {
    const res = await edital.choose(section)
    await navigateTo(publicEditalResultPath(res.id), { replace: true })
  } catch (e) {
    const captchaMessage = (e as { captchaMessage?: string }).captchaMessage
    problem.value = captchaMessage ? { code: 'captcha', next: null, message: captchaMessage || CAPTCHA_MESSAGES.load } : submitFailure(e)
    if (!captchaMessage) reportApiError(e, { silent: true })
  } finally {
    choosing.value = false
  }
}

function fix(hint: 'text' | 'pages') {
  setRetryHint(hint)
  void navigateTo(PUBLIC_EDITAL_PATH)
}

watch(id, () => { reading.value = null; handled = ''; begin() })
watch(stage, (s) => {
  if (s === 'reading' || s === 'loading') return
  void nextTick(() => heading.value?.focus())
})
onMounted(begin)
onBeforeUnmount(() => {
  poll.stop()
  if (slowTimer) clearTimeout(slowTimer)
})
</script>
