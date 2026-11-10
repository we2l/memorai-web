<template>
  <div
    v-if="show"
    role="status"
    class="px-gutter py-2.5 text-meta"
    :class="offline.offline ? 'bg-warning-subtle text-fg-strong' : 'bg-soft text-fg'"
    data-testid="offline-bar"
  >
    <div class="mx-auto flex max-w-page flex-wrap items-center gap-x-3 gap-y-1">
      <template v-if="offline.offline">
        <WifiOff class="size-4 shrink-0" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          Sem internet: suas revisões ficam salvas e sobem quando voltar a conexão.
          <span v-if="offline.pending" class="font-semibold" data-testid="offline-pending">{{ plural(offline.pending, 'avaliação', 'avaliações') }} para enviar.</span>
          <span v-if="lastSync" class="text-fg-muted">Última sincronização às {{ lastSync }}.</span>
        </span>
        <UiLink v-if="offerLot" to="/revisar" standalone data-testid="offline-saved-lot">Revisar o lote salvo</UiLink>
      </template>
      <template v-else>
        <UiSpinner size="sm" />
        <span>Enviando {{ plural(offline.pending, 'avaliação', 'avaliações') }}…</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// Offline review state (prd-revisao-offline RF-F6): without network, what waits to be sent and the last sync, with
// "Revisar o lote salvo" outside the review; with network and a queue left from offline, "Enviando N avaliações…".
// The toast "Avaliações sincronizadas" comes from stores/offline. Off with the kill switch (RF-F10).
import { WifiOff } from 'lucide-vue-next'

const offline = useOfflineStore()
const route = useRoute()

const show = computed(() => offline.enabled && (offline.offline || (offline.hadOfflineWork && offline.pending > 0)))
const offerLot = computed(() => offline.savedLot && route.path !== '/revisar')
const lastSync = computed(() => (offline.lastSync
  ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(offline.lastSync)
  : null))
</script>
