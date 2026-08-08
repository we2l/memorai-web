<template>
  <section v-if="totalCards > 0" class="review-modes">
    <p class="review-modes__label">Outras formas de revisar</p>
    <div class="review-modes__chips">
      <UiDisabledFeature :enabled="totalCards > 0" tooltip="Nenhum card">
        <NuxtLink to="/revisar?mode=blitz" class="review-chip">
          <span class="text-base">⚡</span>
          <span class="text-sm font-medium text-base-primary">Relâmpago</span>
          <span class="text-xs text-base-muted">· 5 min</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="hasLapsedCards" tooltip="Erre cards primeiro">
        <NuxtLink to="/revisar?errors_only=1" class="review-chip">
          <span class="text-base">✕</span>
          <span class="text-sm font-medium text-base-primary">Só erros</span>
          <span class="text-xs text-base-muted">· Erros recentes</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="survivalAvailable" tooltip="100+ atrasados">
        <NuxtLink to="/revisar?survival=1" class="review-chip">
          <span class="text-base">🛟</span>
          <span class="text-sm font-medium text-base-primary">Sobrevivência</span>
          <span class="text-xs text-base-muted">· 20 urgentes</span>
        </NuxtLink>
      </UiDisabledFeature>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  totalCards: number
  hasLapsedCards: boolean
  survivalAvailable: boolean
}>()
</script>

<style scoped>
.review-modes {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px dashed color-mix(in srgb, var(--border-base) 50%, transparent);
}
.review-modes__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}
.review-modes__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.review-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-base);
  background: transparent;
  transition: all 150ms ease;
}
.review-chip:hover {
  background: var(--bg-soft);
  border-color: var(--border-hover, var(--border-base));
}
</style>
