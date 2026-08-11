<template>
  <!-- Hero: cards pendentes -->
  <section v-if="totalCards > 0" class="hero">
    <!-- Atmosphere -->
    <div class="hero__atmosphere" aria-hidden="true" />

    <!-- Knowledge network: organic synapse connections -->
    <svg class="hero__synapse" aria-hidden="true" viewBox="0 0 460 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Glow halos behind hub nodes -->
      <circle cx="190" cy="88" r="22" fill="#6D3DF5" opacity="0.07" class="synapse__halo synapse__halo--a" />
      <circle cx="330" cy="100" r="24" fill="#6D3DF5" opacity="0.06" class="synapse__halo synapse__halo--b" />

      <!-- === CONNECTIONS (all terminate exactly at node centers) === -->

      <!-- Hub A (190,88) branches -->
      <path d="M95 72 C 125 68, 155 74, 190 88" stroke="#6D3DF5" stroke-width="0.7" stroke-linecap="round" opacity="0.24" />
      <path d="M130 125 C 150 115, 170 100, 190 88" stroke="#6D3DF5" stroke-width="0.6" stroke-linecap="round" opacity="0.20" />
      <path d="M155 42 C 168 55, 180 70, 190 88" stroke="#6D3DF5" stroke-width="0.5" stroke-linecap="round" opacity="0.16" />
      <path id="conn-ab" d="M190 88 C 210 90, 230 92, 255 95" stroke="#6D3DF5" stroke-width="0.8" stroke-linecap="round" opacity="0.28" />
      <path d="M190 88 C 200 105, 210 120, 218 138" stroke="#6D3DF5" stroke-width="0.5" stroke-linecap="round" opacity="0.17" />

      <!-- Bridge: mid-node (255,95) to Hub B -->
      <path id="conn-bridge" d="M255 95 C 275 96, 300 98, 330 100" stroke="#6D3DF5" stroke-width="0.8" stroke-linecap="round" opacity="0.30" />
      <path d="M255 95 C 250 110, 248 128, 250 148" stroke="#6D3DF5" stroke-width="0.5" stroke-linecap="round" opacity="0.15" />

      <!-- Hub B (330,100) branches -->
      <path id="conn-b-top" d="M330 100 C 350 88, 365 76, 380 62" stroke="#6D3DF5" stroke-width="0.6" stroke-linecap="round" opacity="0.22" />
      <path d="M330 100 C 348 108, 362 118, 375 130" stroke="#6D3DF5" stroke-width="0.6" stroke-linecap="round" opacity="0.20" />
      <path d="M330 100 C 340 118, 348 135, 355 155" stroke="#6D3DF5" stroke-width="0.5" stroke-linecap="round" opacity="0.16" />
      <path d="M330 100 C 350 95, 370 92, 395 88" stroke="#6D3DF5" stroke-width="0.5" stroke-linecap="round" opacity="0.18" />

      <!-- Cross-connections (create density without chaos) -->
      <path d="M95 72 C 105 85, 115 100, 130 125" stroke="#6D3DF5" stroke-width="0.4" stroke-linecap="round" opacity="0.13" />
      <path d="M218 138 C 230 142, 240 145, 250 148" stroke="#6D3DF5" stroke-width="0.4" stroke-linecap="round" opacity="0.13" />
      <path d="M375 130 C 380 138, 383 145, 385 155" stroke="#6D3DF5" stroke-width="0.4" stroke-linecap="round" opacity="0.12" />
      <path d="M380 62 C 385 70, 390 78, 395 88" stroke="#6D3DF5" stroke-width="0.4" stroke-linecap="round" opacity="0.12" />

      <!-- Peripheral branches -->
      <path d="M60 95 C 70 88, 80 80, 95 72" stroke="#6D3DF5" stroke-width="0.4" stroke-linecap="round" opacity="0.12" />
      <path d="M130 125 C 135 140, 138 152, 140 165" stroke="#6D3DF5" stroke-width="0.4" stroke-linecap="round" opacity="0.11" />

      <!-- === NODES === -->

      <!-- Hub nodes (2) — primary knowledge centers -->
      <circle cx="190" cy="88" r="7" fill="#6D3DF5" opacity="0.84" class="synapse__node synapse__node--hub synapse__node--hub-a" />
      <circle cx="330" cy="100" r="7.5" fill="#6D3DF5" opacity="0.90" class="synapse__node synapse__node--hub synapse__node--hub-b" />

      <!-- Secondary nodes (5) — established connections -->
      <circle cx="95" cy="72" r="4" fill="#6D3DF5" opacity="0.50" class="synapse__node synapse__node--secondary synapse__node--s1" />
      <circle cx="255" cy="95" r="4.5" fill="#6D3DF5" opacity="0.58" class="synapse__node synapse__node--secondary synapse__node--s2" />
      <circle cx="130" cy="125" r="3.5" fill="#6D3DF5" opacity="0.42" class="synapse__node synapse__node--secondary synapse__node--s3" />
      <circle cx="380" cy="62" r="3.5" fill="#6D3DF5" opacity="0.44" class="synapse__node synapse__node--secondary synapse__node--s4" />
      <circle cx="375" cy="130" r="3.5" fill="#6D3DF5" opacity="0.40" class="synapse__node synapse__node--secondary synapse__node--s5" />

      <!-- Small nodes (8) — peripheral memories / associations -->
      <circle cx="155" cy="42" r="2.5" fill="#6D3DF5" opacity="0.28" class="synapse__node synapse__node--small synapse__node--sm1" />
      <circle cx="218" cy="138" r="2.5" fill="#6D3DF5" opacity="0.26" class="synapse__node synapse__node--small synapse__node--sm2" />
      <circle cx="250" cy="148" r="2" fill="#6D3DF5" opacity="0.22" class="synapse__node synapse__node--small synapse__node--sm3" />
      <circle cx="355" cy="155" r="2.5" fill="#6D3DF5" opacity="0.24" class="synapse__node synapse__node--small synapse__node--sm4" />
      <circle cx="395" cy="88" r="2.5" fill="#6D3DF5" opacity="0.25" class="synapse__node synapse__node--small synapse__node--sm5" />
      <circle cx="60" cy="95" r="2" fill="#6D3DF5" opacity="0.18" class="synapse__node synapse__node--small synapse__node--sm6" />
      <circle cx="140" cy="165" r="2" fill="#6D3DF5" opacity="0.16" class="synapse__node synapse__node--small synapse__node--sm7" />
      <circle cx="385" cy="155" r="1.8" fill="#6D3DF5" opacity="0.15" class="synapse__node synapse__node--small synapse__node--sm8" />

      <!-- Coral accents (2) — recently recalled -->
      <circle cx="270" cy="96" r="2" fill="#F27059" opacity="0.45" class="synapse__node synapse__node--small synapse__node--coral1" />
      <circle cx="348" cy="118" r="1.8" fill="#F27059" opacity="0.35" class="synapse__node synapse__node--small synapse__node--coral2" />

      <!-- === TRAVELING SIGNALS (information flowing through network) === -->
      <!-- Signal 1: Hub A → mid-node (via conn-ab) -->
      <circle r="2" fill="#BEA6FF" opacity="0" class="synapse__signal synapse__signal--1">
        <animateMotion dur="2.5s" begin="0s;signal1end.end+5s" fill="freeze" id="signal1move">
          <mpath href="#conn-ab" />
        </animateMotion>
        <animate attributeName="opacity" values="0;0.7;0.7;0" dur="2.5s" begin="0s;signal1end.end+5s" fill="freeze" id="signal1end" />
      </circle>

      <!-- Signal 2: mid-node → Hub B (via conn-bridge) -->
      <circle r="1.8" fill="#BEA6FF" opacity="0" class="synapse__signal synapse__signal--2">
        <animateMotion dur="2s" begin="3s;signal2end.end+7s" fill="freeze" id="signal2move">
          <mpath href="#conn-bridge" />
        </animateMotion>
        <animate attributeName="opacity" values="0;0.65;0.65;0" dur="2s" begin="3s;signal2end.end+7s" fill="freeze" id="signal2end" />
      </circle>

      <!-- Signal 3: Hub B → top-right (via conn-b-top) -->
      <circle r="1.5" fill="#BEA6FF" opacity="0" class="synapse__signal synapse__signal--3">
        <animateMotion dur="2s" begin="8s;signal3end.end+9s" fill="freeze" id="signal3move">
          <mpath href="#conn-b-top" />
        </animateMotion>
        <animate attributeName="opacity" values="0;0.55;0.55;0" dur="2s" begin="8s;signal3end.end+9s" fill="freeze" id="signal3end" />
      </circle>
    </svg>

    <div class="hero__layout">
      <!-- Left: narrative -->
      <div class="hero__narrative">
        <div class="hero__greeting">
          <img src="~/assets/mascot-baigi-bust.png" alt="" class="hero__mascot" />
          <span class="hero__salute">{{ greeting }}, {{ firstName }}.</span>
          <span v-if="nextExam" class="hero__exam">📋 {{ nextExam.days_remaining }}d até prova</span>
        </div>
        <p class="hero__eyebrow">Hoje faltam apenas</p>
        <h1 class="hero__number"><span class="hero__value">{{ totalCards }}</span><span class="hero__unit"> cards.</span></h1>
        <p class="hero__meta">{{ heroMeta }}</p>
      </div>

      <!-- Right: session panel -->
      <div class="hero__panel">
        <p class="hero__panel-title">Sessão de hoje</p>
        <div class="hero__session-viz">
          <div
            v-for="i in Math.min(totalCards, 24)"
            :key="i"
            class="hero__segment"
            :class="{ 'hero__segment--done': i <= reviewedToday }"
            :style="{ animationDelay: `${i * 25}ms` }"
          />
        </div>
        <p class="hero__session-label">{{ reviewedToday }} de {{ totalCards }} concluídos</p>
        <NuxtLink to="/revisar" class="hero__cta">
          Começar revisão
          <svg class="hero__cta-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </NuxtLink>
      </div>
    </div>
  </section>

  <!-- Hero: novo usuário (0 cards) -->
  <section v-else-if="totalUserCards === 0" class="hero hero--compact">
    <div class="hero__layout hero__layout--center">
      <div class="hero__narrative">
        <div class="hero__greeting">
          <img src="~/assets/mascot-baigi-reading.png" alt="" class="hero__mascot" />
          <span class="hero__salute">{{ greeting }}, {{ firstName }}.</span>
        </div>
        <h1 class="hero__number hero__number--sm">Crie seus primeiros cards.</h1>
        <p class="hero__meta">Importe um PDF ou crie um caderno pra começar.</p>
      </div>
      <div class="hero__panel hero__panel--simple">
        <NuxtLink to="/cadernos" class="hero__cta">Criar caderno</NuxtLink>
        <NuxtLink to="/importar" class="hero__link">Importar Anki →</NuxtLink>
      </div>
    </div>
  </section>

  <!-- Hero: tudo em dia -->
  <section v-else class="hero hero--compact">
    <div class="hero__layout hero__layout--center">
      <div class="hero__narrative">
        <div class="hero__greeting">
          <img src="~/assets/mascot-baigi-celebrating.png" alt="" class="hero__mascot" />
          <span class="hero__salute">{{ greeting }}, {{ firstName }}.</span>
        </div>
        <h1 class="hero__number hero__number--sm">Tudo em dia! 🎉</h1>
        <p class="hero__meta">{{ subtitle }}</p>
      </div>
      <div class="hero__panel hero__panel--simple">
        <NuxtLink to="/cadernos" class="hero__cta hero__cta--secondary">Ir pra Cadernos</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BacklogStats, Stats, TopicProgress } from '~/types'

