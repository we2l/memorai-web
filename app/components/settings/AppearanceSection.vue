<template>
  <UiRadioGroup
    :model-value="preference"
    label="Tema"
    hide-label
    name="theme"
    variant="cards"
    :columns="3"
    :options="options"
    @update:model-value="set($event as ColorModePreference)"
  />
</template>

<script setup lang="ts">
// "Aparência" (prd-4g-conta-onboarding-v3 RF-F1): the same useColorMode of the account menu.
import type { ColorModePreference } from '~/composables/useColorMode'

const { preference, set } = useColorMode()
const options = [
  { value: 'system', label: 'Sistema', description: 'Segue o aparelho' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
]
</script>
