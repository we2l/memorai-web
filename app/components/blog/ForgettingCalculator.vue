<template>
  <section class="rounded-card bg-raised p-5 shadow-1 sm:p-6" :aria-labelledby="titleId" data-testid="tool-forgetting">
    <!-- On its own page the H1 already names the tool: the heading stays for screen readers only -->
    <h2 :id="titleId" class="mb-1 text-section text-fg-strong" :class="!embedded && 'sr-only'">Calculadora do esquecimento</h2>
    <p v-if="embedded" class="mb-5 text-meta text-fg-muted">Quanto você ainda deve lembrar de algo que estudou, e quando revisar.</p>

    <UiFieldGrid>
      <UiInput
        id="forgetting-days"
        :model-value="daysText"
        label="Há quantos dias você estudou isso pela última vez?"
        type="number"
        inputmode="numeric"
        min="0"
        max="365"
        hint="De 0 a 365 dias"
        :error="daysError"
        data-testid="tool-forgetting-days"
        @update:model-value="onDays"
      />
      <UiSelect
        id="forgetting-times"
        v-model="times"
        label="Quantas vezes você já se testou nesse conteúdo?"
        :options="TIMES"
        hint="Se testar = tentar lembrar antes de olhar a resposta"
        data-testid="tool-forgetting-times"
      />
    </UiFieldGrid>

    <div class="mt-6" aria-live="polite">
      <p class="num-m text-fg-strong" data-testid="tool-forgetting-percent">{{ percentNow }}%</p>
      <p class="mt-2 text-body text-fg" data-testid="tool-forgetting-sentence">{{ sentence }}</p>
    </div>

    <BlogForgettingChart
      class="mt-5"
      :points="points"
      :compare="compare"
      :marker="{ day: days, percent: percentNow }"
      :label="`Estimativa de quanto você lembra nos ${range} dias depois de estudar`"
      legend="Sem revisar"
      compare-legend="Revisando hoje"
    />

    <ul class="mt-5 flex flex-col gap-2 text-body text-fg">
      <li>Cai para 90% em <strong>{{ formatDays(at90) }}</strong> e para 70% em <strong>{{ formatDays(at70) }}</strong> depois do estudo.</li>
      <li v-if="days > 0">Se você revisar hoje e lembrar, daqui a 30 dias deve estar em <strong>{{ percentAfterReview }}%</strong>, contra {{ percentNoReview }}% sem revisar.</li>
    </ul>

    <p class="mt-5 rounded-row bg-soft px-4 py-3 text-meta text-fg-muted">
      Estimativa pelo modelo FSRS-6 com os parâmetros padrão, o mesmo que o Baigi usa para agendar as revisões. Vale para um card que você
      acertou; reler sem se testar costuma render menos. Não é uma medição da sua memória.
      <NuxtLink v-if="embedded" to="/ferramentas/calculadora-do-esquecimento" class="underline">Abrir a calculadora em tela cheia</NuxtLink>
    </p>

    <div v-if="!embedded" class="mt-6 flex flex-col items-start gap-2">
      <UiButton variant="primary" :href="ctaHref" class="w-full sm:w-auto" data-testid="tool-forgetting-cta" @click="onCta">Revisar no dia certo: comece com 6 cards</UiButton>
      <p class="text-meta text-fg-muted">Sem conta e sem cartão. Você escolhe a área e revisa 6 cards prontos.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
// Calculadora do esquecimento (prd-blog-seo RF-T1): FSRS-6 defaults (utils/forgetting), everything in the browser.
// The default state (10 days, tested once) is rendered in the prerendered HTML too.
import type { BlogArea } from '~~/modules/blog/types'
import { blogStartPath, bucket } from '~/utils/blog'
import { curve, intervalFor, retrievability, stabilityAfterGood, stateAfterReviews } from '~/utils/forgetting'

const props = defineProps<{ slug?: string, embedded?: boolean, area?: BlogArea | null }>()

const TIMES = [
  { value: '1', label: 'Uma vez (só estudei)' },
  { value: '2', label: 'Duas vezes' },
  { value: '3', label: 'Três vezes' },
  { value: '4', label: 'Quatro vezes' },
  { value: '5', label: 'Cinco ou mais' },
]

const titleId = useId()
const daysText = ref('10')
const days = ref(10)
const daysError = ref<string | undefined>()
const times = ref('1')

function onDays(value: string) {
  daysText.value = value
  const n = Number(value)
  if (value === '' || !Number.isFinite(n) || n < 0 || n > 365) {
    daysError.value = 'Use um número de 0 a 365'
    return
  }
  daysError.value = undefined
  days.value = Math.round(n)
  trackUse()
}

const state = computed(() => stateAfterReviews(Number(times.value) - 1))
const range = computed(() => Math.min(400, Math.max(60, days.value + 30)))
const percentNow = computed(() => Math.round(retrievability(days.value, state.value.stability) * 100))
const at90 = computed(() => intervalFor(state.value.stability, 0.9))
const at70 = computed(() => intervalFor(state.value.stability, 0.7))
const points = computed(() => curve(state.value.stability, range.value, Math.max(1, Math.round(range.value / 60))))
const afterReview = computed(() => stabilityAfterGood(state.value.stability, state.value.difficulty, retrievability(days.value, state.value.stability)))
const compare = computed(() => days.value > 0
  ? points.value.filter(p => p.day >= days.value).map(p => ({ day: p.day, percent: Math.round(retrievability(p.day - days.value, afterReview.value) * 1000) / 10 }))
  : null)
const percentAfterReview = computed(() => Math.round(retrievability(30, afterReview.value) * 100))
const percentNoReview = computed(() => Math.round(retrievability(days.value + 30, state.value.stability) * 100))

const sentence = computed(() => {
  const p = percentNow.value
  if (p >= 90) return 'Ainda está fresco. Revisar agora rende pouco; o melhor momento é quando começar a ficar difícil de lembrar.'
  if (p >= 75) return 'Boa hora para revisar: ainda dá para lembrar com algum esforço, e é esse esforço que faz a memória durar mais.'
  return 'Boa parte já deve ter sumido. Uma revisão agora, se testando, recupera mais do que reler tudo do zero.'
})

function formatDays(d: number): string {
  if (d < 1) return 'menos de 1 dia'
  const n = Math.round(d)
  return n === 1 ? '1 dia' : `${n} dias`
}

const { track } = useAnalytics()
let tracked = false
function trackUse() {
  if (tracked) return
  tracked = true
  track('tool_used', { tool: 'calculadora-do-esquecimento', input: `dias:${bucket(days.value, [1, 7, 30, 90])}` })
}
watch(times, trackUse)

const ctaHref = computed(() => blogStartPath(props.area ?? null, props.slug ?? 'calculadora-do-esquecimento', 'tool'))
function onCta() {
  track('blog_cta_clicked', { slug: props.slug ?? 'calculadora-do-esquecimento', position: 'tool', area: props.area ?? null })
}
</script>