const props = defineProps<{
  stats: Stats | null
  backlog: BacklogStats | null
  topicProgress: TopicProgress[]
  nextExam: { title: string; days_remaining: number } | null
  userName: string
}>()

const firstName = computed(() => props.userName?.split(' ')[0] ?? 'estudante')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const streak = computed(() => props.stats?.streak ?? 0)
const reviewedToday = computed(() => props.stats?.reviewed_today ?? 0)
const totalUserCards = computed(() => props.stats?.total_cards ?? 0)
const totalCards = computed(() => (props.stats?.due_today ?? 0) + (props.backlog?.overdue_count ?? 0))
const totalDue = computed(() => (props.stats?.due_today ?? 0) + reviewedToday.value)
const topicCount = computed(() => props.topicProgress.filter(t => (t as any).pending_count > 0).length || props.topicProgress.length)
const estimatedMinutes = computed(() => props.backlog?.estimated_minutes ?? Math.ceil(totalCards.value * 0.25))

const heroMeta = computed(() => {
  const parts: string[] = []

  // Estimated time
  if (estimatedMinutes.value > 0) parts.push(`≈${estimatedMinutes.value} min`)

  // Caderno count
  if (topicCount.value > 0) {
    parts.push(`${topicCount.value} ${topicCount.value === 1 ? 'caderno' : 'cadernos'}`)
  }

  return parts.join(' · ')
})

