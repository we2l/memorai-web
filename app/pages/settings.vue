<template>
  <div class="p-6 max-w-2xl mx-auto">
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
          <span class="inline-block px-3 py-1 rounded-full text-micro font-medium bg-accent-primary-subtle text-accent-primary">
            {{ auth.user?.plan ?? 'free' }}
          </span>
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
    <section class="card p-5 mb-6">
      <h2 class="text-headline mb-1">Sessão de Estudo</h2>
      <p class="text-micro text-base-muted mb-4">Controle a carga diária de revisão para evitar sobrecarga.</p>

      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-label">Novos cards por dia</label>
            <label class="flex items-center gap-1.5 text-micro text-base-muted cursor-pointer">
              <input type="checkbox" :checked="settings.daily_new_cards_limit === null" @change="settings.daily_new_cards_limit = ($event.target as HTMLInputElement).checked ? null : 20" class="accent-[#522A6F]" />
              Ilimitado
            </label>
          </div>
          <input v-if="settings.daily_new_cards_limit !== null" v-model.number="settings.daily_new_cards_limit" type="number" min="1" max="999" class="input-base w-32" />
          <p class="text-micro text-base-muted mt-1">Cada novo card gera ~7-10 revisões no mês seguinte.</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-label">Máximo de revisões por dia</label>
            <label class="flex items-center gap-1.5 text-micro text-base-muted cursor-pointer">
              <input type="checkbox" :checked="settings.daily_review_limit === null" @change="settings.daily_review_limit = ($event.target as HTMLInputElement).checked ? null : 100" class="accent-[#522A6F]" />
              Ilimitado
            </label>
          </div>
          <input v-if="settings.daily_review_limit !== null" v-model.number="settings.daily_review_limit" type="number" min="1" max="9999" class="input-base w-32" />
        </div>

        <div>
          <label class="text-label mb-1 block">Limite de tempo por sessão</label>
          <UiSelect v-model="sessionTimeStr" :options="timeOptions" placeholder="Sem limite" />
        </div>

        <button class="btn-primary !py-1.5 !px-4 !min-h-0 !text-small" :disabled="savingSettings" @click="saveSettings">
          {{ savingSettings ? 'Salvando...' : 'Salvar configurações' }}
        </button>
      </div>
    </section>

    <!-- Conta -->
    <section class="card p-5">
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
const { colorMode, set } = useColorMode()
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
