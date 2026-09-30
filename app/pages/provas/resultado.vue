<template>
  <!-- Own wrapper (auth layout look, wider): the passed state needs 3 columns on desktop -->
  <div class="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
    <div class="w-full" :class="state === 'passed' ? 'max-w-5xl' : 'max-w-md'" aria-live="polite">
      <div v-if="state === 'loading'" class="card p-6 text-center" role="status">
        <UiBaigiMascot :size="72" state="thinking" class="mx-auto mb-4" />
        <p class="text-body text-base-secondary">Registrando sua resposta…</p>
      </div>

      <div v-else-if="state === 'expired'" class="card p-6 text-center" data-testid="result-expired">
        <UiBaigiMascot :size="72" class="mx-auto mb-4" />
        <h1 class="text-headline mb-2">Link expirado</h1>
        <p class="text-small text-base-muted mb-6">Link expirado. Entre no Baigi para registrar o resultado.</p>
        <NuxtLink :to="authed('/provas')" class="btn-primary w-full justify-center min-h-[2.75rem]">Entrar</NuxtLink>
      </div>

      <div v-else-if="state === 'error'" class="card p-6 text-center">
        <h1 class="text-headline mb-2">Não conseguimos registrar agora</h1>
        <p class="text-small text-base-muted mb-6">Verifique sua conexão e tente de novo.</p>
        <button type="button" class="btn-primary w-full justify-center min-h-[2.75rem]" @click="submit">Tentar de novo</button>
      </div>

      <template v-else-if="state === 'passed'">
        <UiConfetti :trigger="true" />
        <div class="text-center mb-6">
          <UiBaigiMascot :size="80" state="celebrating" class="mx-auto mb-4" />
          <h1 class="text-display">Parabéns! Você passou em {{ context?.title ?? 'sua prova' }} <span aria-hidden="true">🎉</span></h1>
          <p v-if="changedNote" class="text-small text-base-muted mt-2" data-testid="result-already">{{ changedNote }}</p>
        </div>
        <div class="grid grid-cols-1 gap-4" :class="testimonialUrl ? 'lg:grid-cols-3' : 'lg:grid-cols-2'">
          <section v-if="testimonialUrl" class="card p-5 flex flex-col gap-3" aria-labelledby="card-testimonial">
            <h2 id="card-testimonial" class="text-title">Conte como o Baigi ajudou</h2>
            <p class="text-small text-base-muted flex-1">Sua história ajuda quem ainda está estudando a acreditar que dá.</p>
            <a :href="testimonialUrl" target="_blank" rel="noopener" class="btn-secondary justify-center w-full min-h-[2.75rem]">Deixar depoimento</a>
          </section>
          <section class="card p-5 flex flex-col gap-3" aria-labelledby="card-referral">
            <h2 id="card-referral" class="text-title">Indique para quem ainda está estudando</h2>
            <p class="text-small text-base-muted flex-1">Conhece alguém se preparando para uma prova? Mande o Baigi.</p>
            <NuxtLink :to="referralUrl" class="btn-secondary justify-center w-full min-h-[2.75rem]">Indicar o Baigi</NuxtLink>
          </section>
          <section class="card p-5 flex flex-col gap-3" aria-labelledby="card-plan">
            <h2 id="card-plan" class="text-title">E a sua assinatura?</h2>
            <p class="text-small text-base-muted flex-1">Vai estudar para outra prova? Seus cadernos continuam aqui.</p>
            <div class="flex flex-col gap-2">
              <NuxtLink :to="authed('/provas?nova=1')" class="btn-primary justify-center w-full min-h-[2.75rem]">Continuar estudando</NuxtLink>
              <NuxtLink to="/planos" class="btn-secondary justify-center w-full min-h-[2.75rem]">Gerenciar assinatura</NuxtLink>
            </div>
          </section>
        </div>
      </template>

      <template v-else-if="state === 'failed'">
        <div class="text-center mb-6">
          <UiBaigiMascot :size="72" class="mx-auto mb-4" />
          <h1 class="text-display">Não foi dessa vez, e tudo bem.</h1>
          <p class="text-body text-base-secondary mt-3">
            Uma prova é uma fotografia de um dia, não do quanto você sabe. O que você revisou continua na sua memória e nos seus cadernos.
          </p>
          <p v-if="changedNote" class="text-small text-base-muted mt-2" data-testid="result-already">{{ changedNote }}</p>
        </div>
        <section class="card p-5 flex flex-col gap-3" aria-labelledby="card-next">
          <h2 id="card-next" class="text-title">Próxima prova</h2>
          <p class="text-small text-base-muted">
            Seus {{ topicCount }} {{ topicCount === 1 ? 'caderno continua pronto' : 'cadernos continuam prontos' }}. Cadastre a próxima data e o Baigi reorganiza a revisão.
          </p>
          <NuxtLink :to="authed(`/provas?nova=1&from=${examId}`)" class="btn-primary justify-center w-full min-h-[2.75rem]">Cadastrar nova prova</NuxtLink>
        </section>
        <p class="text-center mt-4">
          <NuxtLink :to="authed('/revisar')" class="text-small text-accent-primary underline">Voltar a revisar</NuxtLink>
        </p>
      </template>
    </div>

    <UiToast />
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
      changedNote.value = 'Você já tinha respondido. Para mudar, use a página Provas.'
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