const progressPercent = computed(() => {
  if (!totalDue.value) return 0
  return Math.round((reviewedToday.value / totalDue.value) * 100)
})

const subtitle = computed(() => {
  if (streak.value > 7) return `${streak.value} dias seguidos. Continue assim.`
  return 'Que tal gerar novos cards?'
})
</script>

<style scoped>
/* ===== Hero Surface ===== */
.hero {
  position: relative;
  background: #FFFFFF;
  border: 1px solid #DDD4F5;
  border-radius: 16px;
  padding: 28px 32px;
  overflow: hidden;
  box-shadow:
    0 2px 4px rgba(111, 63, 245, 0.04),
    0 8px 24px rgba(111, 63, 245, 0.06),
    0 16px 48px rgba(111, 63, 245, 0.03);
}
.dark .hero {
  background: var(--bg-card);
  border-color: color-mix(in srgb, var(--color-accent-primary) 15%, var(--border-base));
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.2),
    0 8px 24px rgba(0, 0, 0, 0.15);
}
.hero--compact {
  padding: 24px 28px;
}

/* ===== Atmosphere ===== */
.hero__atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    radial-gradient(ellipse 45% 65% at 55% 48%, rgba(109, 61, 245, 0.05), transparent 55%),
    radial-gradient(ellipse 25% 40% at 68% 42%, rgba(190, 166, 255, 0.035), transparent 45%);
}
.dark .hero__atmosphere {
  background:
    radial-gradient(ellipse 45% 65% at 55% 48%, rgba(109, 61, 245, 0.09), transparent 55%),
    radial-gradient(ellipse 25% 40% at 68% 42%, rgba(156, 114, 255, 0.06), transparent 45%);
}

