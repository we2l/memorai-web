<template>
  <UiInput
    ref="field"
    v-model="model"
    v-bind="$attrs"
    :id="id"
    :label="label"
    :hint="hint"
    :error="error"
    :type="visible ? 'text' : 'password'"
    :autocomplete="autocomplete"
    autocapitalize="off"
    spellcheck="false"
  >
    <template #suffix>
      <!-- mousedown.prevent: the click does not take the focus (and the caret) away from the field -->
      <UiIconButton
        :icon="visible ? EyeOff : Eye"
        label="Mostrar senha"
        :pressed="visible"
        size="sm"
        class="-mr-2"
        data-testid="password-toggle"
        @mousedown.prevent
        @click="toggle"
      />
    </template>
  </UiInput>
</template>

<script setup lang="ts">
// Password field of the auth screens (prd-4g-conta-onboarding-v3 RF-F12..F14): show/hide with aria-pressed
// (a toggle keeps its name), the field keeps the focus. It replaces the "confirm password" of the sign-up:
// a typo is seen here, and the reset by e-mail covers the rest.
import { Eye, EyeOff } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

defineProps<{
  id: string
  label: string
  hint?: string
  error?: string
  autocomplete: 'current-password' | 'new-password'
}>()

const model = defineModel<string>({ required: true })
const visible = ref(false)

function toggle() {
  visible.value = !visible.value
  useAnalytics().track('auth_password_toggle', { visible: visible.value })
}
</script>
