<template>
  <NuxtLayout :name="auth.user ? 'default' : 'landing'">
    <UiPublicHeader v-if="!auth.user" />
    <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-10">
        <h1 class="text-display mb-2">Escolha seu plano</h1>
        <p class="text-base-muted text-small">Core grátis pra sempre. Pague só pela IA que acelera seus estudos.</p>

        <!-- Billing toggle -->
        <div v-if="pro?.prices.annual" class="flex items-center justify-center gap-3 mt-5">
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
            <span v-if="pro.prices.annual.savings_cents" class="inline-block ml-1 text-micro bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
              Economize {{ formatPrice(pro.prices.annual.savings_cents) }}
            </span>
          </span>
        </div>
      </div>

      <!-- Plans -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-10">
        <!-- Free -->
        <div class="card p-6 flex flex-col">
          <p class="text-label uppercase tracking-wide mb-1">{{ free?.name ?? 'Grátis' }}</p>
          <p v-if="free" class="text-3xl font-bold text-base-primary mb-1">{{ formatPrice(free.prices.monthly?.amount_cents ?? 0) }}</p>
          <p class="text-micro text-base-muted mb-6">Para sempre</p>

          <NuxtLink v-if="!auth.user" to="/criar-conta?redirect=/planos" class="btn-secondary w-full justify-center mb-6">
            Criar conta grátis
          </NuxtLink>

          <button
            v-else-if="currentPlan === 'free'"
            class="btn-secondary w-full justify-center mb-6 opacity-60"
            disabled
          >
            Plano atual
          </button>
          <div v-else class="h-[42px] mb-6" />

          <ul class="space-y-3 text-small">
            <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Flashcards e revisão espaçada ilimitados</li>
            <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Notas, cadernos e grafo</li>
            <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Importar Anki</li>
            <li class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> Upload de PDFs</li>
            <li v-for="line in freeLines" :key="line" class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> {{ line }}</li>
          </ul>
        </div>

        <!-- Pro -->
        <div class="card-warm p-6 flex flex-col">
          <div class="mb-4">
            <span class="inline-block bg-accent-primary text-white text-micro font-semibold px-3 py-0.5 rounded-full">
              Recomendado
            </span>
          </div>

          <p class="text-label uppercase tracking-wide mb-1 text-accent-primary">{{ pro?.name ?? 'Pro' }}</p>
          <p v-if="pro?.prices.monthly" class="text-3xl font-bold text-base-primary mb-1">
            {{ formatPrice(isYearly && pro.prices.annual ? pro.prices.annual.monthly_equivalent_cents ?? 0 : pro.prices.monthly.amount_cents) }}
            <span class="text-small font-normal text-base-muted">/mês</span>
          </p>
          <p class="text-micro text-base-muted mb-6">
            <template v-if="isYearly && annualCopy">{{ annualCopy }}</template>
            <template v-else>Mais IA, sem interrupções.</template>
          </p>

          <NuxtLink v-if="!auth.user" to="/criar-conta?redirect=/planos" class="btn-primary w-full justify-center mb-6">
            Criar conta grátis
          </NuxtLink>

          <!-- Annual running: validity + renewal (RN-09) or monthly scheduling at D-7 (RN-08) -->
          <template v-else-if="isAnnual">
            <p class="text-small text-base-primary font-medium mb-2" data-testid="annual-valid-until">
              Seu anual vale até {{ formatBillingDate(subscription.info?.plan_expires_at) }}
            </p>
            <template v-if="isYearly">
              <UiTooltip v-if="!subscription.info?.can_renew_annual" :text="`A renovação abre ${ANNUAL_RENEWAL_WINDOW_DAYS} dias antes`">
                <button class="btn-secondary w-full justify-center mb-6 opacity-60" disabled>
                  Renovar
                </button>
              </UiTooltip>
              <button v-else class="btn-primary w-full justify-center mb-6" :disabled="loading" @click="subscribe">
                {{ loading ? 'Abrindo checkout...' : 'Renovar anual' }}
              </button>
            </template>
            <button
              v-else-if="canScheduleMonthly"
              class="btn-secondary w-full justify-center mb-6"
              :disabled="loading"
              @click="subscribe"
            >
              {{ loading ? 'Abrindo checkout...' : 'Agendar mensal para depois do anual' }}
            </button>
            <button v-else class="btn-secondary w-full justify-center mb-6 opacity-60" disabled>
              Plano atual
            </button>
          </template>
          <button
            v-else-if="currentPlan === 'pro'"
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
            {{ loading ? 'Abrindo checkout...' : isYearly ? 'Assinar anual' : 'Assinar Pro' }}
          </button>

          <ul class="space-y-3 text-small">
            <li class="flex gap-2.5 font-medium text-base-primary"><Zap :size="16" class="text-accent-primary shrink-0 mt-0.5" /> Tudo do Grátis, mais:</li>
            <li v-for="line in proLines" :key="line" class="flex gap-2.5"><Check :size="16" class="text-green-500 shrink-0 mt-0.5" /> {{ line }}</li>
          </ul>
        </div>
      </div>

      <!-- Manage subscription -->
      <div v-if="subscription.info?.has_subscription" class="card p-5 mb-8 flex items-center justify-between gap-3">
        <div>
          <p class="text-small font-medium text-base-primary">Gerenciar assinatura</p>
          <p class="text-micro text-base-muted">Cancelar, trocar cartão ou ver faturas</p>
          <!-- Monthly → annual: the annual starts when the paid month ends (RN-07) -->
          <button
            v-if="subscription.info?.billing === 'monthly' && pro?.prices.annual"
            class="text-micro text-accent-primary font-medium underline mt-1"
            :disabled="loading"
            @click="switchToAnnual"
          >
            Mudar para anual e economizar {{ formatPrice(pro.prices.annual.savings_cents ?? 0) }}
          </button>
        </div>
        <button class="btn-secondary shrink-0" @click="subscription.openPortal()">
          Gerenciar
        </button>
      </div>
    </div>
    <UiPublicFooter />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { Check, Zap } from 'lucide-vue-next'

