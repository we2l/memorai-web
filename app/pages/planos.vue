<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-10">
      <h1 class="text-display mb-2">Escolha seu plano</h1>
      <p class="text-base-muted text-small">Core grátis pra sempre. Pague só pela IA que acelera seus estudos.</p>
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
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Upload de PDFs ilimitado</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Gerar 20 cards/mês</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 10 tira-dúvidas/mês</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 2 processamentos de PDF/mês</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 1 revisão em áudio/mês</li>
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
          R$14<span class="text-lg">,90</span>
          <span class="text-small font-normal text-base-muted">/mês</span>
        </p>
        <p class="text-micro text-base-muted mb-6">Sem limites. Sem interrupções.</p>

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
          @click="subscribe('pro')"
        >
          {{ loading && !loadingAddon ? 'Abrindo checkout...' : 'Assinar Pro' }}
        </button>

        <ul class="space-y-3 text-small">
          <li class="flex gap-2.5 font-medium text-base-primary"><Zap :size="16" class="text-accent-primary shrink-0 mt-0.5" /> Tudo do Grátis, mais:</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Gerar cards <strong>ilimitado</strong></li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Tira-dúvidas <strong>ilimitado</strong></li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 15 processamentos de PDF/mês</li>
          <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> 5 revisões em áudio/mês</li>
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

    <!-- Addon packs -->
    <div v-if="currentPlan !== 'free'">
      <h2 class="text-headline mb-1">Precisa de mais?</h2>
      <p class="text-micro text-base-muted mb-4">Pacotes extras com crédito imediato neste mês.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          class="card p-4 flex items-center justify-between hover:border-accent-primary/30 transition-colors text-left"
          :disabled="loading"
          @click="buyAddon('podcast_pack')"
        >
          <div>
            <p class="text-small font-medium text-base-primary">🎧 +5 Revisões em áudio</p>
            <p class="text-micro text-base-muted">Ouça seus pontos fracos no ônibus</p>
          </div>
          <span v-if="loadingAddon === 'podcast_pack'" class="text-small text-base-muted animate-pulse">Abrindo...</span>
          <span v-else class="text-small font-semibold text-accent-primary">R$9,90</span>
        </button>
        <button
          class="card p-4 flex items-center justify-between hover:border-accent-primary/30 transition-colors text-left"
          :disabled="loading"
          @click="buyAddon('pdf_pack')"
        >
          <div>
            <p class="text-small font-medium text-base-primary">📄 +10 Processamentos de PDF</p>
            <p class="text-micro text-base-muted">Resuma ou organize mais material</p>
          </div>
          <span v-if="loadingAddon === 'pdf_pack'" class="text-small text-base-muted animate-pulse">Abrindo...</span>
          <span v-else class="text-small font-semibold text-accent-primary">R$4,90</span>
        </button>
      </div>
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
const loadingAddon = ref<string | null>(null)
const currentPlan = computed(() => auth.user?.plan || 'free')

async function subscribe(planKey: string) {
  loading.value = true
  try {
    await subscription.checkoutSubscription(planKey)
  } catch {
    toast.show('Erro ao iniciar checkout.', 'error')
  } finally {
    loading.value = false
  }
}

async function buyAddon(addon: string) {
  loading.value = true
  loadingAddon.value = addon
  try {
    await subscription.checkoutAddon(addon)
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao processar pagamento. Tente novamente.', 'error')
  } finally {
    loading.value = false
    loadingAddon.value = null
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
