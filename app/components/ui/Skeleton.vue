<template>
  <div data-testid="skeleton" aria-hidden="true" :class="variant === 'row' ? 'flex items-center gap-3 py-3' : variant === 'text' ? 'flex flex-col gap-2' : ''">
    <template v-if="variant === 'block'">
      <div class="w-full animate-pulse rounded-card bg-subtle" :class="BLOCK[size]" />
    </template>
    <template v-else-if="variant === 'row'">
      <div class="size-9 shrink-0 animate-pulse rounded-control bg-subtle" />
      <div class="flex flex-1 flex-col gap-2">
        <div class="h-4 w-2/3 animate-pulse rounded-tag bg-subtle" />
        <div class="h-3 w-1/3 animate-pulse rounded-tag bg-subtle" />
      </div>
    </template>
    <template v-else>
      <div v-for="i in lines" :key="i" class="h-4 animate-pulse rounded-tag bg-subtle" :class="i === lines && lines > 1 ? 'w-2/3' : 'w-full'" />
    </template>
  </div>
</template>

<script setup lang="ts">
// Loading placeholder (raio-X §D, tasks 12.5): text lines, a list row or a block, in the shape of what is
// coming (no layout shift). Decorative: the region that loads says it (aria-busy, a status text). The
// `skeleton` utility stays an internal detail of legacy-v2.css; tests find it by data-testid.
withDefaults(defineProps<{
  variant?: 'text' | 'row' | 'block'
  lines?: number
  /** block height: sm 64 · md 96 · lg 160 px */
  size?: 'sm' | 'md' | 'lg'
}>(), { variant: 'text', lines: 3, size: 'md' })

const BLOCK = { sm: 'h-16', md: 'h-24', lg: 'h-40' }
</script>
