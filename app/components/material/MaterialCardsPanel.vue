<template>
  <UiSection :title="inSheet ? undefined : title" :variant="inSheet ? 'plain' : 'raised'" :level="2" data-testid="material-cards-panel">
    <template v-if="!workshop && errorsCount > 0" #action>
      <UiMenu :items="menuItems" label="Mais opções dos cards" />
    </template>

    <!-- The workshop (AI) inside the panel: the reader stays on screen -->
    <slot v-if="workshop" name="workshop" />

    <!-- No card from this note yet -->
    <div v-else-if="!total" class="flex flex-col gap-3">
      <p class="text-meta text-fg-muted">{{ emptyText }}</p>
      <template v-if="canGenerate.ok">
        <UiButton
          :variant="primary === 'generate' ? 'primary' : 'secondary'"
          :icon-left="Sparkles"
          :icon-tone="primary === 'generate' ? undefined : 'action'"
          block
          :disabled="busy || spent"
          data-testid="panel-generate"
          @click="$emit('generate')"
        >
          Gerar cards {{ partWord }} com IA
        </UiButton>
        <!-- The paid plan from 80% of the month (prd-uso-justo RF-F3): the line of the quota instead -->
        <LazyPlansUsageNotice v-if="usage?.nearLimit('cards_ai')" feature="cards_ai" :usage="usage" />
        <p v-else class="text-label text-fg-muted">{{ quotaText }}</p>
      </template>
      <!-- The paid plan at the limit: the day it starts again, never "Ver planos" (RN-3) -->
      <LazyPlansUsageNotice v-else-if="paid && spent" feature="cards_ai" :usage="usage!" />
      <p v-else-if="paid" class="text-meta text-fg" role="status">{{ paidSpentText }}</p>
      <p v-else class="text-meta text-fg">
        {{ spentText }} <UiLink to="/planos">Ver planos</UiLink>
      </p>
      <UiButton variant="ghost" :icon-left="Plus" block @click="$emit('create-card')">Criar card</UiButton>
    </div>

    <!-- Cards of the note: the next ones by due date -->
    <template v-else>
      <ul class="-mx-1 divide-y divide-line" aria-label="Próximos cards">
        <li v-for="card in rows" :key="card.id" class="px-1 py-2.5" data-testid="panel-card">
          <p class="line-clamp-2 text-meta text-fg-strong">
            <UiTag :tone="card.state.tone" class="mr-1.5 align-middle">{{ card.state.label }}</UiTag>{{ card.front }}
          </p>
        </li>
      </ul>
      <div class="mt-3 flex flex-col gap-2">
        <UiButton
          v-if="sessionCount > 0"
          :variant="primary === 'review' ? 'primary' : 'secondary'"
          block
          :to="reviewPath({ type: 'note', id: noteId })"
          data-testid="panel-review"
          @click="$emit('review', sessionCount)"
        >
          Revisar {{ sessionCount === 1 ? 'este 1' : `estes ${sessionCount}` }} de hoje
        </UiButton>
        <UiButton
          v-else-if="aheadCount > 0"
          block
          :to="reviewPath({ type: 'note', id: noteId }, { ahead: true })"
          data-testid="panel-ahead"
        >
          Praticar adiantado ({{ aheadCount }})
        </UiButton>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <UiLink :to="libraryTo" standalone data-testid="panel-library">Ver {{ total === 1 ? 'o card' : `os ${total} cards` }}</UiLink>
          <span class="flex gap-1">
            <UiIconButton :icon="Plus" label="Criar card" size="sm" @click="$emit('create-card')" />
            <UiIconButton v-if="canGenerate.ok" :icon="Sparkles" :label="`Gerar mais cards com IA (${quotaShort})`" size="sm" :disabled="busy || spent" @click="$emit('generate')" />
          </span>
        </div>
      </div>
    </template>
  </UiSection>
</template>

