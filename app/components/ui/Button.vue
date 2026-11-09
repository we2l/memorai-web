<template>
  <component
    :is="tag"
    ref="root"
    v-bind="bindings"
    :class="classes"
    :aria-disabled="ariaDisabled"
    :aria-busy="loading ? 'true' : undefined"
    @click="onClick"
  >
    <UiSpinner v-if="loading" :size="size" />
    <component :is="iconLeft" v-else-if="iconLeft" :class="iconClass" aria-hidden="true" />
    <span v-if="size === 'rating'" class="flex flex-col items-center gap-px">
      <slot />
      <span v-if="$slots.hint" class="text-label font-medium" :class="variant === 'primary' ? 'text-on-action' : 'text-fg-muted'"><slot name="hint" /></span>
    </span>
    <slot v-else />
    <component :is="iconRight" v-if="iconRight" :class="iconClass" aria-hidden="true" />
  </component>
</template>

<script setup lang="ts">
// DS button, E2 skin (ADR-035 §3-§4, prd-visual-e2 RF-1.1): a pill. One primary per screen, purple with the inner
// highlight and the diffuse purple shadow (shadow-action); secondary on the soft surface, outline white with the
// layered shadow, ghost bare. Pressed: scale(.97) in 140 ms, off with prefers-reduced-motion. `rating` is the
// 62 px button of the review, with the interval under the label (slot `hint`). The others may carry the colored
// icon of a practice mode (iconTone: color only on the icon, never as fill).
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'rating'
export type IconTone = 'action' | 'quiz' | 'listen'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  /** md: 44 px; lg: 54 px; rating: 62 px with the hint under the label; sm: 36 px with the touch area stretched to 44 px */
  size?: ButtonSize
  to?: RouteLocationRaw
  href?: string
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  iconLeft?: Component
  iconRight?: Component
  /** Colors only the icon (practice mode); ignored on primary, whose icon follows the text */
  iconTone?: IconTone
}>(), {
  variant: 'secondary',
  size: 'md',
  to: undefined,
  href: undefined,
  type: 'button',
  iconLeft: undefined,
  iconRight: undefined,
  iconTone: undefined,
})

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const NuxtLink = resolveComponent('NuxtLink')
const root = ref<HTMLElement | { $el: HTMLElement } | null>(null)

// Loading keeps the focus (aria-disabled, no native disabled); disabled links lose the href
const inert = computed(() => props.disabled || props.loading)
const isLink = computed(() => props.to !== undefined || props.href !== undefined)
const tag = computed(() => {
  if (!isLink.value) return 'button'
  return props.to !== undefined && !inert.value ? NuxtLink : 'a'
})
const bindings = computed(() => {
  if (!isLink.value) return { type: props.type, disabled: props.disabled || undefined }
  if (inert.value) return {}
  return props.to !== undefined ? { to: props.to } : { href: props.href }
})
const ariaDisabled = computed(() => (inert.value && (isLink.value || props.loading) ? 'true' : undefined))

const PRESS = 'active:scale-97 motion-reduce:active:scale-100'
const VARIANTS: Record<ButtonVariant, { rest: string; live: string }> = {
  primary: { rest: 'bg-action text-on-action shadow-action', live: `hover:bg-action-hover ${PRESS}` },
  secondary: { rest: 'bg-soft text-fg-strong', live: `hover:bg-sunk ${PRESS}` },
  outline: { rest: 'bg-raised text-fg-strong shadow-1', live: `hover:bg-soft ${PRESS}` },
  ghost: { rest: 'text-fg-strong', live: `hover:bg-soft ${PRESS}` },
  danger: { rest: 'bg-danger-subtle text-danger', live: `hover:shadow-1 ${PRESS}` },
}
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-touch rounded-chip px-4.5 text-body-sm',
  lg: 'min-h-13.5 rounded-chip px-6 text-body',
  rating: 'min-h-15.5 flex-col rounded-rating px-2 text-title',
  sm: 'min-h-9 rounded-chip px-3 text-meta before:absolute before:-inset-1',
}
const ICON_TONES: Record<IconTone, string> = { action: 'text-action-fg', quiz: 'text-quiz', listen: 'text-listen' }

const classes = computed(() => {
  const v = VARIANTS[props.variant]
  let state = `${v.rest} ${v.live}`
  if (props.disabled) {
    // Primary disabled stays >= 3:1 in both themes (fg-muted on line-strong)
    state = props.variant === 'primary' ? 'bg-line-strong text-fg-muted cursor-not-allowed' : `${v.rest} opacity-50 cursor-not-allowed`
  } else if (props.loading) {
    state = `${v.rest} cursor-progress`
  }
  return [
    'relative inline-flex items-center justify-center gap-2 font-semibold text-center text-balance select-none transition duration-press ease-out',
    SIZES[props.size],
    state,
    props.block && 'w-full',
  ]
})

const iconClass = computed(() => [
  'shrink-0',
  props.size === 'sm' ? 'size-4' : 'size-4.5',
  props.variant !== 'primary' && props.iconTone ? ICON_TONES[props.iconTone] : '',
])

function onClick(event: MouseEvent) {
  if (inert.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}

useScopedLimit(
  'variant="primary"',
  () => { const r = root.value; return r && '$el' in r ? r.$el : r },
  () => props.variant === 'primary',
)
</script>
