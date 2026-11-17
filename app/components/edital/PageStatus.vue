<template>
  <!-- The Situação box (prd-paginas-edital-publicas RF-W4): the one place of the page that tells inscrição and prova -->
  <UiSection variant="raised" aria-labelledby="edital-status-title" data-testid="edital-page-status" :data-state="status.state">
    <h2 id="edital-status-title" class="text-label font-semibold text-fg-muted">Situação</h2>
    <p class="mt-2 flex items-center gap-2 text-title font-semibold text-fg-strong" role="status" data-testid="edital-page-status-label">
      <component :is="status.open ? CalendarCheck : CalendarX" class="size-5 shrink-0" :class="status.open ? 'text-success' : 'text-fg-muted'" aria-hidden="true" />
      {{ status.label }}
    </p>
    <p v-if="next" class="mt-2 text-body text-fg" data-testid="edital-page-next">
      Saiu o edital {{ next.year }}: <UiLink :to="editalPagePath(next.slug)" variant="action" class="font-semibold">ver a lista</UiLink>
    </p>
    <slot />
  </UiSection>
</template>

<script setup lang="ts">
import { CalendarCheck, CalendarX } from 'lucide-vue-next'
import type { EditalPageMeta } from '~~/modules/editais/types'
import type { EditalStatus } from '~/utils/editalStatus'
import { editalPagePath } from '~/utils/editalPage'

defineProps<{ status: EditalStatus, next?: Pick<EditalPageMeta, 'slug' | 'year'> | null }>()
</script>
