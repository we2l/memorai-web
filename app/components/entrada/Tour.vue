<template>
  <div class="ec-tour" :data-flow="String(flow)" data-testid="entry-tour" :data-step="current">
    <!-- The page's title for who reads by headings; each step is an h2 under it -->
    <h1 class="ec-sr">Como funciona o Baigi, passo {{ step + 1 }} de {{ ENTRY_STEPS.length }}</h1>
    <div :key="step" class="ec-enter">
      <div class="ec-stage" :class="TONE[current]">
        <div class="ec-in">
          <div class="ec-bar">
            <button type="button" class="ec-back" aria-label="Voltar" data-testid="entry-back" @click="emit('go', step === 0 ? null : step - 1)">
              <ChevronLeft aria-hidden="true" />
            </button>
            <div class="ec-dots" role="progressbar" :aria-valuenow="step + 1" aria-valuemin="1" :aria-valuemax="ENTRY_STEPS.length" :aria-valuetext="`Passo ${step + 1} de ${ENTRY_STEPS.length}`" aria-label="Progresso do tour">
              <i v-for="(_, i) in ENTRY_STEPS" :key="i" :data-on="String(i <= step)" />
            </div>
            <button v-if="step < LAST" type="button" class="ec-skip" data-testid="entry-skip" @click="skip">Pular</button>
          </div>

          <template v-if="current === 'card'">
            <p class="ec-kicker">Isto é um card</p>
            <h2 ref="heading" tabindex="-1">Tente lembrar antes de virar.</h2>
            <EntradaCardStep :flipped="flipped" :rated="rated" />
          </template>

          <template v-else-if="current === 'material'">
            <p class="ec-kicker">De onde vêm os cards</p>
            <h2 ref="heading" tabindex="-1">Mande o seu material. O Baigi monta os cards.</h2>
            <p class="ec-lead">Você não precisa digitar card por card.</p>
            <div class="ec-panel">
              <p class="ec-meta">Exemplo</p>
              <div class="ec-line">
                <span class="ec-ico ec-ico-app-accuracy"><EntradaIcon name="file" /></span>
                <div><strong>Lei 8.213 comentada.pdf</strong><p class="ec-meta">Nota pronta · 42 cards</p></div>
              </div>
            </div>
          </template>

          <template v-else-if="current === 'revisar'">
            <p class="ec-kicker">Seu dia no Baigi</p>
            <h2 ref="heading" tabindex="-1">Abra, revise o lote do dia e pronto.</h2>
            <div class="ec-panel">
              <div class="ec-line">
                <span class="ec-num ec-big">20</span>
                <div><strong>cards para hoje</strong><p class="ec-meta">Exemplo · 1 lote · cerca de 5 minutos</p></div>
              </div>
            </div>
          </template>

          <template v-else-if="current === 'simulado'">
            <p class="ec-kicker">Simulados</p>
            <h2 ref="heading" tabindex="-1">Questões feitas do seu material, como na prova.</h2>
            <div class="ec-panel">
              <p class="ec-meta">Exemplo · Questão 4 de 20 · Direito Previdenciário</p>
              <strong>O salário-maternidade da segurada empregada exige carência?</strong>
              <ul class="ec-quiz" aria-label="Alternativas">
                <li class="ec-opt ec-opt-wrong">A) Sim, de 10 contribuições <span class="ec-sr">(errada, a que você marcou)</span></li>
                <li class="ec-opt ec-opt-right">B) Não, ele independe de carência <span class="ec-sr">(certa)</span></li>
                <li class="ec-opt">C) Sim, de 12 contribuições</li>
              </ul>
              <div>
                <div class="ec-line ec-spread"><span class="ec-meta">Acerto em Previdenciário</span><strong class="ec-num">70%</strong></div>
                <div class="ec-track" aria-hidden="true"><b /></div>
              </div>
            </div>
          </template>

          <template v-else-if="current === 'podcast'">
            <p class="ec-kicker">Podcast</p>
            <h2 ref="heading" tabindex="-1">Revise ouvindo, no ônibus ou na academia.</h2>
            <EntradaPlayer />
          </template>

          <template v-else-if="current === 'prova'">
            <p class="ec-kicker">Até a prova</p>
            <h2 ref="heading" tabindex="-1">Do edital ao dia da prova.</h2>
            <div class="ec-panel">
              <p class="ec-meta">Exemplo · INSS Técnico · prova em 38 dias</p>
              <div class="ec-line">
                <span class="ec-num ec-big">67</span>
                <div><strong>de 100 de prontidão</strong><p class="ec-meta">No caminho · estimativa</p></div>
              </div>
              <p class="ec-meta">Para subir: revise os 14 atrasados e faça 10 questões de Previdenciário.</p>
            </div>
          </template>

          <template v-else>
            <p class="ec-kicker">Planos</p>
            <h2 ref="heading" tabindex="-1">Comece grátis. Revisar nunca paga.</h2>
            <EntradaPlans :catalog="catalog" :failed="failed" @retry="emit('retry')" />
          </template>
        </div>
      </div>

      <!-- In the flow while the consent banner is open (it is fixed at the bottom too), fixed otherwise (RF-F11) -->
      <div class="ec-dock" data-testid="entry-dock">
        <div class="ec-in">
          <template v-if="current === 'card'">
            <button v-if="rated" type="button" class="ec-btn ec-btn-primary ec-btn-wide" data-testid="entry-next" @click="next">Continuar</button>
            <div v-else-if="flipped" class="ec-rate">
              <button type="button" class="ec-btn ec-btn-ghost" data-testid="entry-forgot" @click="rate('forgot')">Não lembrei</button>
              <button type="button" class="ec-btn ec-btn-primary" data-testid="entry-remembered" @click="rate('remembered')">Lembrei</button>
            </div>
            <button v-else type="button" class="ec-btn ec-btn-primary ec-btn-wide" data-testid="entry-flip" @click="flip">Mostrar resposta</button>
          </template>
          <template v-else-if="current === 'planos'">
            <NuxtLink to="/criar-conta" class="ec-btn ec-btn-primary ec-btn-wide" data-testid="entry-plans-signup" @click="cta('plans_signup')">Criar conta grátis</NuxtLink>
            <NuxtLink to="/comecar/areas" class="ec-btn ec-btn-link" data-testid="entry-plans-areas" @click="cta('plans_areas')">Fazer 6 cards da minha área</NuxtLink>
          </template>
          <button v-else type="button" class="ec-btn ec-btn-primary ec-btn-wide" data-testid="entry-next" @click="next">{{ NEXT[current] }}</button>
        </div>
      </div>

      <div class="ec-body">
        <div class="ec-in">
          <template v-if="current === 'card'">
            <template v-if="rated">
              <h3>É assim o Baigi todo dia</h3>
              <p class="ec-gap">Cada card tem o seu dia de voltar. O que você lembra bem some por semanas, e o que você erra volta logo. Você só revisa o que está para esquecer.</p>
              <NuxtLink to="/comecar/areas" class="ec-link" data-testid="entry-card-areas" @click="cta('card_areas')">Fazer 6 cards da minha área</NuxtLink>
            </template>
          </template>

          <ul v-else-if="current === 'material'" class="ec-points">
            <li><span><strong>PDF ou texto:</strong> a IA escreve a nota em partes e cria os cards, cada um com a página de onde saiu.</span></li>
            <li><span><strong>Questão que você errou:</strong> cole a questão e ela vira card, com o gabarito e o motivo do erro.</span></li>
            <li><span><strong>Já usa o Anki?</strong> Traga os seus baralhos sem recomeçar do zero: vêm o intervalo e os erros de cada card.</span></li>
            <li><span><strong>Não entendeu um card?</strong> Toque em “Por que?” e a IA explica com base no seu material.</span></li>
          </ul>

          <template v-else-if="current === 'revisar'">
            <h3 class="ec-gap-b">Jeitos de revisar</h3>
            <div class="ec-modes">
              <div class="ec-mode">
                <span class="ec-ico ec-ico-app-streak"><EntradaIcon name="bolt" /></span>
                <div><h3>Relâmpago</h3><p>Só tem 5 minutos? O Relâmpago traz os cards que já venceram, sem cards novos, e para quando o tempo acaba.</p></div>
              </div>
              <div class="ec-mode">
                <span class="ec-ico ec-ico-app-quiz"><EntradaIcon name="redo" /></span>
                <div><h3>Só os erros</h3><p>Repasse só o que você errou naquela matéria.</p></div>
              </div>
              <div class="ec-mode">
                <span class="ec-ico ec-ico-app-goal"><EntradaIcon name="calendar" /></span>
                <div><h3>Recuperar o atraso</h3><p>Ficou dias sem estudar? Divida o atraso em 3, 7 ou 14 dias.</p></div>
              </div>
            </div>
            <p class="ec-meta ec-gap">Sem internet também dá: o lote do dia fica salvo no aparelho e as respostas vão quando a conexão voltar.</p>
          </template>

          <ul v-else-if="current === 'simulado'" class="ec-points">
            <li><span><strong>Bateria</strong> para treinar uma matéria, ou <strong>simulado</strong> com cronômetro e o caderno inteiro.</span></li>
            <li><span>No fim, o acerto por matéria mostra onde você está fraco.</span></li>
            <li><span>As questões que você errou viram cards com um toque.</span></li>
          </ul>

          <template v-else-if="current === 'podcast'">
            <ul class="ec-points">
              <li><span>O episódio é feito com os cards que você mais erra{{ podcastMinutes(catalog) ? `, em até ${podcastMinutes(catalog)} minutos` : '' }}.</span></li>
              <li><span>Antes de cada resposta vem uma pausa para você tentar lembrar.</span></li>
            </ul>
            <p class="ec-gap-t"><span class="ec-tag" data-testid="entry-podcast-tag">No {{ paidName(catalog) }}</span></p>
            <p v-if="podcastPlanLine(catalog)" class="ec-meta ec-gap" data-testid="entry-podcast-plan">{{ podcastPlanLine(catalog) }}</p>
          </template>

          <ul v-else-if="current === 'prova'" class="ec-points">
            <li><span><strong>Mande o edital:</strong> o Baigi separa as matérias e os assuntos e cria o caderno.</span></li>
            <li><span><strong>Cronograma:</strong> diga quantas horas você tem por dia e veja o que estudar em cada um, com o peso de cada matéria.</span></li>
            <li><span><strong>Prontidão:</strong> um número de 0 a 100 mostra quanto falta e o que fazer primeiro.</span></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The tour of the entry (prd-entrada-comecar RF-F10 to RF-F18): 7 steps, the step in the URL (the page owns it), a
