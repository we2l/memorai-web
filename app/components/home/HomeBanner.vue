<template>
  <div>
    <div v-if="retentionSuggestion?.has_suggestion" class="home-banner">
      <TrendingDown :size="15" class="home-banner__icon home-banner__icon--warning" />
      <p class="home-banner__text">Reduzir retenção eliminaria ~{{ retentionSuggestion.cards_eliminated }} cards hoje.</p>
      <button class="home-banner__action" @click="$emit('apply-retention')">Ajustar</button>
      <button class="home-banner__dismiss" @click="$emit('dismiss-retention')">✕</button>
    </div>
    <div v-if="survivalActive" class="home-banner">
      <ShieldAlert :size="15" class="home-banner__icon home-banner__icon--warning" />
      <p class="home-banner__text">Modo Sobrevivência ativo.</p>
      <button class="home-banner__action" @click="$emit('toggle-survival', false)">Desativar</button>
    </div>
    <div v-else-if="backlog?.suggest_survival_mode" class="home-banner home-banner--danger">
      <ShieldAlert :size="15" class="home-banner__icon home-banner__icon--danger" />
      <p class="home-banner__text">{{ backlog.overdue_count }} cards atrasados.</p>
      <button class="home-banner__action" @click="$emit('toggle-survival', true)">Ativar Sobrevivência</button>
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
  gap: 8px;
  padding: 9px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-warning) 4%, var(--bg-card));
  border: 1px solid color-mix(in srgb, var(--color-warning) 10%, transparent);
  margin-bottom: 14px;
  font-size: 12.5px;
  color: var(--text-body);
}
.home-banner--danger {
  background: color-mix(in srgb, var(--color-danger) 4%, var(--bg-card));
  border-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
}

.home-banner__icon {
  flex-shrink: 0;
}
.home-banner__icon--warning {
  color: var(--color-warning);
}
.home-banner__icon--danger {
  color: var(--color-danger);
}

.home-banner__text {
  flex: 1;
  letter-spacing: 0.005em;
}

.home-banner__action {
  font-weight: 550;
  font-size: 12.5px;
  color: var(--color-primary-500);
  transition: opacity 150ms;
}
.dark .home-banner__action {
  color: var(--color-accent-primary);
}
.home-banner__action:hover {
  opacity: 0.7;
}

.home-banner__dismiss {
  color: var(--text-muted);
  font-size: 12px;
  padding: 2px;
  transition: opacity 150ms;
}
.home-banner__dismiss:hover {
  opacity: 0.6;
}
</style>
