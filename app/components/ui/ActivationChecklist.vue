<template>
  <UiSection v-if="!allDone" title="Primeiros passos" :description="`${doneCount} de ${items.length} concluídos`">
    <ul class="-mx-3 -mb-2 divide-y divide-line">
      <li v-for="item in items" :key="item.key">
        <!-- Done: plain text -->
        <div v-if="item.done" class="flex min-h-touch items-center gap-3 px-3 py-2">
          <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-action text-on-action" aria-hidden="true">
            <Check class="size-3.5" stroke-width="3" />
          </span>
          <span class="flex-1 text-meta text-fg-muted line-through">{{ item.label }}</span>
          <span class="sr-only">(feito)</span>
        </div>

        <!-- The first pending step carries the only primary of the screen (prd-4a-hoje-v3 RF-F5) -->
        <div v-else-if="primary && item.key === firstPending" class="flex items-center gap-3 px-3 py-2">
          <span class="size-5 shrink-0 rounded-full border-2 border-line-strong" aria-hidden="true" />
          <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span :id="`${uid}-${item.key}`" class="font-medium text-fg-strong">{{ item.label }}</span>
            <UiButton variant="primary" :to="item.to" :aria-describedby="`${uid}-${item.key}`" @click="select(item.key)">{{ item.cta }}</UiButton>
          </div>
        </div>

        <!-- Pending: the whole row leads to the action -->
        <component
          :is="item.to ? NuxtLink : 'button'"
          v-else
          v-bind="item.to ? { to: item.to } : { type: 'button' }"
          class="flex min-h-touch w-full items-center gap-3 rounded-row px-3 py-2 text-left transition-colors duration-nav hover:bg-subtle"
          @click="select(item.key)"
        >
          <span class="size-5 shrink-0 rounded-full border-2 border-line-strong" aria-hidden="true" />
          <span class="flex-1 font-medium text-fg-strong">{{ item.label }}</span>
          <ChevronRight class="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
        </component>
      </li>
    </ul>
  </UiSection>
</template>

<script setup lang="ts">
// Activation checklist of a new account (prd-4a-hoje-v3 RF-F5): five first steps, each pending one leads
// to its action; "Adicionar material" opens the "+ Adicionar" sheet of the shell (it writes into the first
// caderno when no other is open). With `primary`, the first pending step is the main action of the screen.
import { Check, ChevronRight } from 'lucide-vue-next'

export type ChecklistItem = 'topic' | 'material' | 'cards' | 'review' | 'streak'

const props = defineProps<{
  hasTopics: boolean
  hasMaterial: boolean
  hasCards: boolean
  hasReviewed: boolean
  streak: number
  /** First caderno: "cards" opens it. Without one, /cadernos offers to create it. */
  topicId?: string | null
  /** The first pending step gets the primary button (account without cards: it replaces the plan) */
  primary?: boolean
}>()

const emit = defineEmits<{ (e: 'select', item: ChecklistItem): void }>()

const NuxtLink = resolveComponent('NuxtLink')
const addSheet = useAddSheet()
const uid = useId()

const notebook = (tab?: 'cards') => cadernoPath(props.topicId, tab ? { tab } : {})

const items = computed<{ key: ChecklistItem; label: string; cta: string; done: boolean; to?: string }[]>(() => [
  { key: 'topic', label: 'Criar um caderno', cta: 'Criar caderno', done: props.hasTopics, to: '/cadernos?action=new-notebook' },
  { key: 'material', label: 'Adicionar material (nota ou PDF)', cta: 'Adicionar', done: props.hasMaterial },
  { key: 'cards', label: 'Gerar ou criar cards', cta: 'Criar cards', done: props.hasCards, to: notebook('cards') },
  { key: 'review', label: 'Fazer a primeira revisão', cta: 'Revisar', done: props.hasReviewed, to: '/revisar' },
  { key: 'streak', label: 'Estudar 3 dias seguidos', cta: 'Revisar', done: props.streak >= 3, to: '/revisar' },
])

const doneCount = computed(() => items.value.filter(i => i.done).length)
const allDone = computed(() => doneCount.value === items.value.length)
const firstPending = computed(() => items.value.find(i => !i.done)?.key)

function select(item: ChecklistItem) {
  emit('select', item)
  if (item === 'material') addSheet.show('checklist')
}
</script>
