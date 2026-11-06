<template>
  <fieldset class="flex flex-col items-center gap-2" data-testid="billing-toggle">
    <legend class="sr-only">Período de cobrança</legend>
    <div class="inline-flex gap-1 rounded-control bg-subtle p-1">
      <label
        v-for="option in OPTIONS"
        :key="option.value"
        class="relative inline-flex min-h-touch min-w-24 cursor-pointer items-center justify-center rounded-row px-4 text-meta font-semibold text-fg-muted transition-colors duration-nav hover:text-fg-strong has-checked:bg-raised has-checked:text-fg-strong has-checked:shadow-card has-checked:ring-1 has-checked:ring-line-strong has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
      >
        <input v-model="period" type="radio" class="absolute inset-0 cursor-pointer appearance-none rounded-row outline-none" :name="name" :value="option.value">
        {{ option.label }}
      </label>
    </div>
    <p class="min-h-5 text-meta text-fg-muted" data-testid="billing-savings">
      <template v-if="savings">No anual você economiza <span class="font-semibold text-fg-strong">{{ savings }}</span></template>
    </p>
  </fieldset>
</template>

<script setup lang="ts">
// Mensal · Anual (prd-4h-landing-v3 RF-F11): native radios, so the arrows and the group name come from the
// browser, in a segmented look readable in both themes, signed in or not. The savings come from the catalog.
export type BillingPeriod = 'monthly' | 'annual'

defineProps<{ savings?: string | null }>()
const period = defineModel<BillingPeriod>({ required: true })

const name = useId()
const OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'annual', label: 'Anual' },
]
</script>
