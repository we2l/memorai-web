<template>
  <component
    :is="to !== undefined ? NuxtLink : 'a'"
    v-bind="bindings"
    class="hit-touch rounded-tag underline-offset-2 transition-colors duration-fast hover:underline"
    :class="[
      variant === 'muted' ? 'text-fg-muted hover:text-fg-strong' : 'font-semibold text-action-fg hover:text-action-hover',
      standalone && 'inline-flex min-h-touch items-center gap-1',
    ]"
  >
    <slot />
    <template v-if="external">
      <ExternalLink class="ml-0.5 inline size-3.5 align-baseline" aria-hidden="true" />
      <span class="sr-only">(abre em nova aba)</span>
    </template>
  </component>
</template>

<script setup lang="ts">
// Text link (raio-X §D): replaces the 25 link-like buttons and the copies of
// `hover:underline text-accent-primary`. Inline links are exempt from the 44 px target (WCAG 2.5.8);
// a link on its own line uses `standalone`.
import { ExternalLink } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  to?: RouteLocationRaw
  href?: string
  variant?: 'action' | 'muted'
  /** Opens in a new tab, with rel="noopener noreferrer" and a hidden notice */
  external?: boolean
  /** Link on its own line: 44 px touch target */
  standalone?: boolean
}>(), { to: undefined, href: undefined, variant: 'action' })

const NuxtLink = resolveComponent('NuxtLink')
const bindings = computed(() => {
  const target = props.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  return props.to !== undefined ? { to: props.to, ...target } : { href: props.href, ...target }
})
</script>
