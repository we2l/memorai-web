<template>
  <div class="card p-6 text-center" aria-live="polite">
    <UiBaigiMascot :size="72" :state="status === 'loading' ? 'thinking' : 'idle'" class="mx-auto mb-4" />

    <template v-if="status === 'loading'">
      <h1 class="text-headline mb-2">Desativando…</h1>
      <p class="text-small text-base-muted">Só um instante.</p>
    </template>

    <template v-else-if="status === 'invalid'">
      <h1 class="text-headline mb-2">Link inválido</h1>
      <p class="text-small text-base-muted mb-6">Link inválido. Desative em Configurações.</p>
      <NuxtLink to="/configuracoes#lembretes" class="btn-primary w-full justify-center min-h-[2.75rem]">Abrir Configurações</NuxtLink>
    </template>

    <template v-else-if="status === 'error'">
      <h1 class="text-headline mb-2">Não conseguimos desativar agora</h1>
      <p class="text-small text-base-muted mb-6">Verifique sua conexão e tente de novo.</p>
      <button type="button" class="btn-primary w-full justify-center min-h-[2.75rem]" @click="unsubscribe">Tentar de novo</button>
    </template>

    <template v-else-if="status === 'resubscribed'">
      <h1 class="text-headline mb-2">Lembretes reativados</h1>
      <p class="text-small text-base-muted mb-6">Pronto, lembretes reativados às {{ formatReminderHour(hour) }}.</p>
    </template>

    <template v-else>
      <h1 class="text-headline mb-2">Lembretes desativados</h1>
      <p class="text-small text-base-muted mb-6">Você não vai mais receber e-mails de estudo.</p>
      <button
        v-if="resubscribeUrl"
        type="button"
        class="btn-secondary w-full justify-center min-h-[2.75rem]"
        :disabled="resubscribing"
        @click="resubscribe"
      >
        {{ resubscribing ? 'Reativando…' : 'Reativar lembretes' }}
      </button>
    </template>

    <NuxtLink to="/hoje" class="inline-block mt-4 text-small text-accent-primary underline">Ir para o Baigi</NuxtLink>
  </div>
</template>

<script setup lang="ts">
// Public (RF-F03): the e-mail link GET only redirects here; the opt-out is this POST (RN-R05).
definePageMeta({ layout: 'auth' })
useHead({ title: 'Lembretes · Baigi', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const { run, pending: resubscribing } = useApiAction()

type Status = 'loading' | 'done' | 'invalid' | 'error' | 'resubscribed'
const status = ref<Status>('loading')
const resubscribeUrl = ref('')
const hour = ref(DEFAULT_REMINDER_HOUR)

/** Only signed URLs of our own API: never POST (with the XSRF header) anywhere else. */
function isApiUrl(url: unknown, path: string): url is string {
  return typeof url === 'string' && url.startsWith(`${String(config.public.apiBase).replace(/\/$/, '')}${path}`)
}

async function unsubscribe() {
  const url = route.query.u
  if (!isApiUrl(url, '/email/unsubscribe/')) {
    status.value = 'invalid'
    return
  }
  status.value = 'loading'
  try {
    const res = await $api<{ data: { resubscribe_url: string } }>(url, { method: 'POST' })
    resubscribeUrl.value = isApiUrl(res.data.resubscribe_url, '/email/resubscribe/') ? res.data.resubscribe_url : ''
    status.value = 'done'
  } catch (e) {
    status.value = getErrorStatus(e) === 403 ? 'invalid' : 'error'
  }
}

async function resubscribe() {
  const res = await run(() => $api<{ data: { reminder_hour: number } }>(resubscribeUrl.value, { method: 'POST' }), {
    error: 'Não foi possível reativar. Ative em Configurações.',
  })
  if (!res) return
  hour.value = res.data.reminder_hour ?? DEFAULT_REMINDER_HOUR
  status.value = 'resubscribed'
}

// Client only: never on a prerender/SSR pass (a GET must not opt anyone out)
onMounted(unsubscribe)
</script>
