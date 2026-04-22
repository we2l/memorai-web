<template>
  <div>
    <h1 class="text-display text-accent-primary text-center mb-2">Memorai</h1>
    <p class="text-base-muted text-center mb-8">Crie sua conta gratuita</p>

    <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
      <div>
        <label for="name" class="text-label mb-1 block">Nome</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          placeholder="Seu nome"
          class="input-base"
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? 'name-error' : undefined"
        />
        <p v-if="errors.name" id="name-error" role="alert" class="text-danger text-micro mt-1">{{ errors.name }}</p>
      </div>

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
          placeholder="Mínimo 8 caracteres"
          class="input-base"
          :aria-invalid="!!errors.password"
          :aria-describedby="errors.password ? 'password-error' : undefined"
        />
        <p v-if="errors.password" id="password-error" role="alert" class="text-danger text-micro mt-1">{{ errors.password }}</p>
      </div>

      <div>
        <label for="password_confirmation" class="text-label mb-1 block">Confirmar senha</label>
        <input
          id="password_confirmation"
          v-model="form.password_confirmation"
          type="password"
          placeholder="Repita a senha"
          class="input-base"
        />
      </div>

      <button type="submit" class="btn-primary w-full mt-2" :disabled="loading">
        {{ loading ? 'Criando...' : 'Criar conta' }}
      </button>

      <p v-if="errors.general" role="alert" class="text-danger text-small text-center">{{ errors.general }}</p>
    </form>

    <p class="text-base-muted text-small text-center mt-6">
      Já tem conta?
      <NuxtLink to="/login" class="text-accent-primary hover:underline">Entrar</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $api } = useNuxtApp()
const auth = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const errors = reactive<Record<string, string>>({})
const loading = ref(false)

async function handleRegister() {
  Object.keys(errors).forEach(k => delete errors[k])
  loading.value = true

  try {
    const res = await $api<any>('/register', {
      method: 'POST',
      body: { ...form, device_name: 'web' },
    })
    auth.setAuth(res.data.user, res.data.token)
    await navigateTo('/today')
  } catch (e: any) {
    const data = e.data
    if (data?.errors) {
      Object.entries(data.errors).forEach(([k, v]: any) => { errors[k] = v[0] })
    } else {
      errors.general = data?.message || 'Erro ao criar conta.'
    }
  } finally {
    loading.value = false
  }
}
</script>
