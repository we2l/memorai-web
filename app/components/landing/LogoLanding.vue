<template>
  <NuxtLink to="/" class="flex items-center gap-2">
    <img src="~/assets/mascot-baigi-bust.png" alt="Baigi" :width="iconSize" :height="iconSize" class="object-contain" />
    <span v-if="showText" class="font-extrabold tracking-wide" :class="[textSizeClass, textColorClass]">
      BAIGI<span style="opacity: 0.5">.</span>
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  iconSize?: number
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: string
}>(), {
  iconSize: 32,
  showText: true,
  size: 'md',
  color: '#6F3FF5',
})

const textSizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'text-lg'
    case 'lg': return 'text-3xl'
    default: return 'text-xl'
  }
})

const textColorClass = computed(() => `text-[${props.color}]`)
</script>
