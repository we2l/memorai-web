<template>
  <UiSheet v-model="open" :title="plan ? 'Plano de recuperação' : 'Recuperar o atraso'" :description="description" size="md">
    <div class="flex flex-col gap-4" data-testid="backlog-sheet">
      <template v-if="plan">
        <p class="text-body text-fg" data-testid="backlog-plan-status">
          Dia {{ plan.day }} de {{ plan.days }} · faltam {{ fmt(plan.remaining) }} {{ plan.remaining === 1 ? 'card' : 'cards' }}<template v-if="plan.today"> · {{ fmt(plan.today) }} hoje</template>
        </p>
        <p v-if="(state?.overdue ?? 0) > 0" class="text-meta text-fg-muted">
          {{ fmt(state!.overdue) }} ficaram de dias que passaram. Refazer o plano junta tudo de novo.
        </p>
      </template>

      <UiRadioGroup
        v-model="days"
        :label="plan ? 'Refazer em' : 'Recuperar em'"
        :options="options"
        variant="cards"
        :columns="3"
        data-testid="backlog-days"
      />
      <p class="text-meta text-fg-muted">Os que você está mais perto de esquecer vêm primeiro. Nada muda na memória dos cards: só o dia em que voltam.</p>
      <p v-if="state?.pause_new" class="text-meta text-fg-muted">Enquanto houver atraso, os cards novos ficam pausados.</p>
    </div>

    <template #footer>
      <div class="flex w-full flex-col gap-2">
        <UiButton variant="primary" block :loading="pending" data-testid="backlog-start" @click="start">
          {{ plan ? `Refazer em ${days} dias` : 'Começar o plano' }}
        </UiButton>
        <div class="flex flex-wrap justify-center gap-2">
          <UiButton v-if="(state?.overdue ?? 0) > 0" variant="ghost" size="sm" to="/revisar?backlog=1" data-testid="backlog-now" @click="open = false">Revisar o atraso agora</UiButton>
          <UiButton v-if="plan" variant="ghost" size="sm" :loading="cancelling" data-testid="backlog-cancel" @click="cancel">Cancelar o plano</UiButton>
        </div>
      </div>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
// The backlog plan (prd-revisao-v5-fase-b RF-F2): 3, 7 (default) or 14 days, with the share per day under each; the API
// spreads the overdue cards by retrievability (the closest to being forgotten first) and keeps S and D (B-D2, B-D3).
// "Revisar o atraso agora" opens the session of the backlog alone; with a plan, "Cancelar o plano" gives the cards their
// original day back. Errors and success through useApiAction.
import type { BacklogState } from '~/types'
import type { RadioOption } from '~/components/ui/RadioGroup.vue'
import { backlogPerDay } from '~/composables/useBacklogPlan'

const { open, state, changed } = useBacklogPlan()
const { $api } = useNuxtApp()
const { track } = useAnalytics()

const plan = computed(() => state.value?.plan ?? null)
const cards = computed(() => (state.value?.overdue ?? 0) + (plan.value?.remaining ?? 0))
const days = ref('7')
watch(open, (o) => { if (o) days.value = String(plan.value?.days ?? 7) })

const options = computed<RadioOption[]>(() => [3, 7, 14].map(d => ({
  value: String(d),
  label: `${d} dias`,
  description: `~${fmt(backlogPerDay(cards.value, d))} por dia, além dos de hoje`,
})))
const description = computed(() => `${fmt(cards.value)} ${cards.value === 1 ? 'card atrasado' : 'cards atrasados'}, divididos pelos próximos dias.`)

const { run, pending } = useApiAction()
const { run: runCancel, pending: cancelling } = useApiAction()
async function start() {
  const res = await run(() => $api<{ data: { backlog: BacklogState } }>('/review/backlog-plan', { method: 'POST', body: { days: Number(days.value) } }), {
    success: `Plano de ${days.value} dias criado`,
    error: 'Não foi possível criar o plano.',
  })
  if (!res) return
  track('backlog_plan_created', { days: Number(days.value), cards: res.data.backlog.plan?.total ?? 0 })
  state.value = res.data.backlog
  changed.value++
  open.value = false
}
async function cancel() {
  try {
    await runCancel(() => $api('/review/backlog-plan', { method: 'DELETE' }), { success: 'Plano cancelado', error: 'Não foi possível cancelar o plano.', rethrow: true })
  } catch {
    return // intencional: o erro já virou toast pelo useApiAction
  }
  track('backlog_plan_cancelled', {})
  changed.value++
  open.value = false
}

const fmt = (n: number) => n.toLocaleString('pt-BR')
</script>
