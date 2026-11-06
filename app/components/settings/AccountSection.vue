<template>
  <div class="flex flex-col gap-6">
    <form class="flex max-w-sm flex-col gap-1" novalidate @submit.prevent="saveName">
      <UiInput
        id="profile-name"
        v-model="name"
        label="Nome"
        autocomplete="name"
        maxlength="80"
        :error="nameError || undefined"
        @blur="saveName"
      />
      <p class="min-h-5 text-meta text-success" role="status" data-testid="name-saved">{{ nameSaved ? 'Salvo' : '' }}</p>
    </form>

    <div class="flex flex-col gap-2">
      <p class="text-meta font-semibold text-fg-strong">E-mail</p>
      <p class="flex flex-wrap items-center gap-2 text-body break-all text-fg-strong">
        {{ auth.user?.email ?? '—' }}
        <UiTag v-if="auth.isVerified" tone="success">Confirmado</UiTag>
      </p>
      <UiVerifyEmailBanner v-if="auth.user && !auth.isVerified" inline />
      <p v-if="auth.user?.google_linked" class="text-meta text-fg-muted" data-testid="google-linked">Conta Google vinculada: você também entra com o Google.</p>
    </div>

    <div class="flex flex-col gap-2 border-t border-line pt-5">
      <h3 class="text-body font-semibold text-fg-strong">{{ hasPassword ? 'Trocar senha' : 'Definir senha' }}</h3>
      <SettingsPasswordForm />
    </div>
  </div>
</template>

<script setup lang="ts">
// "Conta e segurança" (prd-4g-conta-onboarding-v3 RF-F1): name (saves on leaving the field), e-mail with its
// verification state and "Reenviar", the linked Google account, password or "Definir senha" for a Google account.
const auth = useAuthStore()
const { run } = useApiAction()
const { saved: nameSaved, mark } = useSavedHint()

const hasPassword = computed(() => auth.user?.has_password !== false)
const name = ref(auth.user?.name ?? '')
const nameError = ref('')
watch(() => auth.user?.name, (n) => { if (n) name.value = n })

async function saveName() {
  nameError.value = ''
  const value = name.value.trim()
  if (value === (auth.user?.name ?? '')) return
  if (value.length < 2) {
    nameError.value = 'O nome precisa ter pelo menos 2 caracteres.'
    return
  }
  try {
    await run(() => auth.updateProfile(value), { error: false, rethrow: true })
    mark()
  } catch (e: any) {
    nameError.value = e?.data?.errors?.name?.[0] ?? extractApiMessage(e)
  }
}
</script>
