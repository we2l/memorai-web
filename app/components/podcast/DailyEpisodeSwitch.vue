<template>
  <div class="min-w-0" data-testid="daily-episode">
    <UiSwitch
      :model-value="on"
      label="Episódio da manhã"
      :description="isPro ? 'Quando houver erros de ontem, um episódio curto fica pronto às 7h. Usa 1 dos seus 5 do mês.' : 'No Pro: um episódio curto dos seus erros de ontem, pronto às 7h.'"
      :disabled="!isPro || loading || pending"
      @update:model-value="toggle"
    />
    <UiLink v-if="!isPro" to="/planos" class="text-meta">No Pro</UiLink>
  </div>
</template>

<script setup lang="ts">
// "Episódio da manhã" (prd-4e-praticar-v3 RF-F6, RF-B11): settings.daily_episode, only Pro can turn it on
// (the API answers 422 pro_only to Free). The switch says what it costs: 1 of the 5 episodes of the month.
import type { UserSettings } from '~/types'

const auth = useAuthStore()
const { $api } = useNuxtApp()
const isPro = computed(() => auth.user?.plan === 'pro')

const on = ref(false)
const loading = ref(true)
const { run, pending } = useApiAction()

onMounted(async () => {
  if (!isPro.value) {
    loading.value = false
    return
  }
  try {
    on.value = !!(await $api<{ data: UserSettings }>('/settings')).data.daily_episode
  } catch (e) {
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
})

async function toggle(value: boolean) {
  const before = on.value
  on.value = value
  const ok = await run(() => $api('/settings', { method: 'PUT', body: { daily_episode: value } }), {
    success: value ? 'Episódio da manhã ligado.' : 'Episódio da manhã desligado.',
    error: 'Não foi possível salvar. Tente de novo.',
  })
  if (ok === undefined) on.value = before
  else useAnalytics().track('daily_episode_toggle', { on: value })
}
</script>
