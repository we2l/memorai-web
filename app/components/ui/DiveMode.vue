<template>
  <!-- Diving animation -->
  <Transition name="dive-screen">
    <div v-if="showDiveAnimation" class="dive-animation-screen" @click.prevent>
      <div class="dive-ocean">
        <!-- Waves -->
        <svg class="dive-waves" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path class="wave wave-1" d="M0,30 C50,10 100,50 150,30 C200,10 250,50 300,30 C350,10 400,50 400,30 L400,60 L0,60 Z" />
          <path class="wave wave-2" d="M0,35 C60,15 110,55 160,35 C210,15 260,55 310,35 C360,15 400,45 400,35 L400,60 L0,60 Z" />
        </svg>
        <!-- Ripples on impact -->
        <div class="dive-ripple dive-ripple-1" />
        <div class="dive-ripple dive-ripple-2" />
        <!-- Bubbles -->
        <div class="dive-bubble dive-bubble-1" />
        <div class="dive-bubble dive-bubble-2" />
        <div class="dive-bubble dive-bubble-3" />
        <!-- Baigi diving fast -->
        <div class="dive-baigi-diving">
          <UiBaigiMascot state="idle" :visible="true" :size="80" />
        </div>
      </div>
      <p class="dive-text">Mergulhando...</p>
    </div>
  </Transition>

  <!-- Rising animation -->
  <Transition name="dive-screen">
    <div v-if="showRiseAnimation" class="dive-animation-screen" @click.prevent>
      <div class="dive-ocean dive-ocean--emerge">
        <!-- Waves (agitated) -->
        <svg class="dive-waves dive-waves--splash" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path class="wave wave-1" d="M0,30 C50,10 100,50 150,30 C200,10 250,50 300,30 C350,10 400,50 400,30 L400,60 L0,60 Z" />
          <path class="wave wave-2" d="M0,35 C60,15 110,55 160,35 C210,15 260,55 310,35 C360,15 400,45 400,35 L400,60 L0,60 Z" />
        </svg>
        <!-- Big splash -->
        <div class="emerge-splash" />
        <div class="emerge-splash emerge-splash-2" />
        <!-- Water drops -->
        <div class="water-drop drop-1" />
        <div class="water-drop drop-2" />
        <div class="water-drop drop-3" />
        <div class="water-drop drop-4" />
        <div class="water-drop drop-5" />
        <!-- Baigi shooting up and jumping high -->
        <div class="dive-baigi-rising">
          <UiBaigiMascot state="celebrating" :visible="true" :size="80" />
        </div>
      </div>
      <p class="dive-text-rise">Bom mergulho 🐬</p>
    </div>
  </Transition>

  <!-- Active dive overlay -->
  <div v-if="dive.active.value && !showDiveAnimation && !showRiseAnimation" class="dive-overlay">
    <div class="dive-timer">
      <span class="text-micro text-base-muted uppercase tracking-widest">Mergulho</span>
      <span v-if="dive.externalCountdown.value != null" class="font-mono text-sm text-accent-primary">
        {{ dive.formatElapsed(dive.externalCountdown.value) }}
      </span>
      <span v-else class="font-mono text-sm text-[var(--color-accent-soft)]">{{ dive.formatElapsed(dive.elapsed.value) }}</span>
    </div>
    <button class="dive-exit" @click="exitDive">
      🐬 Emergir
    </button>
  </div>
</template>

<script setup lang="ts">
const dive = useDiveMode()
const showDiveAnimation = ref(false)
const showRiseAnimation = ref(false)

watch(() => dive.active.value, (active) => {
  if (active) {
    showDiveAnimation.value = true
    setTimeout(() => {
      showDiveAnimation.value = false
    }, 1800)
  }
})

function exitDive() {
  showRiseAnimation.value = true
  setTimeout(() => {
    dive.stop()
    showRiseAnimation.value = false
  }, 2200)
}
</script>

<style scoped>
.dive-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

.dive-animation-screen {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  pointer-events: all;
}

