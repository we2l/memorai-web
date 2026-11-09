<template>
  <div>
    <ul class="divide-y divide-hairline" aria-label="Cards" data-testid="card-list">
      <CardsCardRow
        v-for="(card, i) in cards"
        :key="card.id"
        :ref="(el: unknown) => setRow(el, i)"
        :card="card"
        :selected="selected.has(card.id)"
        @toggle="(range: boolean) => $emit('toggle', card.id, range)"
        @open="$emit('open', card)"
      />
    </ul>
    <div v-if="hasMore" class="mt-4 flex justify-center">
      <UiButton :loading="loadingMore" data-testid="card-more" @click="more">Carregar mais</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// The library list (prd-4c-material-v3 RF-F11): "Carregar mais" of 50 by cursor (a button, not an infinite
// scroll), and the focus on the first new row after it, so the keyboard keeps its place.
import type { LibraryCard } from '~/types'

const props = defineProps<{
  cards: LibraryCard[]
  selected: Set<string>
  hasMore: boolean
  loadingMore: boolean
  /** Loads the next page; resolves with the number of new rows */
  loadMore: () => Promise<number>
}>()
defineEmits<{ (e: 'toggle', id: string, range: boolean): void; (e: 'open', card: LibraryCard): void }>()

const rows: ({ focus: () => void } | null)[] = []
function setRow(el: unknown, i: number) {
  rows[i] = el as { focus: () => void } | null
}

async function more() {
  const before = props.cards.length
  const added = await props.loadMore()
  if (!added) return
  await nextTick()
  rows[before]?.focus()
}
</script>
