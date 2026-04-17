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

const auth = useAuthStore()
const { colorMode, set } = useColorMode()
const toast = useToast()

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