/* ===== Synapse network ===== */
.hero__synapse {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 200px;
  left: 28%;
  right: 18%;
  max-width: 500px;
  pointer-events: none;
  z-index: 0;
}

/* --- Hub nodes: pulse + drift + glow --- */
.synapse__node--hub-a {
  transform-origin: 190px 88px;
  animation:
    hubPulseA 3s ease-in-out infinite,
    hubDriftA 5.5s ease-in-out infinite,
    hubGlowA 3s ease-in-out infinite;
}
.synapse__node--hub-b {
  transform-origin: 330px 100px;
  animation:
    hubPulseB 3.5s ease-in-out infinite,
    hubDriftB 6.5s ease-in-out infinite,
    hubGlowB 3.5s ease-in-out infinite;
}

/* Hub A pulse (scale 1 → 1.08) */
@keyframes hubPulseA {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes hubPulseB {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

/* Hub drift (organic 2-3px movement) */
@keyframes hubDriftA {
  0%, 100% { translate: 0 0; }
  25% { translate: 1.5px -1px; }
  50% { translate: -1px 2px; }
  75% { translate: 2px 1px; }
}
@keyframes hubDriftB {
  0%, 100% { translate: 0 0; }
  25% { translate: -2px 1px; }
  50% { translate: 1px -1.5px; }
  75% { translate: -1px -2px; }
}

/* Hub glow (drop-shadow intensifies with pulse) */
@keyframes hubGlowA {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(109, 61, 245, 0.15)); }
  50% { filter: drop-shadow(0 0 7px rgba(109, 61, 245, 0.40)); }
}
@keyframes hubGlowB {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(109, 61, 245, 0.15)); }
  50% { filter: drop-shadow(0 0 8px rgba(109, 61, 245, 0.45)); }
}

