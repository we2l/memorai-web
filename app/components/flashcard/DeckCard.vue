<template>
  <NuxtLink :to="`/decks/${deck.id}`" class="card-interactive">
    <div class="flex items-center justify-between mb-2">
      <p class="text-title">{{ deck.name }}</p>
      <span v-if="deck.cards_count" class="badge badge-success">{{ deck.cards_count }} cards</span>
      <span v-else class="badge badge-muted">Vazio</span>
    </div>
    <p v-if="deck.description" class="text-base-muted text-small line-clamp-2">{{ deck.description }}</p>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Deck } from '~/types'

defineProps<{ deck: Deck }>()
</script>
