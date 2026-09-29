<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-5xl mx-auto">
    <h1 class="text-display mb-4">Configurações</h1>
    <nav aria-label="Seções" class="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
      <a v-for="s in sectionLinks" :key="s.id" :href="`#${s.id}`" class="shrink-0 px-3 min-h-[36px] inline-flex items-center rounded-full text-small bg-surface-secondary text-base-secondary hover:text-base-primary">{{ s.label }}</a>
    </nav>

    <!-- Perfil -->
    <section id="perfil" class="card p-5 mb-6 scroll-mt-4" aria-labelledby="perfil-title">
      <h2 id="perfil-title" class="text-headline mb-4">Perfil</h2>
      <div class="space-y-3">
        <form class="max-w-sm" novalidate @submit.prevent="saveName">
          <label for="profile-name" class="text-label mb-1 block">Nome</label>
          <div class="flex gap-2">
            <input
              id="profile-name"
              v-model="nameDraft"
              type="text"
              class="input-base flex-1"
              autocomplete="name"
              maxlength="80"
              :aria-invalid="!!nameError"
              :aria-describedby="nameError ? 'profile-name-error' : undefined"
            />
            <button type="submit" class="btn-primary shrink-0" :disabled="!nameChanged || savingName">
              {{ savingName ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
          <p v-if="nameError" id="profile-name-error" class="text-micro text-[var(--badge-danger-text)] mt-1">{{ nameError }}</p>
        </form>
        <div>
          <p class="text-label">E-mail</p>
          <p class="text-base-primary">{{ auth.user?.email ?? '—' }}</p>
        </div>
        <div>
          <p class="text-label">Plano</p>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <UiPlanBadge :plan="auth.user?.plan" />
            <span v-if="planSummary" class="text-small text-base-muted" data-testid="plan-summary">{{ planSummary }}</span>
          </div>
          <p
            v-if="subscription.inGracePeriod && !subscription.info?.monthly_scheduled"
            class="mt-3 text-small text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2"
            role="status"
          >
            Seu anual venceu em {{ formatBillingDayMonth(subscription.info?.plan_expires_at) }}.
            Renove até {{ formatBillingDayMonth(subscription.info?.grace_ends_at) }} para não perder o Pro.
          </p>
          <div v-if="showRenew || showPortal" class="flex flex-wrap gap-2 mt-3">
            <NuxtLink v-if="showRenew" :to="ANNUAL_RENEWAL_PATH" class="btn-primary">Renovar</NuxtLink>
            <button v-if="showPortal" class="btn-secondary" @click="subscription.openPortal()">Gerenciar assinatura</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Senha -->
    <section id="senha" class="card p-5 mb-6 scroll-mt-4" aria-labelledby="senha-title">
      <h2 id="senha-title" class="text-headline mb-4">Senha</h2>
      <SettingsPasswordForm />
    </section>

    <!-- Estudo -->
    <section id="estudo" class="card p-5 mb-6 scroll-mt-4" aria-labelledby="estudo-title">
      <h2 id="estudo-title" class="text-headline mb-4">Estudo</h2>
      <div v-if="settingsLoading" class="space-y-3">
        <div v-for="i in 2" :key="i" class="skeleton h-20 w-full rounded-xl" />
      </div>
      <SettingsStudyPreferences v-else :settings="settings" :load-error="settingsError" @retry="loadSettings" />
    </section>

    <!-- Uso de IA -->
    <section id="uso-ia" class="card p-5 mb-6 scroll-mt-4">
      <div class="flex items-center gap-2 mb-4">
        <h2 class="text-headline">Uso de IA este mês</h2>
        <UiTooltip text="Cada feature de IA tem um limite mensal que renova automaticamente">
          <Info :size="14" class="text-base-muted" />
        </UiTooltip>
      </div>
      <div v-if="featureUsage.loading.value" class="space-y-3">
        <div v-for="i in 4" :key="i" class="skeleton h-10 w-full" />
      </div>
      <div v-else-if="featureUsage.usage.value" class="space-y-4">
        <p class="text-micro text-base-muted">
          Período: {{ formatDate(featureUsage.usage.value.period_start) }} — {{ formatDate(featureUsage.usage.value.period_end) }}
        </p>
        <div v-for="(data, key) in settingsFeatures" :key="key" class="flex items-center gap-4">
          <p class="text-small text-base-primary w-28 shrink-0">{{ settingsFeatureLabels[key as string] }}</p>
          <div class="flex-1">
            <div v-if="data.limit !== null" class="h-2 rounded-full bg-[var(--border-divider)] overflow-hidden">
              <div
                class="h-2 rounded-full transition-all"
                :class="data.remaining === 0 ? 'bg-danger' : 'bg-accent-primary'"
                :style="{ width: Math.min(100, (data.used / Math.max(1, data.limit)) * 100) + '%' }"
              />
            </div>
            <div v-else class="text-micro text-[var(--badge-success-text)]">∞ ilimitado</div>
          </div>
          <p class="text-micro text-base-muted w-20 text-right shrink-0">
            {{ data.limit !== null ? `${data.used}/${data.limit}` : `${data.used} usados` }}
          </p>
        </div>
      </div>
    </section>

    <!-- Aparência -->
    <section id="aparencia" class="card p-5 mb-6 scroll-mt-4">
      <h2 class="text-headline mb-4">Aparência</h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-base-primary">Tema</p>
          <p class="text-micro text-base-muted">Escolha entre claro e escuro</p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg text-small transition-colors"
            :aria-pressed="colorMode === 'dark'"
            :class="colorMode === 'dark' ? 'bg-accent-primary-subtle text-accent-primary' : 'bg-[var(--border-divider)] text-base-muted'"
            @click="setMode('dark')"
          >
            <Moon :size="16" class="inline mr-1" /> Escuro
          </button>
          <button
            class="px-4 py-2 rounded-lg text-small transition-colors"
            :aria-pressed="colorMode === 'light'"
            :class="colorMode === 'light' ? 'bg-accent-primary-subtle text-accent-primary' : 'bg-[var(--border-divider)] text-base-muted'"
            @click="setMode('light')"
          >
            <Sun :size="16" class="inline mr-1" /> Claro
          </button>
        </div>
      </div>
    </section>

    <!-- Sessão de Estudo (hidden for launch — too complex for new users) -->
    <section v-if="false" class="card p-6 md:p-8 mb-6">
      <h2 class="text-headline mb-2">Sessão de Estudo</h2>
      <p class="text-small text-base-muted mb-8">Configure quanto você quer estudar por dia. O app nunca descarta cards — o que não couber hoje aparece amanhã.</p>

      <div class="space-y-8">
        <div class="card p-3 sm:p-5">
          <div class="flex items-center justify-between mb-3">
            <label class="text-title">Novos cards por dia</label>
            <label class="flex items-center gap-2 text-small text-base-muted cursor-pointer">
              <input type="checkbox" :checked="settings.daily_new_cards_limit === null" @change="settings.daily_new_cards_limit = ($event.target as HTMLInputElement).checked ? null : 20" class="accent-[var(--color-accent-primary)]" />
              Ilimitado
            </label>
          </div>
          <input v-if="settings.daily_new_cards_limit !== null" v-model.number="settings.daily_new_cards_limit" type="number" min="1" max="999" class="input-base w-32 mb-4" />
          <div class="text-small text-base-muted leading-relaxed space-y-2">
            <p>Controla quantos cards <strong class="text-base-secondary">que você nunca estudou</strong> vão aparecer por dia. Se você colocar 5, o app vai te mostrar no máximo 5 cards totalmente novos — o resto fica guardado pra depois.</p>
            <p class="text-[var(--badge-warning-text)] inline-flex items-center gap-1"><AlertTriangle :size="14" /> Cada card novo gera cerca de 7 revisões nas semanas seguintes. Se colocar 20 novos/dia, em um mês você terá ~150 revisões diárias.</p>
            <p class="inline-flex items-center gap-1"><Lightbulb :size="14" class="text-[var(--badge-primary-text)] shrink-0" /> Recomendado: comece com <strong class="text-base-secondary">5</strong> e aumente conforme se sentir confortável.</p>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex items-center justify-between mb-3">
            <label class="text-title">Máximo de revisões por dia</label>
            <label class="flex items-center gap-2 text-small text-base-muted cursor-pointer">
              <input type="checkbox" :checked="settings.daily_review_limit === null" @change="settings.daily_review_limit = ($event.target as HTMLInputElement).checked ? null : 100" class="accent-[var(--color-accent-primary)]" />
              Ilimitado
            </label>
          </div>
          <input v-if="settings.daily_review_limit !== null" v-model.number="settings.daily_review_limit" type="number" min="1" max="9999" class="input-base w-32 mb-4" />
          <div class="text-small text-base-muted leading-relaxed space-y-2">
            <p>O <strong class="text-base-secondary">total de cards</strong> que você vai estudar no dia — inclui novos e revisões de cards antigos.</p>
            <p>Exemplo: se você colocar 30, o app vai te mostrar no máximo 30 cards por dia, mesmo que tenha 100 pendentes. Os que sobrarem aparecem nos dias seguintes.</p>
            <p class="inline-flex items-center gap-1"><Lightbulb :size="14" class="text-[var(--badge-primary-text)] shrink-0" /> Pouco tempo? Coloque <strong class="text-base-secondary">20–30</strong> (~10 min de estudo). Quer estudar bastante? Deixe ilimitado.</p>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <label class="text-title mb-3 block">Limite de tempo por sessão</label>
          <div class="mb-4">
            <UiSelect v-model="sessionTimeStr" :options="timeOptions" placeholder="Sem limite" />
          </div>
          <div class="text-small text-base-muted leading-relaxed space-y-2">
            <p>Define um cronômetro para sua sessão de estudo. Quando o tempo acabar, o app te avisa — mas não interrompe no meio de um card. Você escolhe se quer continuar ou parar.</p>
            <p class="inline-flex items-center gap-1"><Lightbulb :size="14" class="text-[var(--badge-primary-text)] shrink-0" /> Útil pra quem estuda no ônibus, no intervalo do trabalho, ou quer sessões curtas e focadas.</p>
          </div>
        </div>

        <!-- Learning mode default -->
        <div class="card p-3 sm:p-5">
          <label class="text-title mb-3 block">Modo de estudo padrão</label>
          <select v-model="settings.default_learning_mode" class="input-base w-full mb-3">
            <option value="exam">📚 Concurso / Vestibular</option>
            <option value="academic">🎓 Faculdade / Escola</option>
            <option value="language">🌍 Idiomas</option>
            <option value="technical">💻 Programação / TI</option>
            <option value="professional">📋 Certificações</option>
            <option value="general">✨ Uso geral</option>
          </select>
          <p class="text-small text-base-muted">Define o modo padrão para novos cadernos. Você pode mudar individualmente em cada caderno.</p>
        </div>

        <button class="btn-primary" :disabled="savingSettings" @click="saveSettings">
          {{ savingSettings ? 'Salvando...' : 'Salvar configurações' }}
        </button>
      </div>
    </section>

    <!-- Seus dados (LGPD) -->
    <section id="seus-dados" class="card p-5 mb-6 scroll-mt-4" aria-labelledby="dados-title">
      <h2 id="dados-title" class="text-headline mb-4">Seus dados</h2>
      <SettingsDataExport />
      <p class="text-micro text-base-muted mt-4">
        Saiba como tratamos seus dados na <NuxtLink to="/privacidade" class="underline">Política de Privacidade</NuxtLink>
        e nos <NuxtLink to="/termos" class="underline">Termos de Uso</NuxtLink>.
      </p>
    </section>

    <!-- Conta -->
    <section id="conta" class="card p-3 sm:p-5 scroll-mt-4" aria-labelledby="conta-title">
      <h2 id="conta-title" class="text-headline mb-4">Conta</h2>
      <button class="btn-secondary" @click="handleLogout">
        <LogOut :size="16" aria-hidden="true" /> Sair da conta
      </button>

      <div class="mt-6 pt-5 border-t border-[var(--badge-danger-text)]/20">
        <h3 class="text-title text-[var(--badge-danger-text)] mb-1">Zona de perigo</h3>
        <p class="text-small text-base-muted mb-3">Excluir a conta apaga todos os seus dados de forma permanente.</p>
        <button type="button" class="btn-danger" @click="showDelete = true">Excluir conta</button>
      </div>
    </section>

    <LazySettingsDeleteAccountModal v-if="deleteLoaded" v-model="showDelete" />
  </div>
</template>

<script setup lang="ts">
import { Moon, Sun, LogOut, AlertTriangle, Lightbulb, Info } from 'lucide-vue-next'
import type { UserSettings } from '~/types'

const auth = useAuthStore()
const subscription = useSubscriptionStore()
const { fetchPlans, limitOf, formatPrice } = usePlans()
const featureUsage = useFeatureUsage()

// Plan section (RF-23): annual validity, scheduled monthly, portal only for the monthly (RN-12)
const planSummary = computed(() => {
  const info = subscription.info
  if (!info?.billing) return ''
  if (info.billing === 'monthly') return 'Pro mensal'
  const until = formatBillingDate(info.plan_expires_at)
  if (info.monthly_scheduled) {
    const monthly = limitOf('pro')?.prices.monthly
    return `Pro anual até ${until}` + (monthly ? ` · depois, mensal ${formatPrice(monthly.amount_cents)}` : ' · depois, mensal')
  }
  return `Pro anual · válido até ${until}`
})
const showRenew = computed(() => subscription.isAnnual && !!subscription.info?.can_renew_annual && !subscription.info?.monthly_scheduled)
const showPortal = computed(() => !!subscription.info?.has_subscription)
const { colorMode, set } = useColorMode()

const settingsFeatureLabels: Record<string, string> = {
  cards_ai: 'Gerar cards',
  agent_chat: 'Tira-dúvidas',
  podcast: 'Revisão em áudio',
  pdf_to_note: 'Processar PDF',
}

const settingsFeatures = computed(() => {
  if (!featureUsage.usage.value) return {}
  return featureUsage.usage.value.features
})

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
const toast = useToast()
const { $api } = useNuxtApp()

const settings = reactive<UserSettings>({
  daily_new_cards_limit: 20,
  daily_review_limit: null,
  session_time_limit: null,
  survival_mode: false,
})
const savingSettings = ref(false)

const sessionTimeStr = computed({
  get: () => settings.session_time_limit?.toString() ?? '',
  set: (v: string) => { settings.session_time_limit = v ? parseInt(v) : null },
})

const timeOptions = [
  { value: '', label: 'Sem limite' },
  { value: '5', label: '5 minutos' },
  { value: '10', label: '10 minutos' },
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
]

const settingsLoading = ref(true)
const settingsError = ref(false)

async function loadSettings() {
  settingsLoading.value = true
  settingsError.value = false
  try {
    const res = await $api<any>('/settings')
    Object.assign(settings, res.data)
  } catch (e) {
    // Only the Estudo section depends on /settings: inline error there
    settingsError.value = true
    reportApiError(e, { silent: true })
  } finally {
    settingsLoading.value = false
  }
}

const sectionLinks = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'senha', label: 'Senha' },
  { id: 'estudo', label: 'Estudo' },
  { id: 'uso-ia', label: 'Uso de IA' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'seus-dados', label: 'Seus dados' },
  { id: 'conta', label: 'Conta' },
]

