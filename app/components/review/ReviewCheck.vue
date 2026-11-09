<template>
  <!-- Certo / Errado / Em branco (prd-revisao-v5-fase-b RF-F5) -->
  <div v-if="check.mode === 'true_false'" class="flex flex-col gap-2" data-testid="review-check" data-mode="true_false">
    <template v-if="!flipped">
      <div role="group" aria-label="Sua resposta" class="grid grid-cols-2 gap-2">
        <UiButton block aria-keyshortcuts="C" data-testid="check-certo" @click="choose('certo')">
          <kbd class="hidden rounded-tag border border-line-strong px-1 font-sans text-label text-fg-muted pointer-fine:inline" aria-hidden="true">C</kbd> Certo
        </UiButton>
        <UiButton block aria-keyshortcuts="E" data-testid="check-errado" @click="choose('errado')">
          <kbd class="hidden rounded-tag border border-line-strong px-1 font-sans text-label text-fg-muted pointer-fine:inline" aria-hidden="true">E</kbd> Errado
        </UiButton>
      </div>
      <UiButton variant="ghost" block aria-keyshortcuts="B" data-testid="check-blank" @click="choose('blank')">Deixar em branco</UiButton>
    </template>
    <template v-else>
      <p class="text-center text-body text-fg" data-testid="check-result">
        <template v-if="choice === 'blank'">Em branco · Gabarito: <strong class="text-fg-strong">{{ gabarito }}</strong></template>
        <template v-else>Você marcou {{ choice === 'certo' ? 'Certo' : 'Errado' }} · Gabarito: <strong class="text-fg-strong">{{ gabarito }}</strong></template>
      </p>
      <UiButton variant="primary" block aria-keyshortcuts="Enter Space" data-testid="check-continue" @click="confirm">Continuar</UiButton>
    </template>
  </div>

  <!-- Typed answer (RF-F6) -->
  <div v-else class="flex flex-col gap-2" data-testid="review-check" data-mode="typed">
    <form v-if="!flipped" class="flex flex-col gap-2" @submit.prevent="submitTyped">
      <UiInput
        ref="inputRef"
        v-model="typed"
        label="Sua resposta"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        :spellcheck="false"
        enterkeyhint="done"
        data-testid="check-input"
      />
      <div class="grid grid-cols-[1fr_auto] gap-2">
        <UiButton type="submit" variant="primary" block data-testid="check-submit">Conferir</UiButton>
        <UiButton variant="ghost" data-testid="check-dont-know" @click="dontKnow">Não sei</UiButton>
      </div>
      <button type="button" class="hit-touch self-center text-meta text-fg-muted underline underline-offset-2 hover:text-fg" data-testid="check-skip" @click="$emit('skip')">
        Lembrar sem digitar
      </button>
    </form>
    <template v-else>
      <div class="rounded-control bg-soft px-3 py-2 text-body" data-testid="check-diff">
        <p class="text-meta text-fg-muted">{{ matched ? 'Igual à resposta' : typed.trim() ? 'Diferente da resposta' : 'Sem resposta digitada' }}</p>
        <p v-if="typed.trim()" class="break-words">
          <template v-for="(part, i) in diff" :key="i">
            <span v-if="part.kind === 'same'" class="text-fg-strong">{{ part.text }}</span>
            <span v-else-if="part.kind === 'missing'" class="rounded-tag bg-raised px-1 font-semibold text-fg-strong underline decoration-2 underline-offset-2"><span class="sr-only">faltou: </span>{{ part.text }}</span>
            <span v-else class="text-fg-muted line-through"><span class="sr-only">a mais: </span>{{ part.text }}</span>{{ ' ' }}
          </template>
        </p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <template v-if="matched">
          <UiButton block data-testid="check-wrong" @click="settle('wrong')">Errei</UiButton>
          <UiButton ref="primaryRef" variant="primary" block data-testid="check-right" @click="settle('correct')">Acertei</UiButton>
        </template>
        <template v-else>
          <UiButton block data-testid="check-count-right" @click="settle('correct')">Contar como certo</UiButton>
          <UiButton ref="primaryRef" variant="primary" block data-testid="check-wrong" @click="settle('wrong')">Errei</UiButton>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Verification where the card allows it (prd-revisao-v5-fase-b RF-F5, RF-F6): it replaces the self-rating of the card.