/* Hub halos breathe with the nodes */
.synapse__halo--a {
  transform-origin: 190px 88px;
  animation: haloPulseA 3s ease-in-out infinite;
}
.synapse__halo--b {
  transform-origin: 330px 100px;
  animation: haloPulseB 3.5s ease-in-out infinite;
}
@keyframes haloPulseA {
  0%, 100% { opacity: 0.07; transform: scale(1); }
  50% { opacity: 0.12; transform: scale(1.05); }
}
@keyframes haloPulseB {
  0%, 100% { opacity: 0.06; transform: scale(1); }
  50% { opacity: 0.10; transform: scale(1.04); }
}

/* --- Secondary nodes: gentle drift + subtle scale --- */
.synapse__node--secondary {
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
.synapse__node--s1 {
  transform-origin: 95px 72px;
  animation: secDrift1 5s ease-in-out infinite, secPulse 4s ease-in-out infinite;
  animation-delay: -1s, -0.5s;
}
.synapse__node--s2 {
  transform-origin: 255px 95px;
  animation: secDrift2 6s ease-in-out infinite, secPulse 3.5s ease-in-out infinite;
  animation-delay: -2s, -1.2s;
}
.synapse__node--s3 {
  transform-origin: 130px 125px;
  animation: secDrift3 5.5s ease-in-out infinite, secPulse 4.5s ease-in-out infinite;
  animation-delay: -3s, -2s;
}
.synapse__node--s4 {
  transform-origin: 380px 62px;
  animation: secDrift4 6.5s ease-in-out infinite, secPulse 4s ease-in-out infinite;
  animation-delay: -0.5s, -3s;
}
.synapse__node--s5 {
  transform-origin: 375px 130px;
  animation: secDrift5 5.8s ease-in-out infinite, secPulse 4.2s ease-in-out infinite;
  animation-delay: -4s, -1.8s;
}

@keyframes secPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes secDrift1 {
  0%, 100% { translate: 0 0; }
  33% { translate: 1px -1.5px; }
  66% { translate: -1px 1px; }
}
@keyframes secDrift2 {
  0%, 100% { translate: 0 0; }
  33% { translate: -1.5px 1px; }
  66% { translate: 1px -1px; }
}
@keyframes secDrift3 {
  0%, 100% { translate: 0 0; }
  33% { translate: 1px 1.5px; }
  66% { translate: -1.5px -0.5px; }
}
@keyframes secDrift4 {
  0%, 100% { translate: 0 0; }
  33% { translate: -1px -1px; }
  66% { translate: 1.5px 0.5px; }
}
@keyframes secDrift5 {
  0%, 100% { translate: 0 0; }
  33% { translate: 0.5px 1.5px; }
  66% { translate: -1px -1.5px; }
}

/* --- Small nodes: opacity flicker only (nearly static) --- */
.synapse__node--small {
  animation: smallFlicker 6s ease-in-out infinite;
}
.synapse__node--sm1 { animation-delay: -1s; }
.synapse__node--sm2 { animation-delay: -2.5s; }
.synapse__node--sm3 { animation-delay: -4s; }
.synapse__node--sm4 { animation-delay: -0.5s; }
.synapse__node--sm5 { animation-delay: -3.2s; }
.synapse__node--sm6 { animation-delay: -5s; }
.synapse__node--sm7 { animation-delay: -1.8s; }
.synapse__node--sm8 { animation-delay: -4.5s; }
.synapse__node--coral1 { animation-delay: -2s; }
.synapse__node--coral2 { animation-delay: -3.5s; }

@keyframes smallFlicker {
  0%, 100% { opacity: var(--_base-opacity, 0.25); }
  50% { opacity: calc(var(--_base-opacity, 0.25) * 1.3); }
}

/* Set base opacity per small node via inline or override */
.synapse__node--sm1 { --_base-opacity: 0.28; }
.synapse__node--sm2 { --_base-opacity: 0.26; }
.synapse__node--sm3 { --_base-opacity: 0.22; }
.synapse__node--sm4 { --_base-opacity: 0.24; }
.synapse__node--sm5 { --_base-opacity: 0.25; }
.synapse__node--sm6 { --_base-opacity: 0.18; }
.synapse__node--sm7 { --_base-opacity: 0.16; }
.synapse__node--sm8 { --_base-opacity: 0.15; }
.synapse__node--coral1 { --_base-opacity: 0.45; }
.synapse__node--coral2 { --_base-opacity: 0.35; }

/* --- Traveling signals --- */
.synapse__signal {
  will-change: opacity;
}

/* === Reduced motion: disable ALL animations === */
@media (prefers-reduced-motion: reduce) {
  .synapse__node,
  .synapse__halo,
  .synapse__signal {
    animation: none !important;
    translate: none !important;
    transform: none !important;
    filter: none !important;
  }
  .synapse__signal {
    display: none;
  }
}

@media (max-width: 767px) {
  .hero__synapse,
  .hero__atmosphere {
    display: none;
  }
}

/* ===== Layout ===== */
.hero__layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: end;
}
@media (min-width: 768px) {
  .hero__layout {
    grid-template-columns: 1fr 260px;
    gap: 40px;
  }
}
.hero__layout--center {
  align-items: center;
}

