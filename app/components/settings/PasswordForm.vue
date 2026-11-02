<template>
  <div>
    <template v-if="hasPassword">
      <form class="space-y-3 max-w-sm" novalidate @submit.prevent="submit">
        <div v-for="f in fields" :key="f.key">
          <UiInput
            :id="`pw-${f.key}`"
            v-model="form[f.key]"
            :label="f.label"
            :type="show ? 'text' : 'password'"
            :autocomplete="f.key === 'current_password' ? 'current-password' : 'new-password'"
            :error="errors[f.key]"
            :aria-describedby="f.key === 'password' ? 'pw-rules' : undefined"
          />
          <p v-if="f.key === 'password'" id="pw-rules" class="text-label mt-1" :class="form.password.length >= 8 ? 'text-success' : 'text-fg-muted'">
            Pelo menos 8 caracteres
          </p>
        </div>
        <UiCheckbox v-model="show" label="Mostrar senhas" />
        <UiButton variant="primary" type="submit" :loading="pending" :disabled="!canSubmit">
          {{ pending ? 'Salvando...' : 'Trocar senha' }}
        </UiButton>
      </form>
    </template>
    <template v-else>
      <p class="text-meta text-fg mb-3">Você entra com Google. Para também entrar com e-mail e senha, defina uma senha pelo link que enviamos por e-mail.</p>
      <UiButton variant="secondary" to="/esqueci-senha">Definir senha por e-mail</UiButton>
    </template>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()
const { $api } = useNuxtApp()
const { run, pending } = useApiAction()

const hasPassword = computed(() => auth.user?.has_password !== false)
const show = ref(false)
const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const errors = reactive<Record<string, string>>({})
const fields = [
  { key: 'current_password', label: 'Senha atual' },
  { key: 'password', label: 'Nova senha' },
  { key: 'password_confirmation', label: 'Confirmar nova senha' },
] as const

const canSubmit = computed(() => form.current_password && form.password.length >= 8 && form.password_confirmation)

async function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (form.password !== form.password_confirmation) {
    errors.password_confirmation = 'As senhas não conferem.'
    return
  }
  try {
    await run(() => $api('/user/password', { method: 'PUT', body: { ...form } }), {
      success: 'Senha alterada. As outras sessões foram encerradas.',
      error: false,
      rethrow: true,
    })
    form.current_password = ''
    form.password = ''
    form.password_confirmation = ''
  } catch (e: any) {
    const fieldErrors = e?.data?.errors
    if (fieldErrors) {
      for (const [k, v] of Object.entries(fieldErrors)) errors[k] = (v as string[])[0] ?? ''
    } else {
      reportApiError(e)
    }
  }
}
</script>
