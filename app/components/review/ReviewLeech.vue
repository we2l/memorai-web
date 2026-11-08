<template>
  <section class="flex flex-col gap-2 rounded-control border border-line px-4 py-3" aria-labelledby="leech-title" data-testid="review-leech">
    <p id="leech-title" class="text-meta font-semibold text-fg-strong">
      Esse card não está colando <span class="font-normal text-fg-muted">({{ lapses }} erros)</span>
    </p>
    <p class="text-meta text-fg-muted">Costuma ser o card, não você: veja de onde veio, reescreva, peça uma explicação ou pause.</p>
    <div class="flex flex-wrap gap-2">
      <UiButton v-if="hasOrigin" size="sm" :icon-left="FileText" data-testid="leech-origin" @click="$emit('origin')">Ver a origem</UiButton>
      <UiButton size="sm" :icon-left="PenLine" data-testid="leech-rewrite" @click="$emit('rewrite')">Reescrever</UiButton>
      <UiButton v-if="canExplain" size="sm" :icon-left="MessageCircle" data-testid="leech-explain" @click="$emit('explain')">Explicar</UiButton>
      <UiButton size="sm" variant="ghost" :icon-left="Pause" data-testid="leech-pause" @click="$emit('pause')">Pausar o card</UiButton>
    </div>
  </section>
</template>

<script setup lang="ts">
// The card that never sticks (prd-revisao-v5-fase-b RF-F7, B-D9): from the leech mark of the API (4 errors), a quiet
// note on the turned card with what helps: the origin, the editor, the tira-dúvidas and the pause (the card leaves every
// session, nothing is deleted; "Retomar" in the library). Never suspends by itself. No color for alarm: the text carries it.
import { FileText, MessageCircle, Pause, PenLine } from 'lucide-vue-next'

defineProps<{ lapses: number; hasOrigin: boolean; canExplain: boolean }>()
defineEmits<{ (e: 'origin' | 'rewrite' | 'explain' | 'pause'): void }>()
</script>