/* ===== Narrative (left) ===== */
.hero__narrative {
  min-width: 0;
}
.hero__greeting {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.hero__mascot {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 5px;
}
.hero__salute {
  font-size: 13.5px;
  font-weight: 450;
  color: var(--text-body);
}
.hero__exam {
  font-size: 10.5px;
  font-weight: 530;
  color: var(--color-warning);
  padding: 2px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-warning) 10%, transparent);
  margin-left: 4px;
}
.hero__eyebrow {
  font-size: 14px;
  font-weight: 420;
  color: var(--text-body);
  margin-bottom: 6px;
}
.hero__number {
  font-size: 3.5rem;
  font-weight: 810;
  line-height: 0.92;
  color: var(--text-heading);
  letter-spacing: -0.045em;
}
.hero__number--sm {
  font-size: 2rem;
  letter-spacing: -0.025em;
  font-weight: 730;
}
@media (min-width: 768px) {
  .hero__number {
    font-size: 4.5rem;
  }
}
.hero__value {
  color: #6D3DF5;
}
.dark .hero__value {
  color: var(--color-accent-primary);
}
.hero__unit {
  color: var(--text-heading);
  opacity: 0.65;
}
.hero__meta {
  font-size: 13px;
  font-weight: 430;
  color: var(--text-muted);
  margin-top: 12px;
}

