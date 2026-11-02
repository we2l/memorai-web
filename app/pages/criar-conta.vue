<template>
  <div>
    <div class="flex justify-center mb-4">
      <UiLogo :icon-size="36" text-class="text-page-title-sm lg:text-page-title text-fg-strong" />
    </div>
    <p class="text-fg-muted text-center mb-1">Comece a memorizar de verdade</p>
    <p class="text-label text-fg-muted text-center mb-10">Leva menos de 1 minuto</p>

    <!-- Google OAuth -->
    <button
      type="button"
      class="w-full flex items-center justify-center gap-3 px-4 py-3 min-h-touch rounded-control border border-line-strong bg-subtle hover:bg-line transition-colors mb-8"
      :disabled="googleLoading"
      @click="registerWithGoogle"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      <span class="text-fg-strong text-meta font-medium">{{ googleLoading ? 'Redirecionando...' : 'Começar com Google (1 clique)' }}</span>
    </button>
    <p class="text-label text-fg-muted text-center -mt-6 mb-8">
      Ao continuar você aceita os <NuxtLink to="/termos" class="underline">Termos</NuxtLink> e a <NuxtLink to="/privacidade" class="underline">Privacidade</NuxtLink>.
    </p>

    <div class="flex items-center gap-3 mb-6">
      <div class="flex-1 h-px bg-line" />
      <span class="text-label text-fg-muted">ou entre com e-mail</span>
      <div class="flex-1 h-px bg-line" />
    </div>

    <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
      <UiInput id="name" v-model="form.name" label="Nome" autocomplete="name" placeholder="Seu nome" :error="errors.name" />
      <UiInput id="email" v-model="form.email" label="E-mail" type="email" autocomplete="email" placeholder="seu@email.com" :error="errors.email" />
      <UiInput id="password" v-model="form.password" label="Senha" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" :error="errors.password" />
      <UiInput id="password_confirmation" v-model="form.password_confirmation" label="Confirmar senha" type="password" autocomplete="new-password" placeholder="Repita a senha" />

      <div>
        <UiCheckbox
          id="accept_terms"
          v-model="form.accept_terms"
          :aria-invalid="errors.accept_terms ? 'true' : undefined"
          :aria-describedby="errors.accept_terms ? 'accept-terms-error' : undefined"
        >
          Li e aceito os <NuxtLink to="/termos" target="_blank" class="text-action-fg underline">Termos de Uso</NuxtLink>
          e a <NuxtLink to="/privacidade" target="_blank" class="text-action-fg underline">Política de Privacidade</NuxtLink>.
        </UiCheckbox>
        <p v-if="errors.accept_terms" id="accept-terms-error" role="alert" class="text-danger text-label">{{ errors.accept_terms }}</p>
      </div>

      <UiButton variant="primary" type="submit" block class="mt-2" :loading="loading">
        {{ loading ? 'Criando...' : 'Criar conta' }}
      </UiButton>

      <p v-if="errors.general" role="alert" class="text-danger text-meta text-center">{{ errors.general }}</p>
    </form>

    <p class="text-fg-muted text-meta text-center mt-6">
      Já tem conta?
      <NuxtLink to="/entrar" class="text-action-fg hover:underline">Entrar</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const route = useRoute()

const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  accept_terms: false,
})
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const googleLoading = ref(false)

async function registerWithGoogle() {
  googleLoading.value = true
  try {
    // The OAuth state is kept in the API session: make sure it exists first.
    await ensureCsrfCookie()
    const res = await $api<any>('/auth/google/redirect')
    window.location.href = res.data.url
  } catch {
    googleLoading.value = false
  }
}

async function handleRegister() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.accept_terms) {
    errors.accept_terms = 'Para criar a conta, aceite os Termos e a Política de Privacidade.'
    return
  }
  loading.value = true

  try {
    // Banner choice made before the account existed (RF-B04)
    await auth.register({ ...form, ...useConsent().signupPayload() })
    await navigateTo(postAuthRedirect(auth.user, route.query.redirect))
  } catch (e: any) {
    const data = e.data
    if ((e.status ?? e.statusCode) === 429) {
      errors.general = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    } else if (data?.errors) {
      Object.entries(data.errors).forEach(([k, v]: any) => { errors[k] = v[0] })
    } else {
      errors.general = data?.message || 'Erro ao criar conta.'
    }
  } finally {
    loading.value = false
  }
}
</script>
