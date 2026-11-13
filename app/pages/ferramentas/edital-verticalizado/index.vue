<template>
  <div class="mx-auto max-w-article-wide px-gutter pt-8 lg:pt-12">
    <nav aria-label="Caminho" class="mx-auto mb-4 max-w-article text-meta text-fg-muted">
      <UiLink to="/ferramentas" variant="muted">Ferramentas</UiLink>
    </nav>
    <h1 class="mx-auto mb-3 max-w-article text-page-title text-fg-strong">Edital verticalizado grátis</h1>
    <p class="blog-lead mx-auto mb-8 max-w-article text-fg">
      Envie o edital. Em menos de um minuto, você tem as matérias e os assuntos para marcar o que já estudou. Sem cadastro.
    </p>

    <UiSection class="mx-auto max-w-article" aria-label="Enviar o edital">
      <form class="flex flex-col gap-4" novalidate data-testid="edital-form" @focusin.once="edital.captcha.render(captchaHost)" @submit.prevent="send">
        <UiTabs v-model="kind" :tabs="tabs" label="Como enviar o edital">
          <div v-if="kind === 'pdf'" class="flex flex-col gap-3">
            <label
              class="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-tile bg-soft p-5 text-center transition-colors duration-fast hover:bg-hover has-focus-visible:outline-2 has-focus-visible:outline-focus"
             
              :class="dragging && 'shadow-2'"
              data-testid="edital-file"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="onDrop"
            >
              <FileText class="size-6 text-fg-muted" aria-hidden="true" />
              <span class="font-semibold text-fg-strong">{{ file ? file.name : 'Arraste o PDF ou escolha o arquivo' }}</span>
              <span class="text-meta text-fg-muted">{{ file ? `${(file.size / MB).toFixed(1)} MB` : `Até ${edital.limits.fileMb} MB. O edital inteiro serve: achamos o conteúdo programático.` }}</span>
              <input type="file" accept=".pdf,application/pdf" class="sr-only" @change="onFile">
            </label>
            <p v-if="fileError" class="text-meta text-danger" role="alert">{{ fileError }}</p>

            <template v-if="!showPages">
              <p class="text-meta text-fg-muted">
                O PDF tem vários editais?
                <button type="button" class="font-medium text-action-fg underline" data-testid="edital-pages-open" @click="openPages">Dizer as páginas</button>
              </p>
            </template>
            <fieldset v-else class="min-w-0">
              <legend class="mb-2 text-meta font-semibold text-fg-strong">Páginas do conteúdo programático</legend>
              <div class="grid grid-cols-2 gap-3">
                <UiInput ref="pageFromRef" v-model="pageFrom" type="number" inputmode="numeric" min="1" max="2000" label="Da página" data-testid="edital-page-from" />
                <UiInput v-model="pageTo" type="number" inputmode="numeric" min="1" max="2000" label="Até a página" :error="pagesError" data-testid="edital-page-to" />
              </div>
            </fieldset>
          </div>
          <UiTextarea
            v-else
            v-model="text"
            label="Conteúdo programático"
            :hint="`Cole a parte do edital com as matérias e os assuntos. ${text.length.toLocaleString('pt-BR')} de ${edital.limits.textMax.toLocaleString('pt-BR')} caracteres.`"
            :rows="10"
            :maxlength="edital.limits.textMax"
            data-testid="edital-text"
          />
        </UiTabs>

        <!-- Turnstile: invisible unless Cloudflare asks for a click -->
        <div ref="captchaHost" class="contents" data-testid="edital-captcha" />

        <div v-if="problem" role="alert" class="rounded-tile bg-warning-subtle p-4" data-testid="edital-send-error">
          <p class="text-body text-fg-strong">{{ problem.message }}</p>
          <div v-if="problem.next === 'account'" class="mt-3">
            <UiButton variant="outline" size="sm" to="/criar-conta">Criar conta grátis</UiButton>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UiButton type="submit" variant="primary" :loading="sending" :disabled="!canSend" data-testid="edital-send">Verticalizar edital</UiButton>
          <span class="text-meta text-fg-muted">Sem cadastro. O arquivo é apagado depois da leitura.</span>
        </div>
      </form>
    </UiSection>

    <section class="blog-prose mx-auto mt-10 max-w-article" aria-labelledby="h-como">
      <h2 id="h-como">Como usar</h2>
      <ol>
        <li><strong>Verticalize.</strong> Mandamos o conteúdo programático do edital para a leitura e devolvemos cada matéria com os assuntos, um por linha.</li>
        <li><strong>Marque.</strong> Passe o que já estudou. O progresso fica neste aparelho, e cada pessoa da turma marca o seu.</li>
        <li><strong>Revise.</strong> Para guardar o que estudou, crie o caderno no Baigi: a lista vira matérias e assuntos prontos, com a data da prova.</li>
      </ol>
      <p>Quer fazer à mão, em planilha? Veja <NuxtLink to="/blog/o-que-e-edital-verticalizado">o que é edital verticalizado e como montar o seu</NuxtLink>.</p>
    </section>

    <UiSection title="Perguntas rápidas" flush class="mx-auto mt-8 mb-4 max-w-article px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
      <div class="divide-y divide-hairline">
        <details v-for="faq in FAQS" :key="faq.q" class="group">
          <summary class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 py-2 text-body font-semibold text-fg-strong">
            {{ faq.q }}
            <ChevronDown class="size-4 shrink-0 text-fg-muted transition-transform duration-fast group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p class="pb-4 text-body text-fg">{{ faq.a }}</p>
        </details>
      </div>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// /ferramentas/edital-verticalizado (prd-edital-verticalizado-publico RF-F1): prerendered, no account. The PDF or the
