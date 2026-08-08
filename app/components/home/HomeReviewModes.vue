<template>
  <section v-if="totalCards > 0" class="review-modes">
    <div class="review-modes__list">
      <UiDisabledFeature :enabled="totalCards > 0" tooltip="Nenhum card">
        <NuxtLink to="/revisar?mode=blitz" class="review-mode">
          <span class="review-mode__icon review-mode__icon--blitz">⚡</span>
          <span class="review-mode__title">Relâmpago</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="hasLapsedCards" tooltip="Erre cards primeiro">
        <NuxtLink to="/revisar?errors_only=1" class="review-mode">
          <span class="review-mode__icon">✕</span>
          <span class="review-mode__title">Só erros</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="survivalAvailable" tooltip="100+ atrasados">
        <NuxtLink to="/revisar?survival=1" class="review-mode">
          <span class="review-mode__icon review-mode__icon--survival">🛟</span>
          <span class="review-mode__title">Sobrevivência</span>
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
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border-base);
}
.review-modes__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
}

.review-mode {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 14px;
  transition: color 150ms ease-out;
}
.review-mode:hover {
  color: var(--color-text-primary);
}

.review-mode__icon {
  font-size: 16px;
}
.review-mode__icon--blitz {
  color: var(--color-warning);
}
.review-mode__icon--survival {
  color: var(--color-danger);
}
.review-mode__title {
  font-weight: 400;
}
</style>
