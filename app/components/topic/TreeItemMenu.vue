<template>
  <!-- Always visible below lg (touch), hover/focus on desktop (RF-F6.1) -->
  <div
    ref="root"
    class="tree-menu relative max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
    :class="{ '!opacity-100': open }"
    @click.stop
    @keydown.stop
  >
    <button
      ref="trigger"
      type="button"
      class="relative w-7 h-7 inline-flex items-center justify-center rounded text-base-muted hover:text-base-primary hover:bg-surface-secondary transition-colors touch-target"
      :aria-label="`Opções de ${name}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="open ? menuId : undefined"
      @click="toggle"
      @keydown.down.prevent="openAndFocus(0)"
    >
      <MoreHorizontal :size="14" aria-hidden="true" />
    </button>
    <div
      v-if="open"
      :id="menuId"
      ref="menu"
      role="menu"
      :aria-label="`Opções de ${name}`"
      class="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-card)] border border-base rounded-lg shadow-lg py-1 z-50"
      @keydown="onMenuKeydown"
    >
      <button
        v-for="(item, i) in items"
        :key="item.key"
        type="button"
        role="menuitem"
        tabindex="-1"
        class="w-full text-left px-3 min-h-[44px] text-small transition-colors focus:outline-none focus-visible:bg-surface-secondary"
        :class="item.danger ? 'text-[var(--badge-danger-text)] hover:bg-[var(--badge-danger-bg)]' : 'text-base-primary hover:bg-surface-secondary'"
        :data-index="i"
        @click="choose(item.key)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MoreHorizontal } from 'lucide-vue-next'

const props = defineProps<{ name: string; canAddChild?: boolean }>()
const emit = defineEmits<{ (e: 'action', key: 'add-child' | 'edit' | 'delete'): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const menuId = `tree-menu-${Math.random().toString(36).slice(2, 9)}`

const items = computed(() => [
  ...(props.canAddChild !== false ? [{ key: 'add-child' as const, label: 'Adicionar tópico' }] : []),
  { key: 'edit' as const, label: 'Editar' },
  { key: 'delete' as const, label: 'Excluir', danger: true },
])

function focusItem(i: number) {
  const buttons = menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
  if (!buttons?.length) return
  const idx = (i + buttons.length) % buttons.length
  buttons[idx]?.focus()
}

async function openAndFocus(i: number) {
  open.value = true
  await nextTick()
  focusItem(i)
}

function toggle() {
  if (open.value) close(false)
  else openAndFocus(0)
}

function close(returnFocus = true) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function choose(key: 'add-child' | 'edit' | 'delete') {
  close(false)
  emit('action', key)
}

// Outside tap closes (a teleported backdrop would sit above the menu's stacking context)
function onDocPointer(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close(false)
}
watch(open, (v) => {
  if (v) document.addEventListener('pointerdown', onDocPointer, true)
  else document.removeEventListener('pointerdown', onDocPointer, true)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer, true))

function onMenuKeydown(e: KeyboardEvent) {
  const current = Number((document.activeElement as HTMLElement)?.dataset?.index ?? -1)
  if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(current + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(current - 1) }
  else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
  else if (e.key === 'End') { e.preventDefault(); focusItem(items.value.length - 1) }
  else if (e.key === 'Escape') { e.preventDefault(); close(true) }
  else if (e.key === 'Tab') close(false)
}
</script>

<style scoped>
/* 44×44 touch area without changing the visual size */
.touch-target::after {
  content: '';
  position: absolute;
  inset: -8px;
}
</style>
