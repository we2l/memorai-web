<template>
  <UiSection data-testid="home-backlog" aria-label="Cards atrasados">
    <div class="flex items-center gap-3.5">
      <UiIconTile :icon="Hourglass" tone="streak" size="lg" />
      <div class="min-w-0">
        <p><UiNumber :value="fmt(cards)" :unit="cards === 1 ? 'card atrasado' : 'cards atrasados'" size="s" data-testid="home-backlog-count" /></p>
        <p class="mt-1 text-meta text-fg-muted">Sem pressa: dividimos pelos próximos dias.</p>
      </div>
    </div>

    <p class="mt-5 mb-2 text-body-sm font-semibold text-fg-strong">Recuperar em</p>
    <UiSegmented v-model="days" :options="OPTIONS" label="Recuperar em" data-testid="home-backlog-days" />

    <div class="mt-3 grid grid-cols-2 gap-3">
      <div class="rounded-tile bg-soft p-3.5">
        <UiNumber :value="fmt(perDay)" size="s" />
        <p class="mt-1.5 text-meta text-fg-muted">por dia, além dos de hoje</p>
      </div>
      <div class="rounded-tile bg-soft p-3.5">
        <UiNumber :value="minutes" unit="min" size="s" />
        <p class="mt-1.5 text-meta text-fg-muted">por dia, no total</p>
      </div>
    </div>

    <p class="mt-3 text-meta text-fg-muted">
      Os que você está mais perto de esquecer vêm primeiro.<template v-if="backlog.pause_new"> Os cards novos ficam pausados até zerar o atraso.</template>
    </p>

    <UiButton variant="primary" block class="mt-4" :loading="pending" data-testid="home-backlog-start" @click="start">Começar o plano · lote 1</UiButton>
  </UiSection>
</template>

<script setup lang="ts">
// The backlog on Hoje, E2 (prd-visual-e2 RF-3.7; prd-revisao-v5-fase-b RF-F2): "120 cards atrasados" with 3, 7 or 14
// days (UiSegmented), what it asks per day and "Começar o plano · lote 1". It makes the plan (POST /review/backlog-plan)
// and opens the first lote; once there is a plan, the card leaves and the plan is a line of the review step
// ("Recuperando o atraso · dia 1 de 7").
import { Hourglass } from 'lucide-vue-next'
import type { BacklogState } from '~/types'
import { backlogPerDay } from '~/composables/useBacklogPlan'

const props = defineProps<{ backlog: BacklogState; dueToday: number }>()

const OPTIONS = [3, 7, 14].map(d => ({ value: d, label: `${d} dias` }))
const days = ref<number>(7)

const cards = computed(() => props.backlog.overdue + (props.backlog.plan?.remaining ?? 0))
const perDay = computed(() => backlogPerDay(cards.value, days.value))
const minutes = computed(() => Math.max(1, cardsMinutes(perDay.value + props.dueToday)))

const { $api } = useNuxtApp()
const { run, pending } = useApiAction()
const { changed } = useBacklogPlan()

async function start() {
  const res = await run(() => $api<{ data: { backlog: BacklogState } }>('/review/backlog-plan', { method: 'POST', body: { days: days.value } }), {
    error: 'Não foi possível criar o plano.',
  })
  if (!res) return
  useAnalytics().track('backlog_plan_created', { days: days.value, cards: res.data.backlog.plan?.total ?? 0 })
  changed.value++
  await navigateTo('/revisar')
}

const fmt = (n: number) => n.toLocaleString('pt-BR')
</script>
