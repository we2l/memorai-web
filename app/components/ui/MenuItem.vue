<template>
  <component
    :is="isLink ? NuxtLink : 'button'"
    v-bind="isLink ? { to: item.to } : { type: 'button' }"
    :role="radio ? 'menuitemradio' : 'menuitem'"
    tabindex="-1"
    :aria-checked="radio ? String(item.checked) : undefined"
    :aria-disabled="item.disabled ? 'true' : undefined"
    class="flex min-h-touch w-full items-center gap-3 px-3 text-left text-body -outline-offset-2"
    :class="[
      item.tone === 'danger' ? 'text-danger' : 'text-fg-strong',
      item.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-soft',
    ]"
    @click="emit('choose', item, $event)"
  >
    <component :is="item.icon" v-if="item.icon" class="size-4.5 shrink-0" :class="item.tone === 'danger' ? '' : 'text-fg-muted'" aria-hidden="true" />
    <span class="min-w-32 flex-1 break-words">{{ item.label }}</span>
    <!-- A long meta wraps on its own side; the label never shrinks to one letter per line -->
    <span v-if="item.meta" class="min-w-0 max-w-1/2 py-1 text-right text-meta text-fg-muted">{{ item.meta }}</span>
    <Check v-if="radio && item.checked" class="size-4.5 shrink-0 text-action-fg" aria-hidden="true" />
  </component>
</template>

<script setup lang="ts">
// One entry of UiMenu (internal: UiMenu owns the keyboard and the open state). A link when it has `to`
// and is enabled; a radio item (aria-checked + check mark) when `checked` is set.
import { Check } from 'lucide-vue-next'
import type { MenuItem } from './Menu.vue'

const props = defineProps<{ item: MenuItem }>()
const emit = defineEmits<{ (e: 'choose', item: MenuItem, event: Event): void }>()

const NuxtLink = resolveComponent('NuxtLink')
const isLink = computed(() => props.item.to !== undefined && !props.item.disabled)
const radio = computed(() => props.item.checked !== undefined)
</script>
