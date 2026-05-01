<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-5xl mx-auto">
    <h1 class="text-display mb-8">Configurações</h1>

    <!-- Perfil -->
    <section class="card p-5 mb-6">
      <h2 class="text-headline mb-4">Perfil</h2>
      <div class="space-y-3">
        <div>
          <p class="text-label">Nome</p>
          <p class="text-base-primary">{{ auth.user?.name ?? '—' }}</p>
        </div>
        <div>
          <p class="text-label">E-mail</p>
          <p class="text-base-primary">{{ auth.user?.email ?? '—' }}</p>
        </div>
        <div>
          <p class="text-label">Plano</p>
          <div class="flex items-center gap-3 mt-1">
            <UiPlanBadge :plan="auth.user?.plan" />
          </div>
        </div>
      </div>
    </section>

    <!-- Uso de IA -->
    <section class="card p-5 mb-6">
      <h2 class="text-headline mb-4">Uso de IA este mês</h2>
      <div v-if="featureUsage.loading.value" class="space-y-3">
        <div v-for="i in 4" :key="i" class="skeleton h-10 w-full" />
      </div>
      <div v-else-if="featureUsage.usage.value" class="space-y-4">
        <p class="text-micro text-base-muted">
          Período: {{ formatDate(featureUsage.usage.value.period_start) }} — {{ formatDate(featureUsage.usage.value.period_end) }}
        </p>
        <div v-for="(data, key) in featureUsage.usage.value.features" :key="key" class="flex items-center gap-4">
          <p class="text-small text-base-primary w-28 shrink-0">{{ settingsFeatureLabels[key as string] }}</p>
          <div class="flex-1">
            <div v-if="data.limit !== null" class="h-2 rounded-full bg-surface-tertiary overflow-hidden">
              <div
                class="h-2 rounded-full transition-all"
                :class="data.remaining === 0 ? 'bg-danger' : 'bg-accent-primary'"
                :style="{ width: Math.min(100, (data.used / Math.max(1, data.limit)) * 100) + '%' }"
              />
            </div>
            <div v-else class="text-micro text-success">∞ ilimitado</div>
          </div>
          <p class="text-micro text-base-muted w-20 text-right shrink-0">
            {{ data.limit !== null ? `${data.used}/${data.limit}` : `${data.used} usados` }}
          </p>
        </div>
      </div>
    </section>

    <!-- Aparência -->
    <section class="card p-5 mb-6">
      <h2 class="text-headline mb-4">Aparência</h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-base-primary">Tema</p>
          <p class="text-micro text-base-muted">Escolha entre claro e escuro</p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg text-small transition-colors"
            :class="colorMode.value === 'dark' ? 'bg-accent-primary-subtle text-accent-primary' : 'bg-surface-tertiary text-base-muted'"
            @click="setMode('dark')"
          >
            <Moon :size="16" class="inline mr-1" /> Escuro
          </button>
          <button
            class="px-4 py-2 rounded-lg text-small transition-colors"
            :class="colorMode.value === 'light' ? 'bg-accent-primary-subtle text-accent-primary' : 'bg-surface-tertiary text-base-muted'"
            @click="setMode('light')"
          >
            <Sun :size="16" class="inline mr-1" /> Claro
          </button>
        </div>
      </div>
    </section>

    <!-- Sessão de Estudo -->
    <section class="card p-6 md:p-8 mb-6">
      <h2 class="text-headline mb-2">Sessão de Estudo</h2>
      <p class="text-small text-base-muted mb-8">Configure quanto você quer estudar por dia. O app nunca descarta cards — o que não couber hoje aparece amanhã.</p>

      <div class="space-y-8">
        <div class="card p-3 sm:p-5">
          <div class="flex items-center justify-between mb-3">
            <label class="text-title">Novos cards por dia</label>
            <label class="flex items-center gap-2 text-small text-base-muted cursor-pointer">
              <input type="checkbox" :checked="settings.daily_new_cards_limit === null" @change="settings.daily_new_cards_limit = ($event.target as HTMLInputElement).checked ? null : 20" class="accent-[#D97706]" />
              Ilimitado
            </label>
          </div>
          <input v-if="settings.daily_new_cards_limit !== null" v-model.number="settings.daily_new_cards_limit" type="number" min="1" max="999" class="input-base w-32 mb-4" />
          <div class="text-small text-base-muted leading-relaxed space-y-2">
            <p>Controla quantos cards <strong class="text-base-secondary">que você nunca estudou</strong> vão aparecer por dia. Se você colocar 5, o app vai te mostrar no máximo 5 cards totalmente novos — o resto fica guardado pra depois.</p>
            <p class="text-warning">⚠️ Cada card novo gera cerca de 7 revisões nas semanas seguintes. Se colocar 20 novos/dia, em um mês você terá ~150 revisões diárias.</p>
            <p>💡 Recomendado: comece com <strong class="text-base-secondary">5</strong> e aumente conforme se sentir confortável.</p>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <div class="flex items-center justify-between mb-3">
            <label class="text-title">Máximo de revisões por dia</label>
            <label class="flex items-center gap-2 text-small text-base-muted cursor-pointer">
              <input type="checkbox" :checked="settings.daily_review_limit === null" @change="settings.daily_review_limit = ($event.target as HTMLInputElement).checked ? null : 100" class="accent-[#D97706]" />
              Ilimitado
            </label>
          </div>
          <input v-if="settings.daily_review_limit !== null" v-model.number="settings.daily_review_limit" type="number" min="1" max="9999" class="input-base w-32 mb-4" />
          <div class="text-small text-base-muted leading-relaxed space-y-2">
            <p>O <strong class="text-base-secondary">total de cards</strong> que você vai estudar no dia — inclui novos e revisões de cards antigos.</p>
            <p>Exemplo: se você colocar 30, o app vai te mostrar no máximo 30 cards por dia, mesmo que tenha 100 pendentes. Os que sobrarem aparecem nos dias seguintes.</p>
            <p>💡 Pouco tempo? Coloque <strong class="text-base-secondary">20–30</strong> (~10 min de estudo). Quer estudar bastante? Deixe ilimitado.</p>
          </div>
        </div>

        <div class="card p-3 sm:p-5">
          <label class="text-title mb-3 block">Limite de tempo por sessão</label>
          <div class="mb-4">
            <UiSelect v-model="sessionTimeStr" :options="timeOptions" placeholder="Sem limite" />
          </div>
          <div class="text-small text-base-muted leading-relaxed space-y-2">
            <p>Define um cronômetro para sua sessão de estudo. Quando o tempo acabar, o app te avisa — mas não interrompe no meio de um card. Você escolhe se quer continuar ou parar.</p>
            <p>💡 Útil pra quem estuda no ônibus, no intervalo do trabalho, ou quer sessões curtas e focadas.</p>
          </div>
        </div>

        <button class="btn-primary" :disabled="savingSettings" @click="saveSettings">
          {{ savingSettings ? 'Salvando...' : 'Salvar configurações' }}
        </button>
      </div>
    </section>

    <!-- Conta -->
    <section class="card p-3 sm:p-5">
      <h2 class="text-headline mb-4">Conta</h2>
      <button class="btn-secondary text-danger" @click="handleLogout">
        <LogOut :size="16" /> Sair da conta
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Moon, Sun, LogOut } from 'lucide-vue-next'
import type { UserSettings } from '~/types'