// pasted text goes to POST /public/editais with the Turnstile token; the reading itself happens on /r/{id}.
import { ChevronDown, FileText } from 'lucide-vue-next'
import { breadcrumbJsonLd, toolJsonLd } from '~/utils/blog'
import { PUBLIC_EDITAL_PATH, publicEditalResultPath } from '~/utils/editalIntent'
import { PUBLIC_EDITAL_LIMITS, submitFailure, type PublicEditalMessage } from '~/utils/publicEdital'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'
import { rememberSource, setRetryHint, takeLastSource, takeRetryHint } from '~/composables/usePublicEdital'
import '~/assets/css/blog-prose.css'

// The page has its own primary call: the header's "Criar conta grátis" goes quiet (one highlight per screen, ADR-027 §6)
definePageMeta({ layout: 'public', quietHeaderCta: true })

const TITLE = 'Edital verticalizado grátis: lista para marcar, planilha e PDF'
const DESCRIPTION = 'Envie o PDF do edital ou cole o texto e receba as matérias e os assuntos numa lista para marcar o que já estudou. Baixe em planilha e PDF. Grátis, sem cadastro.'
useBlogSeo({
  title: TITLE,
  description: DESCRIPTION,
  path: PUBLIC_EDITAL_PATH,
  jsonLd: [
    toolJsonLd('Edital verticalizado grátis', DESCRIPTION, PUBLIC_EDITAL_PATH),
    breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Ferramentas', path: '/ferramentas' }, { name: 'Edital verticalizado', path: PUBLIC_EDITAL_PATH }]),
  ],
})

const FAQS = [
  { q: 'O que é edital verticalizado?', a: 'É o conteúdo programático do edital em lista, com uma linha por assunto, agrupada por matéria, para você marcar o que já estudou e revisou. Quem verticaliza o edital sabe o que cai, o que já viu e o que falta.' },
  { q: 'Posso baixar o edital verticalizado em planilha ou PDF?', a: 'Sim. A planilha sai em CSV, que abre no Excel e no Google Planilhas, e o PDF sai pronto para imprimir, com caixas para marcar à mão.' },
  { q: 'É grátis mesmo?', a: 'Sim. Verticalizar, marcar, baixar a planilha e o PDF e mandar o link à turma não custam nada nem pedem cadastro. Só criar o caderno no Baigi pede uma conta.' },
  { q: 'Vocês guardam meu PDF?', a: 'Não. O arquivo é apagado depois da leitura. Fica só a lista de matérias e assuntos, no link do resultado.' },
  { q: 'Confere com o edital oficial?', a: 'Use como guia e confira no edital oficial. A leitura é automática e pode errar um item ou outro.' },
]