/* ===== Panel (right) ===== */
.hero__panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(216, 207, 240, 0.60);
  border-radius: 12px;
  box-shadow:
    0 2px 8px rgba(111, 63, 245, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}
.dark .hero__panel {
  background: color-mix(in srgb, var(--bg-soft) 80%, var(--bg-card));
  border-color: color-mix(in srgb, var(--color-accent-primary) 12%, var(--border-base));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}
.hero__panel--simple {
  background: transparent;
  border: none;
  padding: 0;
  gap: 10px;
  align-items: flex-start;
  box-shadow: none;
  backdrop-filter: none;
}
.hero__panel-title {
  font-size: 10px;
  font-weight: 650;
  color: #5A2EE6;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.dark .hero__panel-title {
  color: var(--color-accent-primary);
}

/* Session viz */
.hero__session-viz {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.hero__segment {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: #E8E0F8;
  transition: background 200ms ease-out, transform 200ms ease-out;
  animation: segmentAppear 300ms ease-out both;
}
.dark .hero__segment {
  background: color-mix(in srgb, var(--color-accent-primary) 15%, var(--bg-soft));
}
.hero__segment--done {
  background: #6D3DF5;
  transform: scale(1.05);
}
.dark .hero__segment--done {
  background: var(--color-accent-primary);
}
@keyframes segmentAppear {
  from { opacity: 0; transform: scale(0.4); }
  to { opacity: 1; transform: scale(1); }
}
.hero__session-label {
  font-size: 11.5px;
  font-weight: 450;
  color: var(--text-muted);
}

/* CTA */
.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  padding: 0 24px;
  font-size: 14px;
  font-weight: 620;
  color: #fff;
  background: #6D3DF5;
  border-radius: 10px;
  transition: all 180ms ease-out;
  box-shadow:
    0 2px 4px rgba(109, 61, 245, 0.15),
    0 6px 16px rgba(109, 61, 245, 0.12);
  letter-spacing: 0.01em;
}
.dark .hero__cta {
  background: var(--color-accent-primary);
  color: var(--color-accent-primary-text);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.25),
    0 6px 16px color-mix(in srgb, var(--color-accent-primary) 15%, transparent);
}
.hero__cta:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 8px rgba(109, 61, 245, 0.18),
    0 12px 28px rgba(109, 61, 245, 0.15);
  background: #5A2EE6;
}
.dark .hero__cta:hover {
  background: var(--color-accent-primary-hover);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.3),
    0 12px 28px color-mix(in srgb, var(--color-accent-primary) 18%, transparent);
}
.hero__cta:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 4px rgba(109, 61, 245, 0.1);
}
.hero__cta:focus-visible {
  outline: 2px solid #BEA6FF;
  outline-offset: 3px;
}
.hero__cta-arrow {
  transition: transform 180ms ease-out;
  opacity: 0.85;
}
.hero__cta:hover .hero__cta-arrow {
  transform: translateX(3px);
  opacity: 1;
}
.hero__cta--secondary {
  background: transparent;
  color: #6D3DF5;
  border: 1px solid color-mix(in srgb, #6D3DF5 18%, var(--border-base));
  box-shadow: none;
  width: auto;
}
.dark .hero__cta--secondary {
  color: var(--color-accent-primary);
  border-color: color-mix(in srgb, var(--color-accent-primary) 18%, var(--border-base));
}
.hero__cta--secondary:hover {
  background: color-mix(in srgb, #6D3DF5 5%, transparent);
  transform: none;
  box-shadow: none;
}
.hero__link {
  font-size: 13px;
  font-weight: 500;
  color: #6D3DF5;
  transition: opacity 150ms;
}
.dark .hero__link {
  color: var(--color-accent-primary);
}
.hero__link:hover {
  opacity: 0.7;
}
</style>
