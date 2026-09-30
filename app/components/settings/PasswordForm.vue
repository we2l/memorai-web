<template>
  <div>
    <template v-if="hasPassword">
      <form class="space-y-3 max-w-sm" novalidate @submit.prevent="submit">
        <div v-for="f in fields" :key="f.key">
          <label :for="`pw-${f.key}`" class="text-label mb-1 block">{{ f.label }}</label>
          <div class="relative">
            <input
              :id="`pw-${f.key}`"
              v-model="form[f.key]"
              :type="show ? 'text' : 'password'"
              class="input-base w-full pr-12"
              :autocomplete="f.key === 'current_password' ? 'current-password' : 'new-password'"
              :aria-invalid="!!errors[f.key]"
              :aria-describedby="[errors[f.key] ? `pw-${f.key}-error` : '', f.key === 'password' ? 'pw-rules' : ''].filter(Boolean).join(' ') || undefined"
            />
          </div>
          <p v-if="f.key === 'password'" id="pw-rules" class="text-micro mt-1" :class="form.password.length >= 8 ? 'text-[var(--badge-success-text)]' : 'text-base-muted'">
            Pelo menos 8 caracteres
          </p>
          <p v-if="errors[f.key]" :id="`pw-${f.key}-error`" class="text-micro text-[var(--badge-danger-text)] mt-1">{{ errors[f.key] }}</p>
        </div>
        <label class="flex items-center gap-2 text-small text-base-secondary cursor-pointer">
          <input v-model="show" type="checkbox" class="w-4 h-4 accent-[var(--color-accent-primary)]" />
          Mostrar senhas
        </label>
        <button type="submit" class="btn-primary" :disabled="pending || !canSubmit">
          {{ pending ? 'Salvando...' : 'Trocar senha' }}
        </button>
      </form>
    </template>
    <template v-else>
      <p class="text-small text-base-secondary mb-3">Você entra com Google. Para também entrar com e-mail e senha, defina uma senha pelo link que enviamos por e-mail.</p>
      <NuxtLink to="/esqueci-senha" class="btn-secondary">Definir senha por e-mail</NuxtLink>
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