const MB = 1024 * 1024
const edital = usePublicEdital()
const captchaHost = edital.captchaEl

const kind = ref<'pdf' | 'text'>('pdf')
const tabs = [{ key: 'pdf', label: 'Enviar PDF' }, { key: 'text', label: 'Colar texto' }]
const file = ref<File | null>(null)
const fileError = ref('')
const dragging = ref(false)
const text = ref('')
const showPages = ref(false)
const pageFrom = ref<string | number>('')
const pageTo = ref<string | number>('')
const pageFromRef = ref<{ focus: () => void } | null>(null)
const sending = ref(false)
const problem = ref<PublicEditalMessage | null>(null)

const pages = computed(() => {
  const from = Number(pageFrom.value)
  const to = Number(pageTo.value)
  return showPages.value && from >= 1 && to >= from ? { from, to } : null
})
const pagesError = computed(() => {
  if (!showPages.value || (!pageFrom.value && !pageTo.value)) return ''
  const p = pages.value
  if (!p) return 'Confira as páginas: a segunda não pode vir antes da primeira.'
  return p.to - p.from + 1 > PUBLIC_EDITAL_LIMITS.pageSpan ? `Use até ${PUBLIC_EDITAL_LIMITS.pageSpan} páginas.` : ''
})
const canSend = computed(() => {
  if (sending.value) return false
  if (kind.value === 'text') return text.value.trim().length >= PUBLIC_EDITAL_LIMITS.textMin
  return !!file.value && !fileError.value && (!showPages.value || (!!pages.value && !pagesError.value))
})

// Back from a failed reading: the same file or text, and the fix opened
onMounted(() => {
  const last = takeLastSource()
  const hint = takeRetryHint()
  if (!last) return
  if (last.file) {
    file.value = last.file
    kind.value = 'pdf'
    if (last.pageFrom && last.pageTo) {
      showPages.value = true
      pageFrom.value = last.pageFrom
      pageTo.value = last.pageTo
    }
  } else if (last.text) {
    text.value = last.text
    kind.value = 'text'
  }
  if (hint === 'text') kind.value = 'text'
  if (hint === 'pages' && last.file) openPages()
})

function pick(picked: File | null) {
  if (!picked) return
  file.value = picked
  problem.value = null
  const isPdf = picked.type === 'application/pdf' || /\.pdf$/i.test(picked.name)
  if (!isPdf) fileError.value = 'Envie um arquivo PDF.'
  else if (picked.size > PUBLIC_EDITAL_LIMITS.fileMb * MB) fileError.value = `O PDF tem ${(picked.size / MB).toFixed(1)} MB. O limite é ${PUBLIC_EDITAL_LIMITS.fileMb} MB. Cole só o texto do conteúdo programático.`
  else fileError.value = ''
  void edital.captcha.render(captchaHost.value)
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  input.value = ''
  pick(picked)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  pick(e.dataTransfer?.files?.[0] ?? null)
}

function openPages() {
  showPages.value = true
  kind.value = 'pdf'
  void nextTick(() => pageFromRef.value?.focus())
}

async function send() {
  if (!canSend.value) return
  sending.value = true
  problem.value = null
  const source = kind.value === 'pdf'
    ? { file: file.value, pageFrom: pages.value?.from ?? null, pageTo: pages.value?.to ?? null }
    : { text: text.value }
  try {
    const res = await edital.submit(source)
    await navigateTo(publicEditalResultPath(res.id))
  } catch (e) {
    const captchaMessage = (e as { captchaMessage?: string }).captchaMessage
    problem.value = captchaMessage
      ? { code: 'captcha', next: null, message: captchaMessage || CAPTCHA_MESSAGES.load }
      : submitFailure(e)
    if (!captchaMessage) reportApiError(e, { silent: true })
    rememberSource(source)
    setRetryHint(null)
  } finally {
    sending.value = false
  }
}
</script>
