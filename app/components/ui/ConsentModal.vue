<template>
  <UiDialog v-model="open" size="sm" title="Preferências de cookies">
    <div class="divide-y divide-line">
      <UiSwitch
        :model-value="true"
        label="Essenciais"
        description="Sessão, segurança (CSRF), preferência de tema e esta escolha. Sempre ativos."
        disabled
      />
      <UiSwitch
        v-model="draft"
        label="Análise de uso (PostHog)"
        description="Eventos de uso sem seu nome ou e-mail, para melhorar o produto."
        data-testid="consent-analytics-switch"
      />
    </div>
    <p class="mt-3 text-center text-label text-fg-muted">
      Detalhes na <NuxtLink to="/privacidade" class="underline" @click="open = false">Política de privacidade</NuxtLink>.
    </p>
    <template #footer>
      <UiButton variant="primary" type="button" block data-testid="consent-save" @click="save">Salvar preferências</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// "Personalizar" (prd-analytics-posthog RF-F03)
const open = defineModel<boolean>({ required: true })
const { analytics, set } = useConsent()

const draft = ref(analytics.value === true)
watch(open, (v) => { if (v) draft.value = analytics.value === true })

async function save() {
  open.value = false
  await set(draft.value)
}
</script>
