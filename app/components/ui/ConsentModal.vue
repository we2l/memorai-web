<template>
  <UiModal v-model="open" size="sm">
    <div class="p-5 sm:p-6">
      <h2 id="consent-modal-title" class="text-headline text-base-primary mb-4 pr-10">Preferências de cookies</h2>

      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <p id="consent-essential" class="text-base-primary font-medium">Essenciais</p>
            <p class="text-micro text-base-muted">Sessão, segurança (CSRF), preferência de tema e esta escolha. Sempre ativos.</p>
          </div>
          <button type="button" role="switch" aria-checked="true" aria-labelledby="consent-essential" disabled class="relative w-10 h-6 mt-0.5 rounded-full shrink-0 bg-[var(--color-accent-primary)] opacity-60 cursor-not-allowed">
            <span class="absolute top-0.5 left-[18px] w-5 h-5 rounded-full bg-white shadow" aria-hidden="true" />
          </button>
        </div>

        <div class="flex items-start gap-3">
          <div class="flex-1">
            <p id="consent-analytics" class="text-base-primary font-medium">Análise de uso (PostHog)</p>
            <p class="text-micro text-base-muted">Eventos de uso sem seu nome ou e-mail, para melhorar o produto.</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="draft"
            aria-labelledby="consent-analytics"
            class="relative w-10 h-6 mt-0.5 rounded-full shrink-0 transition-colors"
            :class="draft ? 'bg-[var(--color-accent-primary)]' : 'bg-[var(--border-hover)]'"
            data-testid="consent-analytics-switch"
            @click="draft = !draft"
          >
            <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="draft ? 'left-[18px]' : 'left-0.5'" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button type="button" class="btn-primary w-full justify-center mt-6" data-testid="consent-save" @click="save">Salvar preferências</button>
      <p class="text-micro text-base-muted mt-3 text-center">
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