.dive-ocean {
  position: relative;
  width: 320px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dive-ocean--emerge {
  height: 300px;
}

/* Waves */
.dive-waves {
  position: absolute;
  bottom: 40px;
  left: 0;
  width: 100%;
  height: 60px;
}

.wave {
  fill: rgba(111, 63, 245, 0.1);
}

.wave-1 {
  animation: wave-move 2.5s ease-in-out infinite;
}

.wave-2 {
  fill: rgba(111, 63, 245, 0.05);
  animation: wave-move 2.5s ease-in-out infinite 0.4s;
}

.dive-waves--splash .wave-1 {
  animation: wave-splash 0.8s ease-out 0.2s both, wave-move 2s ease-in-out infinite 1s;
}

/* Ripples on dive impact */
.dive-ripple {
  position: absolute;
  bottom: 55px;
  left: 50%;
  width: 20px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid rgba(111, 63, 245, 0.25);
  opacity: 0;
}

.dive-ripple-1 {
  animation: ripple 0.8s ease-out 0.7s both;
}

.dive-ripple-2 {
  animation: ripple 0.8s ease-out 0.9s both;
}

/* Bubbles after dive */
.dive-bubble {
  position: absolute;
  bottom: 30px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(111, 63, 245, 0.2);
  opacity: 0;
}

.dive-bubble-1 {
  left: 45%;
  animation: bubble-up 1s ease-out 0.8s both;
}

.dive-bubble-2 {
  left: 52%;
  animation: bubble-up 1.2s ease-out 1s both;
  width: 4px;
  height: 4px;
}

.dive-bubble-3 {
  left: 48%;
  animation: bubble-up 0.9s ease-out 1.1s both;
  width: 5px;
  height: 5px;
}

/* Emerge splash */
.emerge-splash {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(111, 63, 245, 0.2);
  animation: big-splash 0.5s ease-out 0.15s both;
}

.emerge-splash-2 {
  animation-delay: 0.25s;
  background: rgba(111, 63, 245, 0.12);
}

/* Water drops flying up on emerge */
.water-drop {
  position: absolute;
  bottom: 60px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(111, 63, 245, 0.35);
  opacity: 0;
}

.drop-1 { left: 42%; animation: drop-fly 0.7s ease-out 0.2s both; --dx: -20px; --dy: -50px; }
.drop-2 { left: 48%; animation: drop-fly 0.6s ease-out 0.25s both; --dx: -8px; --dy: -65px; }
.drop-3 { left: 52%; animation: drop-fly 0.65s ease-out 0.2s both; --dx: 10px; --dy: -55px; }
.drop-4 { left: 56%; animation: drop-fly 0.7s ease-out 0.3s both; --dx: 22px; --dy: -45px; }
.drop-5 { left: 50%; animation: drop-fly 0.55s ease-out 0.22s both; --dx: 2px; --dy: -70px; width: 3px; height: 3px; }

/* Baigi diving — vira rápido e mergulha */
.dive-baigi-diving {
  position: absolute;
  top: 10px;
  animation: dolphin-dive 1s cubic-bezier(0.4, 0, 1, 1) forwards;
}

/* Baigi emerging — dispara do fundo e salta alto */
.dive-baigi-rising {
  position: absolute;
  bottom: 60px;
  animation: dolphin-emerge 0.7s ease-out forwards;
}

.dive-text {
  margin-top: 24px;
  font-size: 0.9rem;
  color: var(--color-accent-primary);
  animation: fade-in 0.4s ease 0.6s both;
}

.dive-text-rise {
  margin-top: 24px;
  font-size: 0.9rem;
  color: var(--color-accent-primary);
  animation: fade-in 0.3s ease 1.2s both;
}

.dive-timer {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border-base);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(8px);
  pointer-events: auto;
}

.dive-exit {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  border-radius: 9999px;
  background: rgba(111, 63, 245, 0.08);
  border: 1px solid rgba(111, 63, 245, 0.2);
  color: var(--color-accent-primary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.2s;
}

.dive-exit:hover {
  background: rgba(111, 63, 245, 0.15);
}

/* DIVE: bico aponta pra baixo a 90°, mergulha rápido */
@keyframes dolphin-dive {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  20% {
    transform: translate(5px, 20px) rotate(50deg);
    opacity: 1;
  }
  40% {
    transform: translate(10px, 70px) rotate(90deg);
    opacity: 1;
  }
  60% {
    transform: translate(12px, 130px) rotate(90deg);
    opacity: 0.8;
  }
  100% {
    transform: translate(14px, 220px) rotate(90deg);
    opacity: 0;
  }
}

/* EMERGE: sobe reto e rápido a 70°, sem bounce */
@keyframes dolphin-emerge {
  from {
    transform: translate(0, 150px) rotate(-70deg) scale(0.6);
    opacity: 0;
  }
  to {
    transform: translate(0, -170px) rotate(-20deg) scale(1);
    opacity: 1;
  }
}

@keyframes wave-move {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-12px); }
}

@keyframes wave-splash {
  0% { transform: translateY(0) scaleY(1); }
  50% { transform: translateY(-8px) scaleY(1.4); }
  100% { transform: translateY(0) scaleY(1); }
}

@keyframes ripple {
  0% { transform: translateX(-50%) scale(1); opacity: 0.6; }
  100% { transform: translateX(-50%) scale(4); opacity: 0; }
}

@keyframes bubble-up {
  0% { transform: translateY(0); opacity: 0.6; }
  100% { transform: translateY(-40px); opacity: 0; }
}

@keyframes big-splash {
  0% { transform: translateX(-50%) scale(0); opacity: 0.9; }
  100% { transform: translateX(-50%) scale(4); opacity: 0; }
}

@keyframes drop-fly {
  0% { transform: translate(0, 0); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.dive-screen-enter-active { transition: opacity 0.3s ease; }
.dive-screen-leave-active { transition: opacity 0.4s ease; }
.dive-screen-enter-from, .dive-screen-leave-to { opacity: 0; }
</style>