<script setup lang="ts">
// "Cards desta parte" (prd-4c-material-v3 RF-F4, RF-F8): the cards that came from the open note, with the
// state of each in words, and the way to review only them ("Revisar estes N" = session_count of
// scope=note:, the same number the session opens). Without cards: the AI generation with the quota said
// before ("Usa 1 das suas 9 gerações do mês"). The workshop of the AI opens in here (slot), next to the text.
import { Plus, Sparkles } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { LibraryCard, NoteMaterial } from '~/types'
import { cardState } from '~/utils/cardState'
import { htmlToPlain } from '~/utils/html'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{
  context: NoteMaterial
  cards: LibraryCard[]
  /** The route scope (the library opens there) */
  topicId: string
  noteId: string
  /** The workshop is open (generating or waiting for the accept) */
  workshop?: boolean
  /** A generation is on its way */
  busy?: boolean
  /** Which action is the screen's primary (RF-F8) */
  primary?: 'review' | 'generate' | null
  /** Inside the phone's sheet (the sheet already says the title) */
  inSheet?: boolean
  /** The screen's /usage (the paid plan's 80% line and limit, prd-uso-justo RF-F3) */
  usage?: ReturnType<typeof usePaidQuota>
}>()

defineEmits<{
  (e: 'generate'): void
  (e: 'create-card'): void
  (e: 'review', count: number): void
}>()

const isPart = computed(() => props.context.note.kind === 'part')
const partWord = computed(() => (isPart.value ? 'desta parte' : 'desta nota'))
const total = computed(() => props.context.cards.total)
const sessionCount = computed(() => props.context.cards.session_count)
const aheadCount = computed(() => props.context.cards.ahead_count)
const errorsCount = computed(() => props.context.cards.errors_count)
const canGenerate = computed(() => props.context.can_generate)

const title = computed(() => `Cards ${partWord.value}${total.value ? ` (${total.value})` : ''}`)
const emptyText = computed(() => (isPart.value
  ? 'Esta parte ainda não tem cards. Gere a partir do texto ou crie da seleção.'
  : 'Esta nota ainda não tem cards. Gere a partir do texto ou crie da seleção.'))

// The trial counts its own 7 days, also when this click opens it (prd-planos-lancamento RF-F7b)
const auth = useAuthStore()
const period = computed(() => (auth.onTrial || auth.opensTrialOnUse ? 'teste' : 'mês'))
const spentText = computed(() => {
  if (auth.onTrial) return 'Você usou as gerações de cards do teste.'
  return auth.user?.plan === 'pro' ? 'Você usou as gerações de cards do mês.' : 'Os cards com IA não entram no plano Grátis.'
})
// The paid plan has a monthly quota too (prd-uso-justo RF-F1): never "sem limite" for the AI
const paid = computed(() => auth.user?.plan === 'pro' && !auth.onTrial)
const spent = computed(() => !!props.usage?.atLimit('cards_ai'))
const paidSpentText = computed(() => `Você usou as gerações de cards deste mês. A contagem recomeça em ${nextMonthStartLabel()}.`)
const quotaShort = computed(() => {
  const left = canGenerate.value.remaining
  return left == null ? 'usa 1 geração' : `${left} ${left === 1 ? 'geração restante' : 'gerações restantes'} no ${period.value}`
})
const quotaText = computed(() => {
  const left = canGenerate.value.remaining
  const uses = left == null ? 'Usa 1 geração' : `Usa 1 das suas ${left} ${left === 1 ? 'geração' : 'gerações'} do ${period.value}`
  return `${uses} · cerca de 15 cards · você revisa antes de salvar`
})

const rows = computed(() => props.cards.map(c => ({ id: c.id, front: htmlToPlain(c.front), state: cardState(c) })))

const libraryTo = computed(() => `${cadernoPath(props.topicId, { view: 'cards' })}?origin=note:${props.noteId}`)

const menuItems = computed<MenuItem[]>(() => [
  { label: `Só erros (${errorsCount.value})`, to: reviewPath({ type: 'note', id: props.noteId }, { errorsOnly: true }) },
])
</script>
