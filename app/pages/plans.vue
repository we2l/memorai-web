<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-5xl mx-auto">
    <h1 class="text-display mb-2">Planos</h1>
    <p class="text-base-muted text-small mb-8">Core grátis e ilimitado. IA como upgrade natural.</p>

    <!-- Plans comparison -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      <div
        v-for="plan in plans"
        :key="plan.key"
        class="card p-5 flex flex-col"
        :class="plan.key === currentPlan ? 'border-accent-primary/40 ring-1 ring-accent-primary/20' : ''"
      >
        <div class="mb-4">
          <h2 class="text-headline">{{ plan.name }}</h2>
          <p class="text-display mt-1">
            <template v-if="plan.price">R${{ plan.price }}<span class="text-small text-base-muted">/mês</span></template>
            <template v-else>Grátis</template>
          </p>
        </div>

        <ul class="space-y-2.5 flex-1 mb-5">
          <li v-for="feat in plan.features" :key="feat.label" class="flex items-start gap-2 text-small">
            <Check v-if="feat.value" :size="16" class="text-green-500 shrink-0 mt-0.5" />
            <X v-else :size="16" class="text-base-muted/40 shrink-0 mt-0.5" />
            <span :class="feat.value ? 'text-base-primary' : 'text-base-muted/60'">
              {{ feat.label }}: <strong>{{ feat.value || '—' }}</strong>
            </span>
          </li>
        </ul>

        <button
          v-if="plan.key === currentPlan"
          class="btn-secondary w-full justify-center opacity-60 cursor-default"
          disabled
        >
          Plano atual
        </button>
        <button
          v-else-if="plan.key === 'free'"
          class="btn-secondary w-full justify-center opacity-60 cursor-default"
          disabled
        >
          —
        </button>
        <button
          v-else
          class="btn-primary w-full justify-center"
          :disabled="loading"
          @click="subscribe(plan.key)"
        >
          {{ isUpgrade(plan.key) ? 'Fazer upgrade' : 'Assinar' }}
        </button>
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
      <h2 class="text-headline mb-4">Pacotes extras</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="card p-5 flex items-center justify-between">
          <div>
            <p class="text-small font-medium text-base-primary">+5 Podcasts</p>
            <p class="text-micro text-base-muted">Crédito imediato neste mês</p>
          </div>
          <button class="btn-secondary text-small" :disabled="loading" @click="buyAddon('podcast_pack')">
            R$9,90
          </button>
        </div>
        <div class="card p-5 flex items-center justify-between">
          <div>
            <p class="text-small font-medium text-base-primary">+10 Uploads PDF</p>
            <p class="text-micro text-base-muted">Crédito imediato neste mês</p>
          </div>
          <button class="btn-secondary text-small" :disabled="loading" @click="buyAddon('pdf_pack')">
            R$4,90
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'

const route = useRoute()
const toast = useToast()
const auth = useAuthStore()
const subscription = useSubscriptionStore()

const loading = ref(false)
const currentPlan = computed(() => auth.user?.plan || 'free')

const plans = [
  {
    key: 'free',
    name: 'Grátis',
    price: null,
    features: [
      { label: 'Core (FSRS, notas, grafo, revisão)', value: '∞' },
      { label: 'Cards com IA', value: '20/mês' },
      { label: 'Upload PDF', value: '1/mês' },
      { label: 'Agente IA', value: '10/mês' },
      { label: 'Podcast', value: '' },
      { label: 'Modo Sniper', value: '' },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '14,90',
    features: [
      { label: 'Core (FSRS, notas, grafo, revisão)', value: '∞' },
      { label: 'Cards com IA', value: '∞' },
      { label: 'Upload PDF', value: '20/mês' },
      { label: 'Agente IA', value: '∞' },
      { label: 'Podcast', value: '5/mês' },
      { label: 'Modo Sniper', value: '' },
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '24,90',
    features: [
      { label: 'Core (FSRS, notas, grafo, revisão)', value: '∞' },
      { label: 'Cards com IA', value: '∞' },
      { label: 'Upload PDF', value: '∞' },
      { label: 'Agente IA', value: '∞' },
      { label: 'Podcast', value: '15/mês' },
      { label: 'Modo Sniper', value: '✅' },
    ],
  },
]

function isUpgrade(planKey: string) {
  const order = ['free', 'pro', 'premium']
  return order.indexOf(planKey) > order.indexOf(currentPlan.value)
}

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
  try {
    await subscription.checkoutAddon(addon)
  } catch {
    toast.show('Erro ao iniciar checkout.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await subscription.fetchStatus().catch(() => {})

  if (route.query.success === '1') {
    toast.show('Assinatura ativada! Bem-vindo ao plano pago.', 'success')
    // Refresh user data to get updated plan
    try {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: any }>('/me')
      if (res.data) auth.setAuth(res.data, auth.token!)
    } catch {}
  }
  if (route.query.canceled === '1') {
    toast.show('Pagamento cancelado.', 'info')
  }
})
</script>