// Certo/Errado: the choice turns the card, the answer key shows next to the choice, "Continuar" sends it (correct =
// Good; wrong or blank = Again, B-D6). Typed: "Conferir" turns the card and shows the word diff (accents, case and
// punctuation ignored, B-D7); the person has the last word ("Contar como certo"), and typed_match records what the
// comparison said. Two outcomes in either button mode (B-D8). Keys: C, E, B and Enter (the page wires C/E/B).
import type { CardCheck } from '~/types'
import type { ReviewAnswer } from '~/stores/review'
import { answerDiff, answersMatch } from '~/utils/answerCheck'

const props = defineProps<{ check: CardCheck; flipped: boolean }>()
const emit = defineEmits<{
  (e: 'flip'): void
  (e: 'rate', rating: 1 | 3, answer: ReviewAnswer): void
  (e: 'skip'): void
  /** The first key typed: the pill of the previous card leaves */
  (e: 'typing'): void
}>()

const choice = ref<'certo' | 'errado' | 'blank' | null>(null)
const typed = ref('')
const inputRef = ref<{ focus?: () => void } | null>(null)
const primaryRef = ref<{ $el?: HTMLElement } | null>(null)

const gabarito = computed(() => (props.check.mode === 'true_false' && props.check.answer === 'certo' ? 'Certo' : 'Errado'))
watch(typed, (v, old) => { if (v && !old) emit('typing') })
const matched = computed(() => props.check.mode === 'typed' && answersMatch(typed.value, props.check.answer))
const diff = computed(() => (props.check.mode === 'typed' ? answerDiff(typed.value, props.check.answer) : []))

function choose(c: 'certo' | 'errado' | 'blank') {
  if (props.flipped) return
  choice.value = c
  emit('flip')
}
function confirm() {
  if (props.check.mode !== 'true_false' || !choice.value) return
  const outcome = choice.value === 'blank' ? 'blank' : choice.value === props.check.answer ? 'correct' : 'wrong'
  emit('rate', outcome === 'correct' ? 3 : 1, { answer_mode: 'true_false', answer_outcome: outcome })
}

function submitTyped() {
  emit('flip')
}
function dontKnow() {
  typed.value = ''
  emit('flip')
}
function settle(outcome: 'correct' | 'wrong') {
  const blank = !typed.value.trim()
  emit('rate', outcome === 'correct' ? 3 : 1, {
    answer_mode: 'typed',
    answer_outcome: blank && outcome === 'wrong' ? 'blank' : outcome,
    typed_match: matched.value,
  })
}

// Enter on the turned card = the primary (Continuar / Acertei / Errei); the page's shortcuts are off for checked cards
function onKey(e: KeyboardEvent) {
  if (!props.flipped || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
  if ((e.target as HTMLElement | null)?.closest?.('button, a, input, textarea')) return
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  if (props.check.mode === 'true_false') confirm()
  else settle(matched.value ? 'correct' : 'wrong')
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))

// Focus follows the step: the field on a pointer device (never pops the phone keyboard), then the primary
onMounted(() => {
  if (props.check.mode === 'typed' && !props.flipped && window.matchMedia?.('(pointer: fine)').matches) nextTick(() => inputRef.value?.focus?.())
})
watch(() => props.flipped, (f) => {
  if (f && props.check.mode === 'typed') nextTick(() => primaryRef.value?.$el?.focus?.())
})

defineExpose({ choose })
</script>
