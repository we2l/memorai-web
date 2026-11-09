<template>
  <div class="flex flex-col items-center gap-0.5">
    <p class="flex items-center gap-2 text-body font-semibold text-metric-streak-fg" :class="streak.extendedNow && 'motion-safe:animate-celebrate-pop'">
      <Flame class="size-5 fill-current text-metric-streak" aria-hidden="true" />
      Dia {{ streak.current }} da sequência<template v-if="streak.record"> · recorde pessoal</template>
    </p>
    <p v-if="streak.rest !== undefined && streak.rest !== null" class="text-label text-fg-muted" data-testid="streak-rest">
      {{ streak.rest ? 'Você tem 1 dia de folga por semana sem perder a sequência.' : 'A folga desta semana já foi usada.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
// The streak at the end of a lote or a session (prd-revisao-v5-fase-a RF-F5): "Dia N da sequência" and the weekly
// rest (one missed day in 7 does not break it, StreakService on the API). The flame pops once when today extended it.
import { Flame } from 'lucide-vue-next'
import type { StreakInfo } from '~/components/review/ReviewBatchEnd.vue'

defineProps<{ streak: StreakInfo }>()
</script>