const auth = useAuthStore()
const featureUsage = useFeatureUsage()
const { colorMode, set } = useColorMode()

const settingsFeatureLabels: Record<string, string> = {
  cards_ai: 'Cards IA',
  pdf_upload: 'Uploads PDF',
  agent_chat: 'Tirar dúvidas',
  podcast: 'Podcasts',
}

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

async function loadSettings() {
  try {
    const res = await $api<any>('/settings')
    Object.assign(settings, res.data)
  } catch {}
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await $api('/settings', { method: 'PUT', body: { ...settings } })
    toast.show('Configurações salvas!', 'success')
  } catch {
    toast.show('Erro ao salvar.', 'error')
  } finally {
    savingSettings.value = false
  }
}

function setMode(mode: 'light' | 'dark') {
  set(mode)
}

async function handleLogout() {
  try {
    const { $api } = useNuxtApp()
    await $api('/logout', { method: 'POST' })
  } catch {
    // Ignore — clear auth anyway
  }
  auth.clearAuth()
  toast.show('Até logo!', 'success')
  await navigateTo('/login')
}

onMounted(async () => {
  await loadSettings()
  featureUsage.fetchUsage()
  if (!auth.user && auth.token) {
    try {
      const { $api } = useNuxtApp()
      const res = await $api<any>('/me')
      auth.user = res.data
    } catch {
      // Token invalid
    }
  }
})
</script>
