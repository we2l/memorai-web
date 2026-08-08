<template>
  <section v-if="totalCards > 0" class="review-modes">
    <p class="review-modes__label">Mais formas de revisar</p>
    <div class="review-modes__list">
      <UiDisabledFeature :enabled="totalCards > 0" tooltip="Nenhum card">
        <NuxtLink to="/revisar?mode=blitz" class="review-chip">
          <span class="review-chip__icon">⚡</span>
          <span class="review-chip__title">Relâmpago</span>
          <span class="review-chip__desc">· 5 min</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="hasLapsedCards" tooltip="Erre cards primeiro">
        <NuxtLink to="/revisar?errors_only=1" class="review-chip">
          <span class="review-chip__icon">✕</span>
          <span class="review-chip__title">Só erros</span>
          <span class="review-chip__desc">· Erros recentes</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="survivalAvailable" tooltip="100+ atrasados">
        <NuxtLink to="/revisar?survival=1" class="review-chip">
          <span class="review-chip__icon">🛟</span>
          <span class="review-chip__title">Sobrevivência</span>
          <span class="review-chip__desc">· 20 urgentes</span>
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
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid color-mix(in srgb, var(--border-base) 40%, transparent);
}
.review-modes__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}
.review-modes__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-base);
  background: transparent;
  transition: all 150ms ease-out;
}
.review-chip:hover {
  background: var(--bg-soft);
  border-color: color-mix(in srgb, var(--color-primary-500, var(--color-accent-primary)) 15%, var(--border-base));
}

.review-chip__icon {
  font-size: 13px;
  flex-shrink: 0;
}
.review-chip__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.review-chip__desc {
  font-size: 11px;
  color: var(--color-text-muted);
}
</style>
