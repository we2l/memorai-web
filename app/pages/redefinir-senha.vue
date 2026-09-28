<template>
  <div>
    <div class="flex justify-center mb-4">
      <UiLogo :icon-size="36" text-class="text-display text-base-primary" />
    </div>
    <h1 class="text-base-primary text-lg font-semibold text-center mb-8">Criar nova senha</h1>

    <div v-if="!token || !email || tokenInvalid" role="alert" class="card p-5 text-center">
      <p class="text-base-primary text-small mb-3">
        {{ tokenInvalid ? 'Link expirado ou já usado.' : 'Link inválido.' }}
      </p>
      <NuxtLink to="/esqueci-senha" class="text-accent-primary text-small hover:underline">Pedir um novo link</NuxtLink>
    </div>

    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div>
        <label for="email" class="text-label mb-1 block">E-mail</label>
        <input id="email" :value="email" type="email" autocomplete="username" class="input-base" readonly />
      </div>

      <div>
        <label for="password" class="text-label mb-1 block">Nova senha</label>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            minlength="8"
            class="input-base pr-12"
            :aria-invalid="!!errors.password"
            :aria-describedby="errors.password ? 'password-error' : undefined"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-base-muted hover:text-base-primary rounded-lg"
            :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
          </button>
        </div>
        <p v-if="errors.password" id="password-error" role="alert" class="text-danger text-micro mt-1">{{ errors.password }}</p>
      </div>

      <div>
        <label for="password_confirmation" class="text-label mb-1 block">Confirmar senha</label>
        <input
          id="password_confirmation"
          v-model="passwordConfirmation"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          class="input-base"
          :aria-invalid="!!errors.password_confirmation"
          :aria-describedby="errors.password_confirmation ? 'confirmation-error' : undefined"
        />
        <p v-if="errors.password_confirmation" id="confirmation-error" role="alert" class="text-danger text-micro mt-1">{{ errors.password_confirmation }}</p>
      </div>

      <button type="submit" class="btn-primary w-full mt-2" :disabled="loading">
        {{ loading ? 'Salvando...' : 'Redefinir senha' }}
      </button>

      <p v-if="errors.general" role="alert" class="text-danger text-small text-center">{{ errors.general }}</p>
    </form>

    <p class="text-small text-center mt-6">
      <NuxtLink to="/entrar" class="text-accent-primary hover:underline">Voltar para entrar</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Redefinir senha — BAIGI' })

const { $api } = useNuxtApp()
const route = useRoute()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const email = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''))

const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const loading = ref(false)
const tokenInvalid = ref(false)
const errors = reactive<Record<string, string>>({})

async function submit() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (password.value.length < 8) errors.password = 'A senha precisa ter pelo menos 8 caracteres.'
  if (password.value !== passwordConfirmation.value) errors.password_confirmation = 'As senhas não conferem.'
  if (Object.keys(errors).length) return

  loading.value = true
  try {
    await $api('/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        email: email.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    })
    await navigateTo({ path: '/entrar', query: { senha_redefinida: '1' } })
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode
    const fieldErrors = e?.data?.errors || {}
    if (status === 422 && fieldErrors.email) {
      tokenInvalid.value = true
    } else if (status === 422 && fieldErrors.password) {
      errors.password = fieldErrors.password[0]
    } else if (status === 429) {
      errors.general = 'Muitas tentativas. Aguarde alguns minutos.'
    } else {
      errors.general = e?.data?.message || 'Não foi possível redefinir a senha.'
    }
  } finally {
    loading.value = false
  }
}
</script>
