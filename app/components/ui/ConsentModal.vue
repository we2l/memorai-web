<template>
  <UiModal v-model="open" size="sm">
    <div class="p-5 sm:p-6">
      <h2 id="consent-modal-title" class="text-section text-fg-strong mb-4 pr-10">Preferências de cookies</h2>

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

      <UiButton variant="primary" type="button" block class="mt-6" data-testid="consent-save" @click="save">Salvar preferências</UiButton>
      <p class="text-label text-fg-muted mt-3 text-center">
        Detalhes na <NuxtLink to="/privacidade" class="underline" @click="open = false">Política de privacidade</NuxtLink>.
      </p>
    </div>
  </UiModal>
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
