<template>
  <UiSection v-if="rows.length" title="Compare os planos" flush class="px-5 pt-5 pb-1 sm:px-6 sm:pt-6" data-testid="plan-compare">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-meta">
        <caption class="sr-only">O que cada plano inclui</caption>
        <thead>
          <tr class="border-b border-line text-label text-fg-muted">
            <th scope="col" class="py-3 pr-3 font-medium">Recurso</th>
            <th v-for="plan in catalogPlans" :key="plan.key" scope="col" class="w-1/3 py-3 pr-3 font-medium">{{ plan.name }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="row in rows" :key="row.key" :data-testid="`compare-${row.key}`">
            <th scope="row" class="py-3 pr-3 font-normal text-fg">{{ row.label }}</th>
            <td v-for="cell in row.cells" :key="cell.plan" class="py-3 pr-3 align-top">
              <span :class="cell.included ? 'font-semibold text-fg-strong' : 'text-fg-muted'">{{ cell.text }}</span>
              <span v-if="cell.detail" class="block text-label text-fg-muted">{{ cell.detail }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Comparison generated from `features` x `plans[].limits` of the catalog (prd-4h-landing-v3 RF-F12): no number here.
const { plans } = usePlans()
const catalogPlans = computed(() => plans.value?.plans ?? [])
const rows = computed(() => planComparison(plans.value))
</script>
