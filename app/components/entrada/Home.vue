<template>
  <div>
    <div class="ec-in">
      <NuxtLink to="/" class="ec-logo" aria-label="Baigi: início">
        <img :src="LOGO" width="64" height="53" alt="" decoding="async">
        <span aria-hidden="true">Baigi</span>
      </NuxtLink>
      <div class="ec-hero">
        <div class="ec-hero-copy">
          <h1>Você estuda. O Baigi lembra você de revisar antes de <span class="ec-grifo">esquecer.</span></h1>
          <p class="ec-lead">Mande o seu material e receba cards prontos. Cada um volta no dia certo, e revisar é grátis para sempre.</p>
          <div class="ec-hero-acts">
            <button type="button" class="ec-btn ec-btn-primary" data-testid="entry-start" @click="start(0, 'hero')">Ver como funciona · 1 min</button>
            <NuxtLink :to="loginTo" class="ec-btn ec-btn-link" data-testid="entry-login" @click="cta('hero_login')">Já tenho conta · Entrar</NuxtLink>
          </div>
        </div>
        <div class="ec-mascot">
          <p class="ec-bubble">Tenta um card comigo?</p>
          <img :src="WAVING" width="248" height="365" alt="Golfinho do Baigi acenando" decoding="async" fetchpriority="low">
        </div>
      </div>
    </div>

    <!-- P3 (prd-landing-mostrar-produto): the edital first. The form of the free tool (same limits and strict captcha);
         its chunk when the box nears the screen, the Turnstile on the first focus; the result page shows matérias and
         assuntos and takes the reading to the sign-up -->
    <section class="ec-sec ec-edital" aria-labelledby="ec-edital-title" data-testid="entry-edital">
      <div class="ec-in">
        <h2 id="ec-edital-title">Já tem o edital? Mande aqui</h2>
        <p class="ec-lead">Em menos de um minuto você vê as matérias e os assuntos. Grátis, sem criar conta.</p>
        <div ref="editalBox" class="ec-edital-box">
          <LazyEditalPublicForm v-if="editalNear" from="comecar" @sent="cta('edital_box')" />
        </div>
      </div>
    </section>

    <section class="ec-sec ec-band" aria-labelledby="ec-feats-title">
      <div class="ec-in">
        <h2 id="ec-feats-title">Tudo o que o Baigi faz pelo seu estudo</h2>
        <p class="ec-lead">Toque em um para ver como funciona.</p>
        <ul class="ec-feats">
          <li v-for="f in ENTRY_FEATURES" :key="f.title">
            <button type="button" class="ec-feat" :data-testid="`entry-feature-${f.step + 1}`" @click="start(f.step, 'feature')">
              <span class="ec-ico" :class="`ec-ico-${f.tone}`"><EntradaIcon :name="f.icon" /></span>
              <span>
                <span class="ec-h3">{{ f.title }}</span>
                <span class="ec-feat-text">{{ f.text }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <section class="ec-sec" aria-labelledby="ec-tools-title">
      <div class="ec-in">
        <h2 id="ec-tools-title">Ferramentas grátis, sem criar conta</h2>
        <div class="ec-tools">
          <NuxtLink to="/ferramentas/edital-verticalizado" class="ec-row" data-testid="entry-tool-edital" @click="cta('tool_edital')">
            <span class="ec-ico ec-ico-app-goal"><EntradaIcon name="flag" /></span>
            <span>
              <span class="ec-h3">Edital verticalizado</span>
              <span class="ec-row-text">Mande o PDF do edital e receba matérias, assuntos e cronograma.</span>
            </span>
            <ChevronRight class="ec-chev" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/ferramentas/calculadora-do-esquecimento" class="ec-row" data-testid="entry-tool-calculadora" @click="cta('tool_calculadora')">
            <span class="ec-ico ec-ico-app-accuracy"><EntradaIcon name="curve" /></span>
            <span>
              <span class="ec-h3">Calculadora do esquecimento</span>
              <span class="ec-row-text">Veja quanto da matéria você ainda lembra no dia da prova.</span>
            </span>
            <ChevronRight class="ec-chev" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="ec-sec ec-final" aria-labelledby="ec-final-title">
      <div class="ec-in">
        <img :src="CHEER" width="265" height="372" alt="" decoding="async" loading="lazy">
        <h2 id="ec-final-title">Comece grátis hoje</h2>
        <p data-testid="entry-final-line">{{ finalLine(catalog) }}</p>
        <NuxtLink to="/criar-conta" class="ec-btn ec-btn-band" data-testid="entry-final-signup" @click="cta('final_signup')">Criar conta grátis</NuxtLink>
      </div>
    </section>

    <UiPublicFooter />
  </div>
</template>

<script setup lang="ts">
// The entry of /comecar for who does not know the Baigi yet (prd-entrada-comecar RF-F6 to RF-F9): the hero with the
// dolphin, the box to send the edital (prd-landing-mostrar-produto P3), the 6 things the Baigi does (each opens its
// step of the tour), the free tools and the final call.
import { ChevronRight } from 'lucide-vue-next'
import type { PlanCatalog } from '~/types'
import type { EntryCtaPosition } from '~/types/analytics'
import { ENTRY_FEATURES, finalLine } from '~/utils/entrada'

defineProps<{ catalog: PlanCatalog | null, loginTo: string }>()

// Bound, not static srcs: the compiler would turn them into asset imports (one shared with the landing's header)
const LOGO = '/landing/mascote/mascot-baigi-bust-64.webp'
const WAVING = '/mascote/acenando.svg'
const CHEER = '/mascote/comemorando.svg'
const emit = defineEmits<{ start: [step: number, origin: 'hero' | 'feature'] }>()

const { track } = useAnalytics()

function cta(position: EntryCtaPosition) {
  track('entry_cta_clicked', { position })
}

// The form's chunk (once-*) when the box is 400 px from the screen; the box keeps the form's height, so nothing moves
const editalBox = ref<HTMLElement | null>(null)
const editalNear = ref(false)
let io: IntersectionObserver | null = null

onMounted(() => {
  if (!editalBox.value || !('IntersectionObserver' in window)) {
    editalNear.value = true
    return
  }
  io = new IntersectionObserver(([e]) => {
    if (!e?.isIntersecting) return
    editalNear.value = true
    io?.disconnect()
  }, { rootMargin: '400px 0px' })
  io.observe(editalBox.value)
})
onBeforeUnmount(() => io?.disconnect())

function start(step: number, origin: 'hero' | 'feature') {
  cta(origin === 'hero' ? 'hero_tour' : 'feature')
  emit('start', step, origin)
}
</script>
