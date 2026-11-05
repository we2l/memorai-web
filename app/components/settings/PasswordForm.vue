<template>
  <form v-if="hasPassword" class="flex max-w-sm flex-col gap-3" novalidate @submit.prevent="submit">
    <UiInput
      v-for="f in fields"
      :id="`pw-${f.key}`"
      :key="f.key"
      v-model="form[f.key]"
      :label="f.label"
      :type="show ? 'text' : 'password'"
      :autocomplete="f.key === 'current_password' ? 'current-password' : 'new-password'"
      :hint="f.key === 'password' ? 'Pelo menos 8 caracteres' : undefined"
      :error="errors[f.key]"
    />
    <UiCheckbox v-model="show" label="Mostrar senhas" />
    <div>
      <UiButton type="submit" :loading="pending" :disabled="!canSubmit">Trocar senha</UiButton>
    </div>
  </form>
  <div v-else class="flex flex-col items-start gap-3">
    <p class="text-meta text-fg">Você entra com o Google. Para também entrar com e-mail e senha, defina uma senha pelo link que enviamos por e-mail.</p>
    <UiButton to="/esqueci-senha">Definir senha por e-mail</UiButton>
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

const canSubmit = computed(() => !!form.current_password && form.password.length >= 8 && !!form.password_confirmation)

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
