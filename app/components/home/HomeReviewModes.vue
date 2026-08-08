<template>
  <section v-if="totalCards > 0" class="review-modes">
    <p class="review-modes__label">Mais formas de revisar</p>
    <div class="review-modes__list">
      <UiDisabledFeature :enabled="totalCards > 0" tooltip="Nenhum card">
        <NuxtLink to="/revisar?mode=blitz" class="review-mode">
          <span class="review-mode__icon">⚡</span>
          <span class="review-mode__title">Relâmpago</span>
          <span class="review-mode__sep">·</span>
          <span class="review-mode__desc">5 min</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="hasLapsedCards" tooltip="Erre cards primeiro">
        <NuxtLink to="/revisar?errors_only=1" class="review-mode">
          <span class="review-mode__icon">✕</span>
          <span class="review-mode__title">Só erros</span>
          <span class="review-mode__sep">·</span>
          <span class="review-mode__desc">Erros recentes</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="survivalAvailable" tooltip="100+ atrasados">
        <NuxtLink to="/revisar?survival=1" class="review-mode">
          <span class="review-mode__icon">🛟</span>
          <span class="review-mode__title">Sobrevivência</span>
          <span class="review-mode__sep">·</span>
          <span class="review-mode__desc">20 urgentes</span>
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
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid color-mix(in srgb, var(--border-base) 50%, transparent);
}
.review-modes__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}
.review-modes__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.review-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  transition: opacity 150ms ease-out;
}
.review-mode:hover {
  opacity: 0.7;
}

.review-mode__icon {
  font-size: 13px;
}
.review-mode__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.review-mode__sep {
  font-size: 12px;
  color: var(--color-text-muted);
}
.review-mode__desc {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
