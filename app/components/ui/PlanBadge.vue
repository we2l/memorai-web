<template>
  <NuxtLink to="/planos" class="hit-touch flex items-center gap-2 px-3 py-2 rounded-control hover:bg-hover transition-colors">
    <span
      class="inline-block px-2.5 py-0.5 rounded-full text-label font-semibold"
      :class="badgeClass"
    >
      {{ label }}
    </span>
    <span class="text-label text-fg-muted">{{ plan === 'free' ? 'Ver planos' : 'Meu plano' }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  plan?: string
}>(), {
  plan: 'free',
})

// The paid plan's name from the catalog ("Intensivo"); `pro` stays the key
const proName = useProName(() => props.plan === 'pro')
const label = computed(() => (props.plan === 'pro' ? proName.value : 'Grátis'))

const badgeClass = computed(() => {
  const classes: Record<string, string> = {
    free: 'bg-soft text-fg-muted',
    pro: 'bg-action-subtle text-action-fg',
  }
  return classes[props.plan] || classes.free
})
</script>
