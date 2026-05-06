<template>
  <div class="w-full max-w-2xl mx-auto">
    <!-- Mobile: 2x2 with Lembrei highlighted -->
    <div class="grid grid-cols-2 gap-3 sm:hidden">
      <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="`Não lembrei — ${intervals.again}`">
        <span class="text-lg">😵</span>
        <span>Não lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.again }}</span>
      </button>
      <button class="btn-good ring-1 ring-[#6A994E]/30" :disabled="disabled" @click="onRate(3)" :aria-label="`Lembrei — ${intervals.good}`">
        <span class="text-lg">✅</span>
        <span>Lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.good }}</span>
      </button>
      <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="`Quase — ${intervals.hard}`">
        <span class="text-lg">🤔</span>
        <span>Quase</span>
        <span class="text-micro opacity-50">{{ intervals.hard }}</span>
      </button>
      <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="`Fácil demais — ${intervals.easy}`">
        <span class="text-lg">🔥</span>
        <span>Fácil demais</span>
        <span class="text-micro opacity-50">{{ intervals.easy }}</span>
      </button>
    </div>

    <!-- Desktop: 4 cols with Lembrei highlighted -->
    <div class="hidden sm:grid grid-cols-4 gap-3">
      <button class="btn-again" :disabled="disabled" @click="onRate(1)" :aria-label="`Não lembrei — ${intervals.again}`">
        <span class="text-lg">😵</span>
        <span>Não lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.again }}</span>
      </button>
      <button class="btn-hard" :disabled="disabled" @click="onRate(2)" :aria-label="`Quase — ${intervals.hard}`">
        <span class="text-lg">🤔</span>
        <span>Quase</span>
        <span class="text-micro opacity-50">{{ intervals.hard }}</span>
      </button>
      <button class="btn-good ring-1 ring-[#6A994E]/30" :disabled="disabled" @click="onRate(3)" :aria-label="`Lembrei — ${intervals.good}`">
        <span class="text-lg">✅</span>
        <span>Lembrei</span>
        <span class="text-micro opacity-50">{{ intervals.good }}</span>
      </button>
      <button class="btn-easy" :disabled="disabled" @click="onRate(4)" :aria-label="`Fácil demais — ${intervals.easy}`">
        <span class="text-lg">🔥</span>
        <span>Fácil demais</span>
        <span class="text-micro opacity-50">{{ intervals.easy }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  disabled?: boolean
  intervals: { again: string; hard: string; good: string; easy: string }
}>()

const emit = defineEmits<{ (e: 'rate', rating: number): void }>()

function onRate(rating: number) {
  emit('rate', rating)
}
</script>
