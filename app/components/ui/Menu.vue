<template>
  <div ref="root" class="relative inline-flex">
    <slot name="trigger" :props="triggerProps" :open="open">
      <UiIconButton :icon="Ellipsis" :label="label" v-bind="triggerProps" />
    </slot>
    <div
      v-if="open"
      class="absolute top-full z-popover mt-1 min-w-56 rounded-control bg-float py-1 shadow-float"
      :class="align === 'end' ? 'right-0 w-max max-w-80' : 'left-0'"
      data-menu-panel
    >
      <slot name="header" />
      <div :id="menuId" ref="menu" role="menu" tabindex="-1" class="outline-none" :aria-labelledby="triggerId" @keydown="onMenuKeydown">
        <template v-for="(entry, e) in entries" :key="e">
          <div v-if="entry.separator" role="separator" class="mx-1 my-1 h-px bg-line" />
          <div v-if="entry.group" role="group" :aria-labelledby="`${menuId}-g${e}`">
            <span :id="`${menuId}-g${e}`" class="block px-3 pt-2 pb-1 text-label text-fg-muted">{{ entry.group }}</span>
            <UiMenuItem v-for="item in entry.items" :key="item.label" :item="item" @choose="choose" />
          </div>
          <UiMenuItem v-else :item="entry.items[0]!" @choose="choose" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Menu button (WAI-ARIA menu pattern, raio-X §D, tasks 12.2): Enter/Space/ArrowDown open on the first
// item, ArrowUp on the last; arrows cycle, Home/End, type-ahead by first letter; Esc closes and returns
// focus to the trigger; Tab and a click outside close. `align` picks the edge; `tone: 'danger'` for
// destructive items. Default trigger: an icon button ("Mais ações"); the `trigger` slot gets the props
// to v-bind on its own button. Replaces the 4 hand-made menus. The end-aligned panel sizes to its items
// (w-max, up to 20rem): its containing block is the 44 px trigger, and min-w-56 alone squeezed a label
// over its meta ("Relâmpago" under "5 minutos, os mais urgentes").
// Shell additions (navegação v3, AccountMenu): a `header` slot above the items (informative only: it is
// outside role="menu" and Tab closes the menu), `separator` (a divider above the item) and radio groups:
// consecutive items with the same `group` become role="group" labelled by it, and `checked` makes the
// item a menuitemradio (Aparência: Sistema/Claro/Escuro).
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
  /** Divider above the item */
  separator?: boolean
  /** Label of a radio group; consecutive items with the same group are one group */
  group?: string
  /** Radio item (role="menuitemradio"): whether it is the chosen one */
  checked?: boolean
}

const props = withDefaults(defineProps<{
  items: MenuItem[]
  /** Name of the default trigger (aria-label) */
  label?: string
  align?: 'start' | 'end'
}>(), { label: 'Mais ações', align: 'end' })

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const uid = useId()
const triggerId = `${uid}-trigger`
const menuId = `${uid}-menu`

/** Items folded into render entries: a radio group is one entry with its items. */
const entries = computed(() => {
  const out: { items: MenuItem[], group?: string, separator?: boolean }[] = []
  for (const item of props.items) {
    const last = out[out.length - 1]
    if (item.group && last?.group === item.group) last.items.push(item)
    else out.push({ items: [item], group: item.group, separator: item.separator })
  }
  return out
})

const triggerProps = computed(() => ({
  'id': triggerId,
  'aria-haspopup': 'menu' as const,
  'aria-expanded': open.value ? 'true' : 'false',
  'aria-controls': open.value ? menuId : undefined,
  'onClick': toggle,
  'onKeydown': onTriggerKeydown,
}))

function menuItems(): HTMLElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [])
}

function focusItem(index: number | 'last') {
  const list = menuItems()
  if (!list.length) return
  const i = index === 'last' ? list.length - 1 : (index + list.length) % list.length
  list[i]!.focus()
}

/** `null` (opened by pointer): focus the menu itself, so no item shows the keyboard ring; arrows still move. */
async function show(focus: number | 'last' | null = 0) {
  open.value = true
  await nextTick()
  if (focus === null) menu.value?.focus()
  else focusItem(focus)
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) document.getElementById(triggerId)?.focus()
}

function toggle() {
  if (open.value) hide()
  else show(null)
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
