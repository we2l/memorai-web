<template>
  <!-- Own wrapper (public page, no shell): the passed state has 3 columns on the desktop -->
  <div class="flex min-h-dvh items-center justify-center bg-page px-gutter py-8">
    <div class="w-full" :class="state === 'passed' ? 'max-w-page' : 'max-w-md'" aria-live="polite">
      <UiSection v-if="state === 'loading'" class="flex flex-col items-center gap-4 text-center" role="status">
        <UiBaigiMascot :size="72" state="thinking" />
        <p class="text-body text-fg">Registrando sua resposta…</p>
      </UiSection>

      <UiSection v-else-if="state === 'expired'" class="flex flex-col items-center gap-3 text-center" data-testid="result-expired">
        <UiBaigiMascot :size="72" />
        <h1 class="text-section text-fg-strong">Link expirado</h1>
        <p class="text-body text-fg-muted">Link expirado. Entre no Baigi para registrar o resultado.</p>
        <UiButton variant="primary" block :to="authed('/progresso#provas')">Entrar</UiButton>
      </UiSection>

      <UiErrorState v-else-if="state === 'error'" variant="hero" title="Não conseguimos registrar agora" description="Verifique sua conexão e tente de novo." @retry="submit" />

      <template v-else-if="state === 'passed'">
        <!-- The achievement of the exam (ADR-027 §6: mascot only in conquests; ≤ 700 ms, reduced motion) -->
        <UiCelebration kind="milestone" :level="1" :title="`Parabéns! Você passou em ${context?.title ?? 'sua prova'}`" subtitle="Prova aprovada" class="mb-6" />
        <p v-if="changedNote" class="-mt-3 mb-6 text-center text-meta text-fg-muted" data-testid="result-already">{{ changedNote }}</p>
        <div class="grid grid-cols-1 gap-4" :class="testimonialUrl ? 'lg:grid-cols-3' : 'lg:grid-cols-2'">
          <UiSection v-if="testimonialUrl" title="Conte como o Baigi ajudou" :level="2" class="flex flex-col gap-3">
            <p class="flex-1 text-meta text-fg-muted">Sua história ajuda quem ainda está estudando a acreditar que dá.</p>
            <UiButton block :href="testimonialUrl" target="_blank" rel="noopener">Deixar depoimento</UiButton>
          </UiSection>
          <UiSection title="Indique para quem ainda está estudando" :level="2" class="flex flex-col gap-3">
            <p class="flex-1 text-meta text-fg-muted">Conhece alguém se preparando para uma prova? Mande o Baigi.</p>
            <UiButton block :to="referralUrl">Indicar o Baigi</UiButton>
          </UiSection>
          <UiSection title="E a sua assinatura?" :level="2" class="flex flex-col gap-3">
            <p class="flex-1 text-meta text-fg-muted">Vai estudar para outra prova? Seus cadernos continuam aqui.</p>
            <div class="flex flex-col gap-2">
              <UiButton variant="primary" block :to="authed('/progresso?nova_prova=1#provas')">Continuar estudando</UiButton>
              <UiButton block to="/planos">Gerenciar assinatura</UiButton>
            </div>
          </UiSection>
        </div>
      </template>

      <template v-else-if="state === 'failed'">
        <div class="mb-6 flex flex-col items-center gap-3 text-center">
          <UiBaigiMascot :size="72" />
          <h1 class="text-page-title-sm text-fg-strong">Não foi dessa vez, e tudo bem.</h1>
          <p class="text-body text-fg">
            Uma prova é uma fotografia de um dia, não do quanto você sabe. O que você revisou continua na sua memória e nos seus cadernos.
          </p>
          <p v-if="changedNote" class="text-meta text-fg-muted" data-testid="result-already">{{ changedNote }}</p>
        </div>
        <UiSection title="Próxima prova" :level="2" class="flex flex-col gap-3">
          <p class="text-meta text-fg-muted">
            Seus {{ topicCount }} {{ topicCount === 1 ? 'caderno continua pronto' : 'cadernos continuam prontos' }}. Cadastre a próxima data e o Baigi reorganiza a revisão.
          </p>
          <UiButton variant="primary" block :to="authed(`/progresso?nova_prova=1&from=${examId}#provas`)">Cadastrar nova prova</UiButton>
        </UiSection>
        <p class="mt-4 text-center">
          <UiLink :to="authed('/revisar')">Voltar a revisar</UiLink>
        </p>
      </template>
    </div>

    <ShellToastHost />
  </div>
</template>

<script setup lang="ts">
import type { ExamOutcome, ExamOutcomeContext } from '~/types'

// Public (RF-F09): the e-mail GET only redirects here; this page POSTs the answer (RN-R05).
definePageMeta({ layout: false })
useHead({ title: 'Resultado da prova · Baigi', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { $api } = useNuxtApp()
const auth = useAuthStore()
const config = useRuntimeConfig()

const testimonialUrl = computed(() => String(config.public.testimonialUrl || ''))
const referralUrl = computed(() => String(config.public.referralUrl || '/criar-conta'))

type State = 'loading' | 'expired' | 'error' | ExamOutcome
const state = ref<State>('loading')
const context = ref<ExamOutcomeContext | null>(null)
const changedNote = ref('')

const examId = computed(() => String(route.query.exam ?? ''))
const topicCount = computed(() => context.value?.topics.length ?? 0)

function isOutcome(v: unknown): v is ExamOutcome {
  return v === 'passed' || v === 'failed'
}

/** CTAs that need a session go through /entrar when logged out. */
function authed(path: string): string {
  return auth.user ? path : `/entrar?redirect=${encodeURIComponent(path)}`
}

async function submit() {
  const { t, outcome, error } = route.query
  if (error || !examId.value || typeof t !== 'string' || !isOutcome(outcome)) {
    state.value = 'expired'
    return
  }

  state.value = 'loading'
  const base = `/exams/${encodeURIComponent(examId.value)}`
  try {
    const [answer, ctx] = await Promise.all([
      $api<{ data: { outcome: ExamOutcome; already_answered: boolean } }>(`${base}/outcome-public`, { method: 'POST', query: { t }, body: { outcome } }),
      $api<{ data: ExamOutcomeContext }>(`${base}/outcome-context`, { query: { t } }),
    ])
    context.value = ctx.data
    // Render what the API stored, not what the link said
    if (answer.data.already_answered && answer.data.outcome !== outcome) {
      changedNote.value = 'Você já tinha respondido. Para mudar, use Progresso › Provas.'
    }
    state.value = answer.data.outcome
  } catch (e) {
    reportApiError(e, { silent: true })
    const status = getErrorStatus(e)
    state.value = status === 403 || status === 404 ? 'expired' : 'error'
  }
}

// Client only: a prerender/SSR pass never records anything
onMounted(submit)
</script>
