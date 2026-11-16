<template>
  <div class="ec-plans" data-testid="entry-plans">
    <template v-if="catalog">
      <div class="ec-plan" data-testid="entry-plan-free">
        <h3>{{ freeName }}</h3>
        <ul class="ec-points">
          <li v-for="line in planLines(catalog, 'free')" :key="line"><span>{{ line }}</span></li>
        </ul>
      </div>
      <div class="ec-plan" data-testid="entry-plan-paid">
        <h3 data-testid="entry-plan-paid-name">{{ paidName(catalog) }}</h3>
        <template v-if="prices?.monthly">
          <p><span class="ec-num ec-price" data-testid="entry-plan-paid-price">{{ prices.monthly }}</span> <span class="ec-meta">por mês</span></p>
          <p v-if="prices.annual" class="ec-meta ec-gap-t">ou {{ prices.annual }} por ano</p>
        </template>
        <ul class="ec-points">
          <li v-for="line in planLines(catalog, 'pro')" :key="line"><span>{{ line }}</span></li>
        </ul>
      </div>
    </template>
    <div v-else-if="failed" class="ec-plan" role="alert" data-testid="entry-plans-error">
      <p>Não deu para carregar os planos.</p>
      <p class="ec-line ec-gap-t">
        <button type="button" class="ec-btn ec-btn-ghost" @click="emit('retry')">Tentar de novo</button>
        <NuxtLink to="/planos" class="ec-link">Ver os planos</NuxtLink>
      </p>
    </div>
    <template v-else>
      <div v-for="i in 2" :key="i" class="ec-plan" aria-hidden="true">
        <div class="ec-skeleton" />
        <div class="ec-skeleton" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// The two plans of step 7 (prd-entrada-comecar RF-F18, RN-4): names, prices, the preview's sentence and the paid plan's
// benefits only from GET /api/plans; a skeleton while it loads and a retry when it fails.
import type { PlanCatalog } from '~/types'
import { paidName, paidPrices, planLines } from '~/utils/entrada'

const props = defineProps<{ catalog: PlanCatalog | null, failed: boolean }>()
const emit = defineEmits<{ retry: [] }>()

const prices = computed(() => paidPrices(props.catalog))
const freeName = computed(() => props.catalog?.plans?.find(p => p.key === 'free')?.name?.trim() || 'Grátis')
</script>
