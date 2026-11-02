<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <div
        v-for="i in 20"
        :key="i"
        class="confetti-particle"
        :style="{
          left: `${40 + Math.random() * 20}%`,
          top: `${30 + Math.random() * 10}%`,
          backgroundColor: colors[i % colors.length],
          '--confetti-x': `${(Math.random() - 0.5) * 200}px`,
          animationDelay: `${Math.random() * 0.3}s`,
        }"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  trigger: boolean
}>()

const show = ref(false)
// No confetti for people who asked the OS for less motion (RF-F9.4)
const reducedMotion = useReducedMotion()

const colors = [
  '#6F3FF5', // accent
  '#16A34A', // green
  '#2563EB', // blue
  '#EA580C', // orange
  '#DB2777', // pink
  '#CA8A04', // yellow
]

watch(() => props.trigger, (val) => {
  if (val && !reducedMotion.value) {
    show.value = true
    setTimeout(() => {
      show.value = false
    }, 2000)
  }
}, { immediate: true }) // lazy-mounted already triggered
</script>
