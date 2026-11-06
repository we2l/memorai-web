<template>
  <p v-if="busy" class="flex items-center gap-x-2 text-meta text-fg-muted" aria-live="polite" data-testid="material-cards-state">
    <UiSpinner size="sm" />
    <span>Criando os cards das primeiras partes…</span>
  </p>
  <p v-else-if="problem" class="flex flex-wrap items-center gap-x-2 text-meta text-fg-muted" data-testid="material-cards-state">
    <span>{{ problem.text }}</span>
    <button v-if="problem.action" type="button" class="min-h-touch font-medium text-action-fg underline underline-offset-2" :disabled="pending" @click="act">{{ problem.action }}</button>
  </p>
</template>

<script setup lang="ts">
// The automatic cards of a PDF, per part, in its line (prd-4c-material-v3 RF-B9): being made, or why they did not
// come and the way out. Apart and lazy: most lines have nothing to say, and the hub has no room in its budget.
import type { MaterialRow } from '~/types'

const props = defineProps<{ row: MaterialRow }>()

const store = useScopeStore()
const { run, pending } = useApiAction()

const busy = computed(() => props.row.auto_cards_status === 'pending' || props.row.auto_cards_status === 'generating')
const problem = computed<{ text: string; action?: string } | null>(() => {
  if (props.row.cards) return null
  if (props.row.auto_cards_status === 'skipped_quota') return { text: `Sem gerações de cards ${useAuthStore().onTrial ? 'no teste' : 'este mês'}`, action: 'Ver planos' }
  if (props.row.auto_cards_status === 'skipped_empty') return { text: 'Texto curto demais para gerar cards' }
  if (props.row.auto_cards_status === 'failed') return { text: 'Não conseguimos criar os cards', action: 'Tentar de novo' }
  return null
})

async function act() {
  if (props.row.auto_cards_status === 'skipped_quota') {
    window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: { feature: 'cards_ai', planRequired: 'pro' } }))
    return
  }
  const ok = await run(() => useNuxtApp().$api(`/documents/${props.row.id}/generate-cards`, { method: 'POST' }), { error: 'Não foi possível criar os cards agora.' })
  if (ok !== undefined) store.patchRow('pdf', props.row.id, { auto_cards_status: 'pending' })
}
</script>
