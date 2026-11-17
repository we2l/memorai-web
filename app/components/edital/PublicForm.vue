<template>
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
          <span class="text-meta text-fg-muted">{{ file ? `${(file.size / MB).toFixed(1)} MB. Toque para trocar o arquivo.` : `Até ${edital.limits.fileMb} MB. O edital inteiro serve: achamos o conteúdo programático.` }}</span>
          <input type="file" accept=".pdf,application/pdf" class="sr-only" @change="onFile">
        </label>
        <p v-if="fileError" class="text-meta text-danger" role="alert">{{ fileError }}</p>

        <template v-if="!showPages">
          <p class="text-meta text-fg-muted">
            O PDF tem vários editais?
            <button type="button" class="inline-block py-1 font-medium text-action-fg underline" data-testid="edital-pages-open" @click="openPages">Dizer as páginas</button>
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
      <span class="text-meta text-fg-muted">O arquivo é apagado depois da leitura.</span>
    </div>
  </form>
</template>

<script setup lang="ts">
// The form of the edital verticalizado grátis (prd-edital-verticalizado-publico RF-F1), shared by the tool's page and the
// entry of /comecar (prd-landing-mostrar-produto P3): the PDF or the pasted text goes to POST /public/editais with the
// Turnstile token (rendered on the first focus, strict on the API), then the result page /r/{id} reads it. `from`
// rides the result's URL so its events say where the reading started. Same limits, captcha and daily cap as always.
import { FileText } from 'lucide-vue-next'
import { publicEditalResultPath } from '~/utils/editalIntent'
import { PUBLIC_EDITAL_LIMITS, submitFailure, type PublicEditalMessage } from '~/utils/publicEdital'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'
import { rememberSource, setRetryHint, takeLastSource, takeRetryHint } from '~/composables/usePublicEdital'

const props = defineProps<{ from?: 'comecar' }>()
const emit = defineEmits<{ sent: [id: string] }>()

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
    emit('sent', res.id)
    await navigateTo({ path: publicEditalResultPath(res.id), query: props.from ? { from: props.from } : {} })
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
