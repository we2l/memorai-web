<template>
  <div v-if="show" class="flex flex-col gap-0.5 text-meta text-fg-muted" data-testid="backlog-line">
    <!-- Inline text (no flex): the spaces between the words and the action are real text -->
    <p v-if="backlog.plan" data-testid="backlog-line-plan">
      <button type="button" :class="LINK" data-testid="backlog-line-open" @click="openSheet">Recuperando o atraso · dia {{ backlog.plan.day }} de {{ backlog.plan.days }}</button><template v-if="scope === 'caderno'"> de todos os cadernos</template>
    </p>
    <p v-else-if="count > 0" data-testid="backlog-line-overdue">
      {{ fmt(count) }} {{ count === 1 ? 'atrasado' : 'atrasados' }}{{ scope === 'caderno' ? ' neste caderno' : '' }} · <button type="button" :class="LINK" data-testid="backlog-line-open" @click="openSheet">Recuperar em 7 dias</button>
    </p>
    <p v-if="backlog.new_paused && showPaused" data-testid="backlog-line-paused">
      Novos pausados enquanto houver atraso <button type="button" :class="LINK" class="ml-1" :disabled="pending" data-testid="backlog-resume-new" @click="resumeNew">{{ pending ? 'Retomando…' : 'Retomar' }}</button>
    </p>
  </div>
</template>

<script setup lang="ts">
// The backlog in one line (prd-revisao-v5-fase-b RF-F1, RF-F3, RF-F4): never a big number next to "Revisar hoje", but
// "120 atrasados · Recuperar em 7 dias" (opens the plan sheet: 3, 7 or 14), or "Recuperando o atraso · dia 1 de 7" with a
// plan, and a quiet note on the paused new cards with "Retomar" on the same line (PUT /settings pause_new_on_backlog false).
// `count` is the scope's part (the caderno) or the person's overdue cards.
import type { BacklogState } from '~/types'
import type { BacklogOrigin } from '~/composables/useBacklogPlan'

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

const LINK = 'hit-touch rounded-tag font-semibold text-action-fg underline-offset-2 transition-colors duration-nav hover:text-action-hover hover:underline disabled:opacity-60'

const count = computed(() => props.count ?? (props.backlog.active ? props.backlog.overdue : 0))
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