// Profile name (RF-F11.3)
const nameDraft = ref(auth.user?.name ?? '')
watch(() => auth.user?.name, (n) => { if (n && !nameChanged.value) nameDraft.value = n })
const nameChanged = computed(() => nameDraft.value.trim() !== (auth.user?.name ?? '') && nameDraft.value.trim().length > 0)
const nameError = ref('')
const { run: runName, pending: savingName } = useApiAction()
async function saveName() {
  nameError.value = ''
  const name = nameDraft.value.trim()
  if (name.length < 2) {
    nameError.value = 'O nome precisa ter pelo menos 2 caracteres.'
    return
  }
  try {
    await runName(() => auth.updateProfile(name), { success: 'Nome atualizado.', error: false, rethrow: true })
  } catch (e: any) {
    nameError.value = e?.data?.errors?.name?.[0] ?? extractApiMessage(e)
  }
}

// Account deletion (RF-F11.5)
const showDelete = ref(false)
const deleteLoaded = useLoadedOnce(() => showDelete.value)

async function saveSettings() {
  savingSettings.value = true
  try {
    await $api('/settings', { method: 'PUT', body: { ...settings } })
    toast.show('Configurações salvas!', 'success')
  } catch (e) {
    reportApiError(e, { error: 'Erro ao salvar.' })
  } finally {
    savingSettings.value = false
  }
}

function setMode(mode: 'light' | 'dark') {
  set(mode)
}

const { logout } = useLogout()
function handleLogout() {
  return logout({ message: 'Até logo!' })
}

onMounted(async () => {
  subscription.fetchStatus().catch((e: unknown) => reportApiError(e, { silent: true }))
  fetchPlans()
  await loadSettings()
  featureUsage.fetchUsage()
  if (!auth.user) await auth.fetchMe()
})
</script>
