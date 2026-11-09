<template>
  <div v-if="suggestion" class="w-full rounded-card bg-soft px-4 py-3 text-left" data-testid="retention-hint">
    <p class="text-meta text-fg">
      Você tem {{ suggestion.overdue_count.toLocaleString('pt-BR') }} atrasados. Baixar a meta de lembrança de {{ pct(suggestion.current_retention) }} para {{ pct(suggestion.suggested_retention) }} tira cerca de {{ suggestion.cards_eliminated.toLocaleString('pt-BR') }} da fila.
    </p>
    <div class="mt-2 flex flex-wrap gap-2">
      <UiButton size="sm" :loading="applying" data-testid="retention-apply" @click="apply">Ajustar</UiButton>
      <UiButton size="sm" variant="ghost" :disabled="applying" data-testid="retention-dismiss" @click="dismiss">Agora não</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Retention suggestion at the end of the session (prd-4d-revisao-v3 RF-F7; it left Hoje in the 4a): asked
// once the session ends (never at a batch end), said with the size of the problem; "Ajustar" applies it and
// "Agora não" dismisses it. The GET has no side effect: only these two answers open the 7 days.
interface Suggestion { has_suggestion: boolean; current_retention: number; suggested_retention: number; cards_eliminated: number; overdue_count: number }

const { $api } = useNuxtApp()
const { run, pending: applying } = useApiAction()
const { track } = useAnalytics()
const suggestion = ref<Suggestion | null>(null)

const pct = (v: number) => `${Math.round(v * 100)}%`

onMounted(async () => {
  try {
    const res = await $api<{ data: Suggestion }>('/review/retention-suggestion')
    if (res.data?.has_suggestion) suggestion.value = res.data
  } catch (e) {
    reportApiError(e, { silent: true })
  }
})

async function apply() {
  const s = suggestion.value
  if (!s) return
  const ok = await run(() => $api('/review/apply-retention', { method: 'POST', body: { desired_retention: s.suggested_retention } }), {
    success: `Retenção ajustada para ${pct(s.suggested_retention)}`,
    error: 'Não foi possível ajustar agora.',
  })
  if (ok === undefined) return
  suggestion.value = null
  track('retention_suggestion', { action: 'apply' })
}

async function dismiss() {
  suggestion.value = null
  track('retention_suggestion', { action: 'dismiss' })
  try {
    await $api('/review/retention-suggestion/dismiss', { method: 'POST' })
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}
</script>
