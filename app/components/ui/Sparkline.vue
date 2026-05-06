<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="inline-block">
    <polyline
      :points="points"
      fill="none"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  data: number[]
  color?: string
  width?: number
  height?: number
}>(), {
  color: '#D97706',
  width: 80,
  height: 24,
})

const points = computed(() => {
  if (!props.data.length) return ''
  const max = Math.max(...props.data, 1)
  const step = props.width / Math.max(props.data.length - 1, 1)
  const pad = 2
  return props.data
    .map((v, i) => `${i * step},${pad + (props.height - 2 * pad) * (1 - v / max)}`)
    .join(' ')
})
</script>
