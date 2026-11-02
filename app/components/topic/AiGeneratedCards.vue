<template>
  <UiSection v-if="cards.length" :title="`${cards.length} cards da foto`" description="Revise antes de aceitar: eles entram na biblioteca deste caderno." data-testid="photo-cards">
    <template #action>
      <UiButton size="sm" @click="$emit('accept-all')">Aceitar todos</UiButton>
    </template>
    <ul class="divide-y divide-line">
      <li v-for="(card, i) in cards" :key="i" class="py-3">
        <p class="text-label text-fg-muted">Frente</p>
        <div class="line-clamp-2 text-body text-fg-strong" v-html="sanitize(stripMedia(card.front))" />
        <p class="mt-2 text-label text-fg-muted">Verso</p>
        <div class="line-clamp-2 text-meta text-fg" v-html="sanitize(stripMedia(card.back))" />
        <p v-if="hasImage(card.front) || hasImage(card.back) || hasCloze(card.front)" class="mt-1 flex gap-1.5">
          <UiTag v-if="hasImage(card.front) || hasImage(card.back)">imagem</UiTag>
          <UiTag v-if="hasCloze(card.front)">lacuna</UiTag>
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          <UiButton size="sm" :icon-left="Check" @click="$emit('accept', i)">Aceitar</UiButton>
          <UiButton size="sm" variant="ghost" :icon-left="PenLine" @click="$emit('edit', i)">Editar</UiButton>
          <UiButton size="sm" variant="ghost" :icon-left="X" @click="$emit('discard', i)">Descartar</UiButton>
        </div>
      </li>
    </ul>
  </UiSection>
</template>

<script setup lang="ts">
// Cards the AI read from a photo, waiting to be accepted on the library (usePhotoCards).
import { Check, PenLine, X } from 'lucide-vue-next'
const { sanitize } = useSanitize()

defineProps<{ cards: any[] }>()

defineEmits<{
  (e: 'accept', index: number): void
  (e: 'accept-all'): void
  (e: 'edit', index: number): void
  (e: 'discard', index: number): void
}>()

function stripMedia(html: string): string {
  if (!html) return ''
  return html.replace(/<img[^>]*>/gi, '').replace(/<audio[^>]*>.*?<\/audio>/gi, '').trim()
}

function hasImage(html: string): boolean {
  return /<img\s/i.test(html ?? '')
}

function hasCloze(html: string): boolean {
  return /\{\{c\d+::/.test(html ?? '')
}
</script>
