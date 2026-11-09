<template>
  <div class="flex flex-col gap-5">
    <h1 class="text-page-title text-fg-strong">Entrar no Baigi</h1>

    <p v-if="notice" role="status" class="rounded-control bg-warning-subtle px-3 py-2 text-meta text-fg-strong" data-testid="entrar-notice">{{ notice }}</p>

    <div class="flex flex-col gap-2">
      <AuthGoogleButton />
      <p class="text-label text-fg-muted">
        Ao continuar você aceita os <UiLink to="/termos" class="underline">Termos</UiLink> e a <UiLink to="/privacidade" class="underline">Privacidade</UiLink>.
      </p>
    </div>

    <div class="flex items-center gap-3" aria-hidden="true">
      <span class="h-px flex-1 bg-line" />
      <span class="text-label text-fg-muted">ou</span>
      <span class="h-px flex-1 bg-line" />
    </div>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <UiInput id="email" v-model="form.email" label="E-mail" type="email" autocomplete="email" inputmode="email" :error="errors.email" />
      <div class="flex flex-col gap-1">
        <AuthPasswordInput id="password" v-model="form.password" label="Senha" autocomplete="current-password" :error="errors.password" />
        <UiLink to="/esqueci-senha" class="self-end py-1 text-meta">Esqueci a senha</UiLink>
      </div>

      <p v-if="errors.general" role="alert" class="text-meta font-medium text-danger" data-testid="entrar-error">{{ errors.general }}</p>

      <UiButton variant="primary" type="submit" block :loading="loading">Entrar</UiButton>
    </form>

    <p class="text-meta text-fg-muted">
      Ainda não tem conta? <UiLink to="/criar-conta" class="underline">Criar conta</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// Login v4 (prd-4g-conta-onboarding-v3 RF-F12). Prerendered: while hydrating, Nuxt takes the query out of the
// route and of the address and puts it back right after, so the notices follow the router (no flash, no mismatch).
import { loginErrorMessage } from '~/utils/authMessages'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Entrar · Baigi' })

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const query = computed(() => router.currentRoute.value.query)
const notice = computed(() => (query.value.verificacao === 'expirada' ? 'O link de confirmação expirou. Entre para receber outro.' : ''))

async function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!form.email.trim()) errors.email = 'Informe seu e-mail.'
  if (!form.password) errors.password = 'Informe sua senha.'
  if (errors.email || errors.password) return

  loading.value = true
  try {
    await auth.login(form.email.trim(), form.password)
    // Full page load: no memory of a previous account on this tab (utils/accountState.ts); the button stays busy
    reloadTo(postAuthRedirect(auth.user, query.value.redirect))
  } catch (e) {
    errors.general = loginErrorMessage(e)
    loading.value = false
  }
}

// Immediate: coming from /redefinir-senha the query is already there on setup
watch(() => query.value.senha_redefinida, (done) => {
  if (done && import.meta.client) toast.show('Senha redefinida. Entre com a nova senha.', 'success', 5000)
}, { immediate: true })

onMounted(() => {
  try {
    if (sessionStorage.getItem('relogin')) {
      sessionStorage.removeItem('relogin')
      toast.show('Atualizamos a segurança do login. Entre novamente.', 'info', 5000)
    }
  } catch { /* intencional: sessionStorage indisponível */ }
})
</script>
