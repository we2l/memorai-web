<template>
  <div>
    <div
      role="tablist"
      :aria-label="label"
      class="flex gap-1 overflow-x-auto border-b border-line"
      @keydown="onKeydown"
    >
      <button
        v-for="tab in tabs"
        :id="tabId(tab.key)"
        :key="tab.key"
        ref="buttons"
        type="button"
        role="tab"
        :aria-selected="tab.key === modelValue"
        :aria-controls="$slots.default ? panelId : undefined"
        :tabindex="tab.key === activeKey ? 0 : -1"
        class="-mb-px min-h-touch shrink-0 whitespace-nowrap border-b-2 px-3 text-body font-medium transition-colors duration-nav"
        :class="tab.key === modelValue ? 'border-action text-fg-strong' : 'border-transparent text-fg-muted hover:text-fg-strong'"
        @click="select(tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="ml-1 text-meta tabular-nums text-fg-muted">{{ tab.count }}</span>
      </button>
    </div>
    <div v-if="$slots.default" :id="panelId" role="tabpanel" :aria-labelledby="tabId(modelValue)" tabindex="0" class="pt-4">
      <slot :active="modelValue" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Tabs (WAI-ARIA tabs pattern): roving tabindex, arrows/Home/End select. For the remaining uses
// (HubTabs, /provas); the Caderno will not have tabs (ADR-027 §7). With a default slot it also
// renders the tabpanel, labelled by the selected tab.
export interface TabItem {
  key: string
  label: string
  count?: number
}

const props = defineProps<{
  modelValue: string
  tabs: TabItem[]
  /** Accessible name of the tablist */
  label: string
  /** Remembers the last tab in localStorage */
  storageKey?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const uid = useId()
const panelId = `${uid}-panel`
const tabId = (key: string) => `${uid}-tab-${key}`
const buttons = ref<HTMLButtonElement[]>([])
const activeKey = computed(() => (props.tabs.some(t => t.key === props.modelValue) ? props.modelValue : props.tabs[0]?.key))

function select(key: string) {
  emit('update:modelValue', key)
  if (props.storageKey) {
    try { localStorage.setItem(props.storageKey, key) } catch { /* intencional: sem localStorage a aba só não é lembrada */ }
  }
}

function onKeydown(e: KeyboardEvent) {
  const n = props.tabs.length
  if (!n) return
  const current = Math.max(0, props.tabs.findIndex(t => t.key === activeKey.value))
  const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: n - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  const index = (next + n) % n
  select(props.tabs[index]!.key)
  nextTick(() => buttons.value[index]?.focus())
}
</script>
