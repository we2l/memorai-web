<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-10">
      <h1 class="text-display mb-2">Escolha seu plano</h1>
      <p class="text-base-muted text-small">Core grátis pra sempre. Pague só pela IA que acelera seus estudos.</p>

      <!-- Billing toggle -->
      <div class="flex items-center justify-center gap-3 mt-5">
        <span :class="!isYearly ? 'text-base-primary font-medium' : 'text-base-muted'" class="text-small">Mensal</span>
        <button
          class="relative w-12 h-6 rounded-full transition-colors"
          :class="isYearly ? 'bg-accent-primary' : 'bg-[var(--border-divider)]'"
          aria-label="Alternar entre plano mensal e anual"
          @click="isYearly = !isYearly"
        >
          <span
            class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            :style="{ transform: isYearly ? 'translateX(24px)' : 'translateX(0)' }"
          />
        </button>
        <span :class="isYearly ? 'text-base-primary font-medium' : 'text-base-muted'" class="text-small">
          Anual
          <span class="inline-block ml-1 text-micro bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
            Economize R$71
          </span>
        </span>
      </div>
    </div>

    <!-- Plans -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-10">
      <!-- Free -->
      <div class="card p-6 flex flex-col">
        <p class="text-label uppercase tracking-wide mb-1">Grátis</p>
        <p class="text-3xl font-bold text-base-primary mb-1">R$0</p>
        <p class="text-micro text-base-muted mb-6">Para sempre</p>

        <button
          v-if="currentPlan === 'free'"
          class="btn-secondary w-full justify-center mb-6 opacity-60"
          disabled
        >
          Plano atual
        </button>
        <div v-else class="h-[42px] mb-6" />

        <ul class="space-y-3 text-small">
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Flashcards + FSRS ilimitados</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Notas, cadernos e grafo</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Importar Anki</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Upload de PDFs</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 10 cards IA/mês</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 5 tira-dúvidas/mês</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 1 simulado/mês (10 questões)</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 1 PDF processado/mês (100 pág)</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Podcast: prévia 30s</li>
        </ul>
      </div>

      <!-- Pro -->
      <div class="card-warm p-6 flex flex-col">
        <div class="mb-4">
          <span class="inline-block bg-accent-primary text-white text-micro font-semibold px-3 py-0.5 rounded-full">
            Recomendado
          </span>
        </div>

        <p class="text-label uppercase tracking-wide mb-1 text-accent-primary">Pro</p>
        <p class="text-3xl font-bold text-base-primary mb-1">
          <template v-if="isYearly">
            R$23<span class="text-lg">,99</span>
          </template>
          <template v-else>
            R$29<span class="text-lg">,90</span>
          </template>
          <span class="text-small font-normal text-base-muted">/mês</span>
        </p>
        <p class="text-micro text-base-muted mb-6">
          <template v-if="isYearly">R$287,90/ano · Sem limites. Sem interrupções.</template>
          <template v-else>Sem limites. Sem interrupções.</template>
        </p>

        <button
          v-if="currentPlan === 'pro'"
          class="btn-secondary w-full justify-center mb-6 opacity-60"
          disabled
        >
          Plano atual
        </button>
        <button
          v-else
          class="btn-primary w-full justify-center mb-6"
          :disabled="loading"
          @click="subscribe"
        >
          {{ loading ? 'Abrindo checkout...' : 'Assinar Pro' }}
        </button>

        <ul class="space-y-3 text-small">
          <li class="flex gap-2.5 font-medium text-base-primary"><Zap :size="16" class="text-accent-primary shrink-0 mt-0.5" /> Tudo do Grátis, mais:</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Cards com IA <strong>ilimitado</strong></li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Tira-dúvidas <strong>ilimitado</strong></li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Simulados <strong>ilimitados</strong> (com dissertativa)</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 20 PDFs processados/mês (até 500 pág)</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 5 podcasts/mês (até ~15 min)</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Mapa mental IA</li>
        </ul>
      </div>
    </div>

    <!-- Manage subscription -->
    <div v-if="subscription.info?.has_subscription" class="card p-5 mb-8 flex items-center justify-between">
      <div>
        <p class="text-small font-medium text-base-primary">Gerenciar assinatura</p>
        <p class="text-micro text-base-muted">Cancelar, trocar cartão ou ver faturas</p>
      </div>
      <button class="btn-secondary" @click="subscription.openPortal()">
        Gerenciar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Zap } from 'lucide-vue-next'

const route = useRoute()
const toast = useToast()
const auth = useAuthStore()
const subscription = useSubscriptionStore()

const loading = ref(false)
const isYearly = ref(false)
const currentPlan = computed(() => auth.user?.plan || 'free')

async function subscribe() {
  loading.value = true
  try {
    await subscription.checkoutSubscription('pro', isYearly.value ? 'yearly' : 'monthly')
  } catch {
    toast.show('Erro ao iniciar checkout.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await subscription.fetchStatus().catch(() => {})

  try {
    const { $api } = useNuxtApp()
    const res = await $api<{ data: any }>('/me')
    if (res.data) auth.setAuth(res.data, auth.token!)
  } catch {}

  if (route.query.success === '1') {
    toast.show('Assinatura ativada! Bem-vindo ao Pro.', 'success')
  }
  if (route.query.canceled === '1') {
    toast.show('Pagamento cancelado.', 'info')
  }
})
</script>
