<template>
  <!-- Internal piece of UiButton/UiIconButton (raio-X §D): the only place with animate-spin (check-ds).
       Decorative: whoever shows it announces the state (aria-busy on the button, text nearby). -->
  <LoaderCircle class="animate-spin shrink-0" :class="size === 'sm' ? 'size-4' : 'size-5'" aria-hidden="true" />
</template>

<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>
