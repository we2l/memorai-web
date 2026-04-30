<template>
  <!-- Loading -->
  <div v-if="loading" class="mb-4 px-4 py-4 rounded-xl bg-accent-primary-subtle border border-accent-primary/15 flex items-center gap-3">
    <div class="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin shrink-0" />
    <p class="text-small text-accent-primary">Gerando cards com IA...</p>
  </div>

  <!-- Cards for review -->
  <div v-else-if="cards.length" class="mb-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-small text-accent-primary font-medium">✨ {{ cards.length }} cards gerados — revise antes de aceitar</p>
      <button class="btn-primary !py-2 !px-3.5 !min-h-[2.75rem] text-small" @click="$emit('accept-all')">
        Aceitar todos
      </button>
    </div>
    <div class="space-y-2">
      <div v-for="(card, i) in cards" :key="i" class="px-4 py-3 rounded-xl bg-surface-tertiary/50 border border-base">
        <div>
          <p class="text-micro text-base-muted mb-0.5">Frente</p>
          <div class="text-body text-base-primary line-clamp-2 card-front-preview" v-html="stripMedia(card.front)" />
          <div class="flex items-center gap-1.5 mt-1" v-if="hasImage(card.front) || hasCloze(card.front)">
            <span v-if="hasImage(card.front)" class="text-micro px-1.5 py-0.5 rounded bg-surface-tertiary text-base-muted">🖼 imagem</span>
            <span v-if="hasCloze(card.front)" class="text-micro px-1.5 py-0.5 rounded bg-surface-tertiary text-base-muted">[...] lacuna</span>
          </div>
        </div>
        <div class="mt-1.5 pt-1.5 border-t border-base">
          <p class="text-micro text-base-muted mb-0.5">Verso</p>
          <div class="text-small text-base-muted line-clamp-2 card-front-preview" v-html="stripMedia(card.back)" />
          <div class="flex items-center gap-1.5 mt-1" v-if="hasImage(card.back)">
            <span class="text-micro px-1.5 py-0.5 rounded bg-surface-tertiary text-base-muted">🖼 imagem</span>
          </div>
        </div>
        <div class="flex items-center gap-2 mt-2 pt-2 border-t border-base">
          <button class="btn-primary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('accept', i)">✓ Aceitar</button>
          <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="$emit('edit', i)">✏️ Editar</button>
          <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small text-danger" @click="$emit('discard', i)">✕ Descartar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  cards: any[]
  loading: boolean
}>()

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
