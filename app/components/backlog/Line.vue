<template>
  <div v-if="show" class="flex flex-col gap-1 text-meta text-fg-muted" data-testid="backlog-line">
    <p v-if="backlog.plan" data-testid="backlog-line-plan">
      Recuperando o atraso{{ scopeLabel }} · dia {{ backlog.plan.day }} de {{ backlog.plan.days }} · faltam {{ fmt(backlog.plan.remaining) }} ·
      <button type="button" class="hit-touch rounded-tag font-semibold text-action-fg underline-offset-2 transition-colors duration-nav hover:text-action-hover hover:underline" data-testid="backlog-line-open" @click="openSheet">Mudar</button>
    </p>
    <p v-else-if="count > 0" data-testid="backlog-line-overdue">
      Atraso{{ scopeLabel }}: {{ fmt(count) }} {{ count === 1 ? 'card' : 'cards' }} ·
      <button type="button" class="hit-touch rounded-tag font-semibold text-action-fg underline-offset-2 transition-colors duration-nav hover:text-action-hover hover:underline" data-testid="backlog-line-open" @click="openSheet">Recuperar em dias</button>
    </p>
    <p v-if="backlog.new_paused && showPaused" class="flex flex-wrap items-center gap-1" data-testid="backlog-line-paused">
      Novos pausados enquanto houver atraso ·
      <UiButton variant="ghost" size="sm" :loading="pending" data-testid="backlog-resume-new" @click="resumeNew">Retomar novos</UiButton>
    </p>
  </div>
</template>

<script setup lang="ts">
// The backlog in one line (prd-revisao-v5-fase-b RF-F1, RF-F3, RF-F4): never a big number next to "Revisar hoje", but
// "Atraso: 340 cards · Recuperar em dias" (opens the plan sheet), or the plan on its way, and the paused new cards with
// "Retomar novos" (PUT /settings pause_new_on_backlog false). `count` is the scope's part (the caderno) or the overdue.
import type { BacklogState } from '~/types'

const props = withDefaults(defineProps<{
  backlog: BacklogState
  /** The overdue cards of this scope (the caderno's session.backlog); default the person's */
  count?: number
  /** " neste caderno" on a caderno */
  scope?: 'caderno' | null
  origin: BacklogOrigin
  showPaused?: boolean
}>(), { count: undefined, scope: null, showPaused: true })
const emit = defineEmits<{ (e: 'changed'): void }>()

type BacklogOrigin = import('~/composables/useBacklogPlan').BacklogOrigin

const count = computed(() => props.count ?? (props.backlog.active ? props.backlog.overdue : 0))
const scopeLabel = computed(() => (props.scope === 'caderno' ? (props.backlog.plan ? ' de todos os cadernos' : ' neste caderno') : ''))
const show = computed(() => !!props.backlog.plan || count.value > 0 || (props.backlog.new_paused && props.showPaused))

const sheet = useBacklogPlan()
function openSheet() {
  sheet.show(props.backlog, props.origin)
}

const auth = useAuthStore()
const { $api } = useNuxtApp()
const { run, pending } = useApiAction()
async function resumeNew() {
  const res = await run(() => $api('/settings', { method: 'PUT', body: { pause_new_on_backlog: false } }), {
    success: 'Os cards novos voltaram. Dá para pausar de novo em Configurações.',
    error: 'Não foi possível retomar os novos.',
  })
  if (res === undefined) return
  if (auth.user) auth.user.pause_new_on_backlog = false
  useAnalytics().track('backlog_new_resumed', { origin: props.origin })
  sheet.changed.value++
  emit('changed')
}

const fmt = (n: number) => n.toLocaleString('pt-BR')
</script>
