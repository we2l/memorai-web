<template>
  <div class="flex flex-col gap-6">
    <SettingsDataExport />

    <!-- Revoking stops PostHog right away (prd-analytics-posthog RF-F04) -->
    <div class="border-t border-line pt-3">
      <UiSwitch
        :model-value="consent.analytics.value === true"
        label="Estatísticas de uso anônimas"
        description="Eventos de uso sem seu nome ou e-mail (PostHog), para melhorar o Baigi. Desligar interrompe a coleta na hora."
        data-testid="analytics-switch"
        @update:model-value="consent.set($event)"
      />
    </div>

    <p class="text-meta text-fg-muted">
      Saiba como tratamos seus dados na <UiLink to="/privacidade" class="underline">Política de Privacidade</UiLink>
      e nos <UiLink to="/termos" class="underline">Termos de Uso</UiLink>.
    </p>

    <div class="flex flex-col items-start gap-2 border-t border-line pt-5" data-testid="danger-zone">
      <h3 class="text-body font-semibold text-danger">Excluir conta</h3>
      <p class="text-meta text-fg-muted">Apaga todos os seus dados de forma permanente.</p>
      <UiButton variant="danger" @click="showDelete = true">Excluir conta</UiButton>
    </div>

    <LazySettingsDeleteAccountModal v-if="deleteLoaded" v-model="showDelete" />
  </div>
</template>

<script setup lang="ts">
// "Seus dados" (prd-4g-conta-onboarding-v3 RF-F1): export, the anonymous statistics and the account deletion.
const consent = useConsent()
const showDelete = ref(false)
const deleteLoaded = useLoadedOnce(() => showDelete.value)
</script>
