<template>
  <div>
    <div class="flex justify-center mb-4">
      <UiLogo :icon-size="36" text-class="text-page-title-sm lg:text-page-title text-fg-strong" />
    </div>
    <h1 class="text-fg-strong text-body font-semibold text-center mb-8">Criar nova senha</h1>

    <UiSection v-if="!token || !email || tokenInvalid" as="div" role="alert" class="text-center">
      <p class="text-fg-strong text-meta mb-3">
        {{ tokenInvalid ? 'Link expirado ou já usado.' : 'Link inválido.' }}
      </p>
      <NuxtLink to="/esqueci-senha" class="text-action-fg text-meta hover:underline">Pedir um novo link</NuxtLink>
    </UiSection>

    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <UiInput id="email" :model-value="email" label="E-mail" type="email" autocomplete="username" readonly />

      <UiInput
        id="password"
        v-model="password"
        label="Nova senha"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        minlength="8"
        :error="errors.password"
      >
        <template #suffix>
          <UiIconButton
            :icon="showPassword ? EyeOff : Eye"
            :label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
            :pressed="showPassword"
            size="sm"
            class="-mr-2"
            @click="showPassword = !showPassword"
          />
        </template>
      </UiInput>

      <UiInput
        id="password_confirmation"
        v-model="passwordConfirmation"
        label="Confirmar senha"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        :error="errors.password_confirmation"
      />

      <UiButton variant="primary" type="submit" block class="mt-2" :loading="loading">
        {{ loading ? 'Salvando...' : 'Redefinir senha' }}
      </UiButton>

      <p v-if="errors.general" role="alert" class="text-danger text-meta text-center">{{ errors.general }}</p>
    </form>

    <p class="text-meta text-center mt-6">
      <NuxtLink to="/entrar" class="text-action-fg hover:underline">Voltar para entrar</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

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