// Public page: app layout when logged in, landing when anonymous (RF-F11.2)
definePageMeta({ layout: false })

const route = useRoute()
const toast = useToast()
const auth = useAuthStore()
const subscription = useSubscriptionStore()

const loading = ref(false)
// Annual is the default offer (RF-20); ?ciclo=mensal forces the monthly
const isYearly = ref(route.query.ciclo !== 'mensal')
const currentPlan = computed(() => auth.user?.plan || 'free')
const isAnnual = computed(() => subscription.isAnnual)
const canScheduleMonthly = computed(() => {
  const info = subscription.info
  return !!info && !info.has_subscription && daysUntil(info.plan_expires_at) <= MONTHLY_SWITCH_WINDOW_DAYS
})

// Limits and prices come only from GET /api/plans (RN-01)
const { fetchPlans, limitOf, formatPrice, benefitLines } = usePlans()
const free = computed(() => limitOf('free'))
const pro = computed(() => limitOf('pro'))
const freeLines = computed(() => benefitLines('free'))
const proLines = computed(() => benefitLines('pro'))

/** "R$ 287,90 no Pix ou 12x de R$ 23,99 sem juros no cartão" — numbers from GET /api/plans */
const annualCopy = computed(() => {
  const annual = pro.value?.prices.annual
  if (!annual) return ''
  const total = formatPrice(annual.amount_cents)
  const installments = annual.installments_max ?? 1
  return installments > 1
    ? `${total} no Pix ou ${installments}x de ${formatPrice(Math.round(annual.amount_cents / installments))} sem juros no cartão`
    : `${total} no Pix ou à vista no cartão`
})

async function startCheckout(annual: boolean) {
  loading.value = true
  try {
    if (annual) await subscription.checkoutAnnual()
    else await subscription.checkoutSubscription('pro', 'monthly')
  } catch (e: any) {
    reportApiError(e, { error: extractApiMessage(e, 'Não foi possível abrir o checkout. Tente de novo.') })
  } finally {
    loading.value = false
  }
}

function subscribe() {
  return startCheckout(isYearly.value)
}

function switchToAnnual() {
  return startCheckout(true)
}

onMounted(async () => {
  fetchPlans()
  if (!auth.user) return // anonymous visitor: only the public catalog

  await subscription.fetchStatus().catch((e: unknown) => reportApiError(e, { silent: true }))

  try {
    const { $api } = useNuxtApp()
    const res = await $api<{ data: any }>('/me')
    if (res.data) auth.setUser(res.data)
  } catch (e) {
    reportApiError(e, { silent: true })
  }

  if (route.query.success === '1') {
    toast.show('Assinatura ativada! Bem-vindo ao Pro.', 'success')
  }
  if (route.query.canceled === '1') {
    toast.show('Pagamento cancelado.', 'info')
  }

  // Renewal link from the expiry e-mails: open the annual checkout right away
  if (route.query.ciclo === 'anual' && route.query.renovar === '1' && (subscription.info?.can_renew_annual ?? true)) {
    startCheckout(true)
  }
})
</script>
