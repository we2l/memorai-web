<template>
  <component :is="ICONS[name]" stroke-width="2" aria-hidden="true" />
</template>

<script setup lang="ts">
// The icons of the entry (prd-entrada-comecar): one name per thing the Baigi does, the lucide ones the app uses.
import { CalendarDays, FileText, Flag, Headphones, Layers, RotateCcw, SquareCheckBig, TrendingDown, Zap } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { EntryIcon } from '~/utils/entrada'

defineProps<{ name: EntryIcon | 'curve' | 'redo' | 'calendar' }>()

const ICONS: Record<EntryIcon | 'curve' | 'redo' | 'calendar', Component> = {
  card: Layers,
  file: FileText,
  bolt: Zap,
  quiz: SquareCheckBig,
  listen: Headphones,
  flag: Flag,
  curve: TrendingDown,
  redo: RotateCcw,
  calendar: CalendarDays,
}
</script>