// progress bar, Voltar and Pular, and the step's action in a bar at the bottom. Step 1 is one real card with the
// interval the API gives the sample deck (RN-2); the plans only from the catalog (RN-4).
import { ChevronLeft } from 'lucide-vue-next'
import type { PlanCatalog } from '~/types'
import type { EntryCtaPosition } from '~/types/analytics'
import { ENTRY_STEPS, paidName, podcastMinutes, podcastPlanLine, type EntryRating, type EntryStep } from '~/utils/entrada'

const props = defineProps<{ step: number, catalog: PlanCatalog | null, failed: boolean, flow: boolean }>()
const emit = defineEmits<{ go: [step: number | null], retry: [] }>()

const LAST = ENTRY_STEPS.length - 1
const TONE: Record<EntryStep, string> = {
  card: 'ec-t-soft',
  material: 'ec-t-violet',
  revisar: 'ec-t-soft',
  simulado: 'ec-t-quiz',
  podcast: 'ec-t-pod',
  prova: 'ec-t-violet',
  planos: 'ec-t-final',
}
const NEXT: Partial<Record<EntryStep, string>> = {
  material: 'Próximo: seu dia no Baigi',
  revisar: 'Próximo: simulados',
  simulado: 'Próximo: podcast',
  podcast: 'Próximo: até a prova',
  prova: 'Ver os planos',
}

const current = computed(() => ENTRY_STEPS[props.step]!)
const heading = ref<HTMLElement | null>(null)
const { track } = useAnalytics()

// ── The card of step 1: back to the step = a new try ──
const flipped = ref(false)
const rated = ref<EntryRating | null>(null)
watch(() => props.step, () => {
  flipped.value = false
  rated.value = null
})

function flip() {
  flipped.value = true
}

function rate(rating: EntryRating) {
  rated.value = rating
  track('entry_card_rated', { rating })
}

function next() {
  emit('go', Math.min(props.step + 1, LAST))
}

function skip() {
  track('entry_tour_skipped', { from: current.value })
  emit('go', LAST)
}

function cta(position: EntryCtaPosition) {
  track('entry_cta_clicked', { position })
}

/** 1 / 2 rate the card after it is turned (the app's keys); never while typing or with a modifier */
function onKey(e: KeyboardEvent) {
  if (current.value !== 'card' || !flipped.value || rated.value || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return
  if (e.key === '1') rate('forgot')
  else if (e.key === '2') rate('remembered')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/** The page moves the focus here on every step (a heading with tabindex -1) */
function focusHeading() {
  heading.value?.focus({ preventScroll: true })
}
defineExpose({ focusHeading })
</script>
