<template>
  <div
    v-if="visible"
    ref="bar"
    role="toolbar"
    aria-label="Ações para o trecho selecionado"
    data-testid="selection-actions"
    class="z-popover flex flex-wrap items-center gap-1 rounded-control border border-line-strong bg-float p-1 shadow-float"
    :class="mobile ? 'fixed inset-x-gutter bottom-[calc(var(--nav-h)+var(--miniplayer-h)+var(--sticky-action-h)+8px)] justify-center' : 'absolute -translate-x-1/2'"
    :style="mobile ? undefined : position"
    @mousedown.prevent
    @keydown.esc="hide"
  >
    <UiButton size="sm" variant="ghost" :icon-left="Zap" @click="choose('card')">Criar card</UiButton>
    <UiButton
      size="sm"
      variant="ghost"
      :icon-left="Sparkles"
      icon-tone="action"
      :disabled="!!aiBlocked"
      :aria-describedby="aiBlocked ? reasonId : undefined"
      @click="choose('ai3')"
    >
      Gerar 3 cards com IA
    </UiButton>
    <UiButton size="sm" variant="ghost" :icon-left="MessageCircleQuestion" @click="choose('ask')">Perguntar ao tira-dúvidas</UiButton>
    <p v-if="aiBlocked" :id="reasonId" class="w-full px-2 pb-1 text-label text-fg-muted">{{ aiBlocked }}</p>
  </div>
</template>

<script setup lang="ts">
// Actions on the selected excerpt of the material (prd-4c-material-v3 RF-F5), in reading and in editing:
// "Criar card" (the card form with the excerpt, its origin recorded), "Gerar 3 cards com IA" (RF-B5,
// 40–4.000 characters, disabled with the reason outside that) and "Perguntar ao tira-dúvidas". Listens
// to the page selection inside `root` (the reader), so it works on a read-only editor too. On the phone
// it is a bar fixed above the bottom bar, out of the way of the native selection menu.
import { MessageCircleQuestion, Sparkles, Zap } from 'lucide-vue-next'
import { SELECTION_MAX, SELECTION_MIN } from '~/composables/useMaterialEditor'

export type SelectionAction = 'card' | 'ai3' | 'ask'

const props = defineProps<{
  /** The element the selection must be inside (the text of the note); `relative`, the bar sits in it */
  root: HTMLElement | null | undefined
  mobile?: boolean
}>()
const emit = defineEmits<{ (e: 'action', action: SelectionAction, text: string): void }>()

const visible = ref(false)
const text = ref('')
const position = ref<Record<string, string>>({})
const bar = ref<HTMLElement | null>(null)
const reasonId = useId()

const aiBlocked = computed(() => {
  const n = text.value.length
  if (n > SELECTION_MAX) return 'Para gerar cards, selecione até 4 mil caracteres.'
  if (n < SELECTION_MIN) return 'Para gerar cards, selecione pelo menos uma frase.'
  return ''
})

function hide() {
  visible.value = false
}

function update() {
  const sel = window.getSelection()
  const root = props.root
  // Focus on the bar itself (keyboard): keep the last excerpt
  if (bar.value?.contains(document.activeElement)) return
  if (!sel || sel.isCollapsed || !root || !sel.rangeCount) return hide()
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return hide()
  const value = sel.toString().trim()
  if (!value) return hide()
  text.value = value
  if (!props.mobile) {
    const box = range.getBoundingClientRect()
    // The bar is absolute inside `root` (relative): offsets from its box
    const origin = root.getBoundingClientRect()
    position.value = { top: `${box.bottom - origin.top + 8}px`, left: `${box.left + box.width / 2 - origin.left}px` }
  }
  visible.value = true
}

let frame = 0
function onSelectionChange() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(update)
}

function choose(action: SelectionAction) {
  if (action === 'ai3' && aiBlocked.value) return
  const value = text.value
  hide()
  window.getSelection()?.removeAllRanges()
  emit('action', action, value)
}

onMounted(() => document.addEventListener('selectionchange', onSelectionChange))
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  document.removeEventListener('selectionchange', onSelectionChange)
})
</script>
