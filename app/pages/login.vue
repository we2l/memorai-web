<template>
  <div>
    <h1 class="text-display text-accent-primary text-center mb-2">Memorai</h1>
    <p class="text-base-muted text-center mb-8">Faça login para continuar</p>

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
      <NuxtLink to="/register" class="text-accent-primary hover:underline">Criar conta</NuxtLink>
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

async function handleLogin() {
  Object.keys(errors).forEach(k => delete errors[k])
  loading.value = true

  try {
    const res = await $api<any>('/login', {
      method: 'POST',
      body: { ...form, device_name: 'web' },
    })
    auth.setAuth(res.data.user, res.data.token)
    await navigateTo('/dashboard')
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
