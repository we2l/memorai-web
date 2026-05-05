<template>
  <div>
    <div class="flex justify-center mb-4">
      <UiLogo :icon-size="36" text-class="text-display text-base-primary" />
    </div>
    <p class="text-base-muted text-center mb-1">Volte para o seu estudo</p>
    <p class="text-micro text-base-muted text-center mb-10">Revise no tempo certo e pare de esquecer</p>

    <!-- Google OAuth -->
    <button
      type="button"
      class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface-secondary hover:bg-surface-tertiary transition-colors mb-8"
      :disabled="googleLoading"
      @click="loginWithGoogle"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      <span class="text-base-primary text-small font-medium">{{ googleLoading ? 'Redirecionando...' : 'Entrar com Google (1 clique)' }}</span>
    </button>

    <div class="flex items-center gap-3 mb-6">
      <div class="flex-1 h-px bg-border" />
      <span class="text-micro text-base-muted">ou entre com e-mail</span>
      <div class="flex-1 h-px bg-border" />
    </div>

    <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
      <div>
        <label for="email" class="text-label mb-1 block">E-mail</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="seu@email.com"
          class="input-base"
          :aria-invalid="!!errors.email"
          :aria-describedby="errors.email ? 'email-error' : undefined"
        />
        <p v-if="errors.email" id="email-error" role="alert" class="text-danger text-micro mt-1">{{ errors.email }}</p>
      </div>

      <div>
        <label for="password" class="text-label mb-1 block">Senha</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          placeholder="••••••••"
          class="input-base"
          :aria-invalid="!!errors.password"
          :aria-describedby="errors.password ? 'password-error' : undefined"
        />
        <p v-if="errors.password" id="password-error" role="alert" class="text-danger text-micro mt-1">{{ errors.password }}</p>
      </div>

      <button type="submit" class="btn-primary w-full mt-2" :disabled="loading">
        {{ loading ? 'Entrando...' : 'Entrar' }}
      </button>

      <p v-if="errors.general" role="alert" class="text-danger text-small text-center">{{ errors.general }}</p>
    </form>

    <p class="text-base-muted text-small text-center mt-6">
      Não tem conta?
      <NuxtLink to="/criar-conta" class="text-accent-primary hover:underline">Criar conta</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $api } = useNuxtApp()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const googleLoading = ref(false)

async function loginWithGoogle() {
  googleLoading.value = true
  try {
    const res = await $api<any>('/auth/google/redirect')
    window.location.href = res.data.url
  } catch {
    googleLoading.value = false
  }
}

async function handleLogin() {
  Object.keys(errors).forEach(k => delete errors[k])
  loading.value = true

  try {
    const res = await $api<any>('/login', {
      method: 'POST',
      body: { ...form, device_name: 'web' },
    })
    auth.setAuth(res.data.user, res.data.token)
    await navigateTo('/hoje')
  } catch (e: any) {
    const data = e.data
    if (data?.errors) {
      Object.entries(data.errors).forEach(([k, v]: any) => { errors[k] = v[0] })
    } else {
      errors.general = data?.message || 'Erro ao fazer login.'
    }
  } finally {
    loading.value = false
  }
}
</script>
