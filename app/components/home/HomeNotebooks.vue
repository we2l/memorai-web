<template>
  <UiErrorState v-if="error" title="Não foi possível carregar seus cadernos" @retry="$emit('retry')" />

  <UiSection v-else-if="loading || roots.length" title="Cadernos" :aria-busy="loading ? 'true' : undefined" data-testid="home-notebooks">
    <template v-if="roots.length > MAX" #action>
      <UiLink to="/cadernos" standalone>Ver todos ({{ roots.length }})</UiLink>
    </template>

    <div v-if="loading">
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </div>
    <ul v-else class="-mx-3 -my-2 divide-y divide-line">
      <li v-for="t in shown" :key="t.id">
        <UiListRow :to="cadernoPath(t.id)" :title="t.name">
          <template #leading>
            <UiSubjectMark :color="t.color" />
          </template>
          <template #trailing>
            <span v-if="t.session_count > 0" class="whitespace-nowrap">
              <span class="font-semibold tabular-nums text-fg-strong">{{ t.session_count }}</span> hoje
            </span>
            <span v-else class="whitespace-nowrap">{{ t.flashcards_count > 0 ? 'em dia' : 'novo' }}</span>
            <UiProgressBar
              class="w-20"
              :value="Math.round(t.progress * 100)"
              :label="`Domínio de ${t.name}: ${Math.round(t.progress * 100)}%`"
            />
          </template>
        </UiListRow>
      </li>
    </ul>
  </UiSection>
</template>

<script setup lang="ts">
// Cadernos on Hoje (prd-4a-hoje-v3 RF-F4, §5.3): only the roots (no subject repeated next to its
// caderno), at most 5. "N hoje" is the session of that caderno (the subtree, same limits as its "Revisar"
// button); the screen never adds cadernos up. Subject color only on the dot; mastery bar in purple.
import type { TopicProgress } from '~/types'

const props = defineProps<{ topics: TopicProgress[]; loading?: boolean; error?: boolean }>()
defineEmits<{ (e: 'retry'): void }>()

const MAX = 5
const time = (iso?: string | null) => (iso ? new Date(iso).getTime() || 0 : 0)

const roots = computed(() => props.topics
  .filter(t => !t.parent_id)
  .sort((a, b) => (b.session_count ?? 0) - (a.session_count ?? 0)
    || time(b.last_reviewed_at) - time(a.last_reviewed_at)
    || b.flashcards_count - a.flashcards_count))
const shown = computed(() => roots.value.slice(0, MAX))
</script>
