<template>
  <div>
    <div v-if="retentionSuggestion?.has_suggestion" class="home-banner">
      <TrendingDown :size="16" class="text-warning shrink-0" />
      <p class="flex-1">Reduzir retenção eliminaria ~{{ retentionSuggestion.cards_eliminated }} cards hoje.</p>
      <button class="font-medium text-accent-primary hover:underline" @click="$emit('apply-retention')">Ajustar</button>
      <button class="text-base-muted" @click="$emit('dismiss-retention')">✕</button>
    </div>
    <div v-if="survivalActive" class="home-banner">
      <ShieldAlert :size="16" class="text-warning shrink-0" />
      <p class="flex-1">Modo Sobrevivência ativo.</p>
      <button class="font-medium text-accent-primary hover:underline" @click="$emit('toggle-survival', false)">Desativar</button>
    </div>
    <div v-else-if="backlog?.suggest_survival_mode" class="home-banner home-banner--danger">
      <ShieldAlert :size="16" class="text-danger shrink-0" />
      <p class="flex-1">{{ backlog.overdue_count }} cards atrasados.</p>
      <button class="font-medium text-accent-primary hover:underline" @click="$emit('toggle-survival', true)">Ativar Sobrevivência</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldAlert, TrendingDown } from 'lucide-vue-next'
import type { BacklogStats } from '~/types'

defineProps<{
  retentionSuggestion: { has_suggestion: boolean; cards_eliminated?: number; suggested_retention?: number } | null
  survivalActive: boolean
  backlog: BacklogStats | null
}>()

defineEmits<{
  'apply-retention': []
  'dismiss-retention': []
  'toggle-survival': [enabled: boolean]
}>()
</script>

<style scoped>
.home-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-warning) 5%, var(--bg-card));
  border: 1px solid color-mix(in srgb, var(--color-warning) 15%, transparent);
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--color-text-primary);
}
.home-banner--danger {
  background: color-mix(in srgb, var(--color-danger) 5%, var(--bg-card));
  border-color: color-mix(in srgb, var(--color-danger) 15%, transparent);
}
</style>
