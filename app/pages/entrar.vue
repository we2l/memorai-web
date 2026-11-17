<template>
  <AuthSplit headline="Seus cards de hoje estão te esperando." sub="Um lote leva uns 5 minutos." mascot="acenando">
    <h1>Bom te ver <span class="au-grifo">de novo.</span></h1>

    <p v-if="notice" role="status" class="rounded-control bg-warning-subtle px-3 py-2 text-meta text-fg-strong" data-testid="entrar-notice">{{ notice }}</p>

    <AuthGoogleButton variant="outline" size="lg" />

    <p class="au-or" aria-hidden="true">ou com e-mail</p>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <UiInput id="email" v-model="form.email" label="E-mail" type="email" autocomplete="email" inputmode="email" :error="errors.email" />
      <div class="flex flex-col gap-1">
        <AuthPasswordInput id="password" v-model="form.password" label="Senha" autocomplete="current-password" :error="errors.password" />
        <UiLink to="/esqueci-senha" class="self-end py-1 text-meta">Esqueci a senha</UiLink>
      </div>

      <p v-if="errors.general" role="alert" class="text-meta font-medium text-danger" data-testid="entrar-error">{{ errors.general }}</p>

      <UiButton variant="primary" size="lg" type="submit" block :loading="loading">Entrar</UiButton>
    </form>

    <p class="au-switch">
      Ainda não tem conta? <UiLink to="/criar-conta" class="underline">Criar conta grátis</UiLink>
    </p>

    <!-- Google from here can create the account: the acceptance stays, below the form and only for that case -->
    <p class="au-meta" data-testid="entrar-terms">
      Se você ainda não tem conta, entrar com o Google cria uma e você aceita os <UiLink to="/termos" class="underline">Termos</UiLink> e a <UiLink to="/privacidade" class="underline">Privacidade</UiLink>.
    </p>

    <template #extra>
      <!-- An example of a card, not the person's: decorative -->
      <div class="au-mock" aria-hidden="true">
        <p class="au-meta">Direito Constitucional · Art. 5º</p>
        <p class="au-mock-q">Qual o prazo do mandado de segurança?</p>
        <span class="au-chip">Lembrei · volta em 11 dias</span>
      </div>
    </template>
  </AuthSplit>
</template>

<script setup lang="ts">
// Login v4 (prd-4g-conta-onboarding-v3 RF-F12) in the skin of the landing (components/auth/Split.vue, 17/11). Prerendered: while hydrating, Nuxt takes the query out of the
// route and of the address and puts it back right after, so the notices follow the router (no flash, no mismatch).
import { loginErrorMessage } from '~/utils/authMessages'

definePageMeta({ layout: 'auth-split' })
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
