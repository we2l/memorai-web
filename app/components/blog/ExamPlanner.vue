<template>
  <section class="rounded-card bg-raised p-5 shadow-1 sm:p-6" :aria-labelledby="titleId" data-testid="tool-plan">
    <!-- On its own page the H1 already names the tool: the heading stays for screen readers only -->
    <h2 :id="titleId" class="mb-1 text-section text-fg-strong" :class="!embedded && 'sr-only'">Plano até a prova</h2>
    <p v-if="embedded" class="mb-5 text-meta text-fg-muted">Quanto revisar por dia para chegar à prova lembrando do que estudou.</p>

    <div class="grid gap-4 sm:grid-cols-3">
      <UiInput
        id="plan-date"
        :model-value="date"
        label="Data da prova"
        type="date"
        :min="minDate"
        :max="maxDate"
        :error="dateError"
        data-testid="tool-plan-date"
        @update:model-value="onDate"
      />
      <UiInput
        id="plan-cards"
        :model-value="cardsText"
        label="Quantos cards você quer dominar?"
        type="number"
        inputmode="numeric"
        min="10"
        max="20000"
        hint="Não sabe? Conte 2 ou 3 por página de resumo"
        :error="cardsError"
        data-testid="tool-plan-cards"
        @update:model-value="onCards"
      />
      <UiInput
        id="plan-studied"
        :model-value="studiedText"
        label="Quantos você já estudou?"
        type="number"
        inputmode="numeric"
        min="0"
        optional
        :error="studiedError"
        data-testid="tool-plan-studied"
        @update:model-value="onStudied"
      />
    </div>

    <div v-if="plan" class="mt-6" aria-live="polite" data-testid="tool-plan-result">
      <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt class="text-label text-fg-muted">Cards novos por dia</dt>
          <dd class="num-m text-fg-strong" data-testid="tool-plan-new">{{ plan.newPerDay }}</dd>
        </div>
        <div>
          <dt class="text-label text-fg-muted">Revisões por dia (média)</dt>
          <dd class="num-m text-fg-strong" data-testid="tool-plan-reviews">{{ plan.reviewsAvg }}</dd>
        </div>
        <div>
          <dt class="text-label text-fg-muted">Minutos por dia (média)</dt>
          <dd class="num-m text-fg-strong" data-testid="tool-plan-minutes">{{ plan.minutesAvg }}</dd>
        </div>
        <div>
          <dt class="text-label text-fg-muted">Lembrança no dia da prova</dt>
          <dd class="num-m text-fg-strong" data-testid="tool-plan-recall">{{ Math.round(plan.recallOnExam * 100) }}%</dd>
        </div>
      </dl>
      <ul class="mt-5 flex flex-col gap-2 text-body text-fg">
        <li>Faltam <strong>{{ plan.days }} {{ plan.days === 1 ? 'dia' : 'dias' }}</strong>. Os cards novos entram nos primeiros {{ plan.newDays }}; {{ plan.days > plan.newDays ? `os últimos ${plan.days - plan.newDays} ficam só para revisão` : 'não sobra dia só de revisão' }}.</li>
        <li>No dia mais cheio são cerca de <strong>{{ plan.reviewsPeak }} revisões</strong> ({{ plan.minutesPeak }} min). Num dia médio, {{ plan.batchesAvg }} {{ plan.batchesAvg === 1 ? 'lote' : 'lotes' }} de 20 cards.</li>
        <li v-if="plan.heavy" class="text-warning">Passa de 1 hora por dia. Para caber, reduza o volume aos cards que mais caem ou comece antes.</li>
      </ul>
      <p class="mt-5 rounded-row bg-soft px-4 py-3 text-meta text-fg-muted">
        Estimativa pelo modelo FSRS-6 com os parâmetros padrão: cada card volta quando a chance de lembrar chega a 90%, com 10% a mais de
        revisões pelos que você errar e {{ PLAN_SECONDS_PER_CARD }} segundos por card. Seu ritmo real muda os números.
        <NuxtLink v-if="embedded" to="/ferramentas/plano-ate-a-prova" class="underline">Abrir o plano em tela cheia</NuxtLink>
      </p>
    </div>

    <div v-if="!embedded" class="mt-6 flex flex-col items-start gap-2">
      <UiButton variant="primary" :href="ctaHref" data-testid="tool-plan-cta" @click="onCta">Montar este plano no Baigi</UiButton>
      <p class="text-meta text-fg-muted">Comece com 6 cards prontos, sem conta. Com a conta, você marca a data da prova e o Baigi divide os lotes do dia.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
// Plano até a prova (prd-blog-seo RF-T2): utils/examPlan, in the browser. The prerendered HTML shows the plan of the
// default (90 days, 600 cards) from a fixed reference date, and the client recomputes from today after mounting.
import type { BlogArea } from '~~/modules/blog/types'
import { blogStartPath, bucket } from '~/utils/blog'
import { PLAN_SECONDS_PER_CARD, buildExamPlan, daysUntilExam } from '~/utils/examPlan'

const props = defineProps<{ slug?: string, embedded?: boolean, area?: BlogArea | null }>()

const DEFAULT_DAYS = 90
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const titleId = useId()
const today = ref(new Date(2026, 10, 8))
const date = ref(iso(addDays(today.value, DEFAULT_DAYS)))
const minDate = computed(() => iso(addDays(today.value, 1)))
const maxDate = computed(() => iso(addDays(today.value, 730)))
const cardsText = ref('600')
const studiedText = ref('')
const dateError = ref<string | undefined>()
const cardsError = ref<string | undefined>()
const studiedError = ref<string | undefined>()

onMounted(() => {
  today.value = new Date()
  date.value = iso(addDays(today.value, DEFAULT_DAYS))
})

const days = computed(() => daysUntilExam(date.value, today.value))
const cards = computed(() => Number(cardsText.value))
const studied = computed(() => (studiedText.value === '' ? 0 : Number(studiedText.value)))

function onDate(v: string) {
  date.value = v
  const d = daysUntilExam(v, today.value)
  dateError.value = !v || d < 1 ? 'Escolha uma data a partir de amanhã' : d > 730 ? 'Escolha uma data em até 2 anos' : undefined
  trackUse()
}
function onCards(v: string) {
  cardsText.value = v
  const n = Number(v)
  cardsError.value = v === '' || !Number.isFinite(n) || n < 10 || n > 20000 ? 'Use um número de 10 a 20.000' : undefined
  validateStudied()
  trackUse()
}
function onStudied(v: string) {
  studiedText.value = v
  validateStudied()
  trackUse()
}
function validateStudied() {
  const n = studied.value
  studiedError.value = !Number.isFinite(n) || n < 0 ? 'Use um número a partir de 0' : n > cards.value ? 'Não pode passar do total' : undefined
}

const plan = computed(() => (dateError.value || cardsError.value || studiedError.value
  ? null
  : buildExamPlan({ days: days.value, cards: cards.value, studied: studied.value })))

const { track } = useAnalytics()
let tracked = false
function trackUse() {
  if (tracked) return
  tracked = true
  track('tool_used', { tool: 'plano-ate-a-prova', input: `dias:${bucket(days.value, [15, 30, 90, 180])};cards:${bucket(cards.value, [100, 500, 2000])}` })
}

const ctaHref = computed(() => blogStartPath(props.area ?? null, props.slug ?? 'plano-ate-a-prova', 'tool'))
function onCta() {
  track('blog_cta_clicked', { slug: props.slug ?? 'plano-ate-a-prova', position: 'tool', area: props.area ?? null })
}
</script>
