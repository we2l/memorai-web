<template>
  <div class="flex items-center gap-2">
    <img src="~/assets/mascot-baigi-bust.png" alt="Baigi" :width="iconSize" :height="iconSize" class="object-contain" />
    <span v-if="showText" class="font-logo font-bold tracking-[0.08em]" :class="textClass">BAIGI.</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  iconSize?: number
  showText?: boolean
  textClass?: string
}>(), {
  iconSize: 28,
  showText: true,
  textClass: 'text-lg text-accent-primary',
})
</script>
