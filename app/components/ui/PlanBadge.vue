<template>
  <NuxtLink to="/planos" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-tertiary transition-colors">
    <span
      class="inline-block px-2.5 py-0.5 rounded-full text-micro font-semibold"
      :class="badgeClass"
    >
      {{ label }}
    </span>
    <span class="text-micro text-base-muted">{{ plan === 'free' ? 'Ver planos' : 'Meu plano' }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  plan?: string
}>(), {
  plan: 'free',
})

const label = computed(() => {
  const labels: Record<string, string> = { free: 'Grátis', pro: 'Pro' }
  return labels[props.plan] || 'Grátis'
})

const badgeClass = computed(() => {
  const classes: Record<string, string> = {
    free: 'bg-surface-tertiary text-base-muted',
    pro: 'bg-amber-500/15 text-amber-600',
  }
  return classes[props.plan] || classes.free
})
</script>
