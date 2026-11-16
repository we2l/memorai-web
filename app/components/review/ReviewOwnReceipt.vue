<template>
  <div class="w-full rounded-row bg-soft px-4 py-3 text-left" data-testid="own-receipt">
    <UiTag tone="neutral">Estimativa</UiTag>
    <p class="mt-2 text-meta text-fg">
      Revisando no dia certo, você mantém mais de {{ withMin }}% destes cards. Sem revisar, cai para uns {{ withoutEnd }}% em {{ curve.days }} dias.
      <UiLink to="/ferramentas/calculadora-do-esquecimento" data-testid="own-receipt-how">Como calculamos</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// The receipt of the first own lote (prd-ativacao-material-proprio H8): what reviewing on the right day gives, with the
// numbers of the onboarding's curve (FsrsService::forgettingCurve, sent by POST /onboarding/first-batch only when this
// lote was the first with the person's own cards). The same sums as onboarding/ForgettingCurve; neutral, no primary.
import type { ForgettingCurve } from '~/utils/guestProgress'

const props = defineProps<{ curve: ForgettingCurve }>()

const withoutEnd = computed(() => Math.round((props.curve.without.at(-1)?.[1] ?? 0) * 100))
const withMin = computed(() => Math.floor(Math.min(...props.curve.with.map(([, r]) => r)) * 100))
</script>
