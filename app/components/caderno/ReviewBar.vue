<template>
  <div
    class="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--miniplayer-h))] z-sticky flex gap-2 border-t border-line bg-raised px-gutter py-3 md:hidden"
    data-testid="scope-review-bar"
  >
    <UiButton variant="primary" block :to="reviewPath(topicId)" class="flex-1">Revisar hoje · {{ count }}</UiButton>
    <UiIconButton :icon="Zap" label="Relâmpago: 5 minutos, os mais urgentes" variant="subtle" :to="`/revisar?mode=blitz&topic_id=${topicId}`" />
  </div>
</template>

<script setup lang="ts">
// Phone bar of the hub (prd-4b-caderno-v3 RF-F11): "Revisar hoje · N" (the same number as the header,
// the list, Hoje and the session) and the Relâmpago, above the BottomNav and the mini-player. It is the
// primary of the screen on the phone (the header hides its own); the page reports its height so the
// content and the toasts stay above it.
import { Zap } from 'lucide-vue-next'
import { reviewPath } from '~/utils/reviewScope'

defineProps<{ topicId: string; count: number }>()
</script>
