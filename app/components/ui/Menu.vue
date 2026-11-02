<template>
  <div ref="root" class="relative inline-flex">
    <slot name="trigger" :props="triggerProps" :open="open">
      <UiIconButton :icon="Ellipsis" :label="label" v-bind="triggerProps" />
    </slot>
    <div
      v-if="open"
      :id="menuId"
      ref="menu"
      role="menu"
      :aria-labelledby="triggerId"
      class="absolute top-full z-popover mt-1 min-w-56 rounded-control border border-line bg-float py-1 shadow-float"
      :class="align === 'end' ? 'right-0' : 'left-0'"
      @keydown="onMenuKeydown"
    >
      <component
        :is="item.to !== undefined && !item.disabled ? NuxtLink : 'button'"
        v-for="(item, i) in items"
        :key="i"
        v-bind="item.to !== undefined && !item.disabled ? { to: item.to } : { type: 'button' }"
        role="menuitem"
        tabindex="-1"
        :aria-disabled="item.disabled ? 'true' : undefined"
        class="flex min-h-touch w-full items-center gap-3 px-3 text-left text-body -outline-offset-2"
        :class="[
          item.tone === 'danger' ? 'text-danger' : 'text-fg-strong',
          item.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-subtle',
        ]"
        @click="choose(item, $event)"
      >
        <component :is="item.icon" v-if="item.icon" class="size-4.5 shrink-0" :class="item.tone === 'danger' ? '' : 'text-fg-muted'" aria-hidden="true" />
        <span class="min-w-0 flex-1">{{ item.label }}</span>
        <span v-if="item.meta" class="shrink-0 text-meta text-fg-muted">{{ item.meta }}</span>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
// Menu button (WAI-ARIA menu pattern, raio-X §D, tasks 12.2): Enter/Space/ArrowDown open on the first
// item, ArrowUp on the last; arrows cycle, Home/End, type-ahead by first letter; Esc closes and returns
// focus to the trigger; Tab and a click outside close. `align` picks the edge; `tone: 'danger'` for
// destructive items. Default trigger: an icon button ("Mais ações"); the `trigger` slot gets the props
// to v-bind on its own button. Replaces the 4 hand-made menus.
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { Ellipsis } from 'lucide-vue-next'

export interface MenuItem {
  label: string
  to?: RouteLocationRaw
  onSelect?: () => void
  tone?: 'default' | 'danger'
  meta?: string
  icon?: Component
  disabled?: boolean
}

withDefaults(defineProps<{
  items: MenuItem[]
  /** Name of the default trigger (aria-label) */
  label?: string
  align?: 'start' | 'end'
}>(), { label: 'Mais ações', align: 'end' })

const NuxtLink = resolveComponent('NuxtLink')
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const uid = useId()
const triggerId = `${uid}-trigger`
const menuId = `${uid}-menu`

const triggerProps = computed(() => ({
  'id': triggerId,
  'aria-haspopup': 'menu' as const,
  'aria-expanded': open.value ? 'true' : 'false',
  'aria-controls': open.value ? menuId : undefined,
  'onClick': toggle,
  'onKeydown': onTriggerKeydown,
}))

function menuItems(): HTMLElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])
}

function focusItem(index: number | 'last') {
  const list = menuItems()
  if (!list.length) return
  const i = index === 'last' ? list.length - 1 : (index + list.length) % list.length
  list[i]!.focus()
}

async function show(focus: number | 'last' = 0) {
  open.value = true
  await nextTick()
  focusItem(focus)
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) document.getElementById(triggerId)?.focus()
}

function toggle() {
  if (open.value) hide()
  else show()
}

function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    show(0)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    show('last')
  }
}

function onMenuKeydown(e: KeyboardEvent) {
  const list = menuItems()
  const current = list.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown') focusItem(current + 1)
  else if (e.key === 'ArrowUp') focusItem(current - 1)
  else if (e.key === 'Home') focusItem(0)
  else if (e.key === 'End') focusItem('last')
  else if (e.key === 'Escape') {
    e.stopPropagation()
    hide()
  } else if (e.key === 'Tab') {
    hide(false)
    return
  } else if (e.key.length === 1 && /\S/.test(e.key)) {
    const key = e.key.toLowerCase()
    const order = [...list.slice(current + 1), ...list.slice(0, current + 1)]
    order.find(el => el.textContent?.trim().toLowerCase().startsWith(key))?.focus()
  } else return
  e.preventDefault()
}

function choose(item: MenuItem, event: Event) {
  if (item.disabled) {
    event.preventDefault()
    return
  }
  hide()
  item.onSelect?.()
}

function onPointerDown(e: PointerEvent) {
  if (root.value && !root.value.contains(e.target as Node)) hide(false)
}

watch(open, (v) => {
  if (v) document.addEventListener('pointerdown', onPointerDown, true)
  else document.removeEventListener('pointerdown', onPointerDown, true)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true))

defineExpose({ show, hide })
</script>
