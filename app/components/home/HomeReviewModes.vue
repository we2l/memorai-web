<template>
  <nav v-if="totalCards > 0" class="modes" aria-label="Outros modos de revisão">
    <p class="modes__label">Outras formas de revisar</p>
    <div class="modes__row">
      <UiDisabledFeature :enabled="totalCards > 0" tooltip="Nenhum card">
        <NuxtLink to="/revisar?mode=blitz" class="modes__chip modes__chip--primary">
          <span class="modes__icon">⚡</span>
          <span class="modes__name">Relâmpago</span>
          <span class="modes__hint">5 min</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="hasLapsedCards" tooltip="Erre cards primeiro">
        <NuxtLink to="/revisar?errors_only=1" class="modes__chip">
          <span class="modes__icon">✕</span>
          <span class="modes__name">Só erros</span>
          <span class="modes__hint">Erros recentes</span>
        </NuxtLink>
      </UiDisabledFeature>

      <UiDisabledFeature :enabled="survivalAvailable" tooltip="100+ atrasados">
        <NuxtLink to="/revisar?survival=1" class="modes__chip">
          <span class="modes__icon">🛟</span>
          <span class="modes__name">Sobrevivência</span>
          <span class="modes__hint">20 urgentes</span>
        </NuxtLink>
      </UiDisabledFeature>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  totalCards: number
  hasLapsedCards: boolean
  survivalAvailable: boolean
}>()
</script>

<style scoped>
.modes {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #D8D2E8;
}

.modes__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 12px;
}

.modes__row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.modes__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-base);
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 13px;
  transition: all 150ms ease-out;
}
.modes__chip:hover {
  color: var(--text-heading);
  border-color: color-mix(in srgb, var(--color-primary-500) 20%, var(--border-base));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary-500) 5%, transparent);
  transform: translateY(-0.5px);
}
.dark .modes__chip:hover {
  border-color: color-mix(in srgb, var(--color-accent-primary) 18%, var(--border-base));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent-primary) 5%, transparent);
}
.modes__chip--primary {
  color: var(--text-heading);
  border-color: color-mix(in srgb, var(--color-primary-200) 55%, var(--border-base));
  font-weight: 530;
  background: color-mix(in srgb, var(--color-primary-50) 40%, var(--bg-card));
}

.modes__icon {
  font-size: 13px;
}

.modes__name {
  font-weight: 520;
  letter-spacing: -0.005em;
}

.modes__hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
  opacity: 0.6;
  margin-left: 2px;
}
</style>
