<template>
  <div class="relative">
    <!-- Purple glow behind card - pulsing -->
    <div class="absolute -inset-4 bg-[#6F3FF5]/[0.06] rounded-[36px] blur-2xl animate-glow-pulse" />

    <!-- Main card container -->
    <div class="relative bg-white rounded-[28px] shadow-[0_20px_60px_rgba(111,63,245,0.12)] border border-[#E8E0F8] p-5 sm:p-7">
      <!-- Pipeline steps with stagger animation -->
      <div class="flex flex-col gap-2.5">
        <!-- Step 1: PDF imported -->
        <div class="pipeline-step pipeline-step-1 flex items-center gap-3 bg-[#F8F6FF] rounded-xl px-4 py-3">
          <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
            <svg class="w-[18px] h-[18px] text-[#6F3FF5]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-gray-800">PDF importado</p>
            <p class="text-[11px] text-gray-400 mt-0.5">meu-material-de-estudo.pdf</p>
          </div>
          <!-- Check icon with delay -->
          <div class="step-check step-check-1 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- Arrow -->
        <div class="pipeline-arrow pipeline-arrow-1 flex justify-center py-0.5">
          <svg class="w-3.5 h-3.5 text-[#BEA6FF]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <!-- Step 2: Note structured -->
        <div class="pipeline-step pipeline-step-2 flex items-center gap-3 bg-[#F8F6FF] rounded-xl px-4 py-3">
          <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
            <svg class="w-[18px] h-[18px] text-[#6F3FF5]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-gray-800">Nota estruturada pela IA</p>
            <p class="text-[11px] text-gray-400 mt-0.5">
              <span class="counter counter-pages">47</span> páginas processadas
            </p>
          </div>
          <div class="step-check step-check-2 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- Arrow -->
        <div class="pipeline-arrow pipeline-arrow-2 flex justify-center py-0.5">
          <svg class="w-3.5 h-3.5 text-[#BEA6FF]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <!-- Step 3: Flashcards -->
        <div class="pipeline-step pipeline-step-3 flex items-center gap-3 bg-[#F8F6FF] rounded-xl px-4 py-3">
          <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
            <svg class="w-[18px] h-[18px] text-[#6F3FF5]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-gray-800">
              <span class="counter counter-cards">24</span> flashcards gerados
            </p>
            <div class="mt-1.5 flex gap-1">
              <div class="h-[6px] rounded-full bg-emerald-400 flex-[3] shimmer-bar" />
              <div class="h-[6px] rounded-full bg-amber-400 flex-[2]" />
              <div class="h-[6px] rounded-full bg-red-400 flex-[1]" />
            </div>
          </div>
          <div class="step-check step-check-3 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- Arrow -->
        <div class="pipeline-arrow pipeline-arrow-3 flex justify-center py-0.5">
          <svg class="w-3.5 h-3.5 text-[#BEA6FF]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <!-- Step 4: Podcast (highlighted, active) -->
        <div class="pipeline-step pipeline-step-4 flex items-center gap-3 bg-[#EDE6FF] rounded-xl px-4 py-3 ring-1 ring-[#6F3FF5]/20">
          <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-gray-100 animate-podcast-pulse">
            <svg class="w-[18px] h-[18px] text-[#6F3FF5]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-[#6F3FF5]">Podcast dos pontos fracos</p>
            <div class="mt-1.5 flex items-center gap-2">
              <!-- Equalizer bars -->
              <div class="flex items-end gap-[2px] h-3">
                <div class="w-[3px] rounded-full bg-[#6F3FF5] equalizer-bar eq-1" />
                <div class="w-[3px] rounded-full bg-[#6F3FF5] equalizer-bar eq-2" />
                <div class="w-[3px] rounded-full bg-[#6F3FF5] equalizer-bar eq-3" />
                <div class="w-[3px] rounded-full bg-[#6F3FF5] equalizer-bar eq-4" />
              </div>
              <div class="flex-1 h-[5px] rounded-full bg-[#D8CBFF] overflow-hidden">
                <div class="h-full rounded-full bg-[#6F3FF5] animate-progress-bar" />
              </div>
              <span class="text-[11px] text-[#6F3FF5] font-medium tabular-nums">4:32</span>
            </div>
          </div>
        </div>

        <!-- Arrow -->
        <div class="pipeline-arrow pipeline-arrow-4 flex justify-center py-0.5">
          <svg class="w-3.5 h-3.5 text-[#BEA6FF]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <!-- Step 5: Review scheduled (closes the loop) -->
        <div class="pipeline-step pipeline-step-5 flex items-center gap-3 bg-[#F8F6FF] rounded-xl px-4 py-3 ring-1 ring-[#E0D4FF]">
          <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
            <svg class="w-[18px] h-[18px] text-[#6F3FF5]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-[#1E0A3C]">Próxima revisão em 3 dias</p>
            <p class="text-[11px] text-gray-400 mt-0.5">O algoritmo calcula o momento ideal</p>
          </div>
          <div class="step-check step-check-5 w-5 h-5 rounded-full bg-[#F0EAFF] flex items-center justify-center shrink-0">
            <svg class="w-3 h-3 text-[#6F3FF5]" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Mascot - positioned far right, not overlapping content -->
    <img
      src="~/assets/mascot-baigi.png"
      alt="Baigi"
      class="absolute -bottom-6 -right-14 sm:-right-20 w-24 sm:w-32 z-10 pointer-events-none drop-shadow-lg -scale-x-100"
    />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
/* === Pipeline Steps: staggered fade in up === */
.pipeline-step {
  opacity: 0;
  transform: translateY(12px);
  animation: fadeInUp 0.5s ease forwards;
}
.pipeline-step-1 { animation-delay: 0.3s; }
.pipeline-step-2 { animation-delay: 0.9s; }
.pipeline-step-3 { animation-delay: 1.5s; }
.pipeline-step-4 { animation-delay: 2.1s; }
.pipeline-step-5 { animation-delay: 2.7s; }

/* === Arrows: fade in between steps === */
.pipeline-arrow {
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}
.pipeline-arrow-1 { animation-delay: 0.7s; }
.pipeline-arrow-2 { animation-delay: 1.3s; }
.pipeline-arrow-3 { animation-delay: 1.9s; }
.pipeline-arrow-4 { animation-delay: 2.5s; }

/* === Check marks: pop in after step appears === */
.step-check {
  opacity: 0;
  transform: scale(0);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.step-check-1 { animation-delay: 0.6s; }
.step-check-2 { animation-delay: 1.2s; }
.step-check-3 { animation-delay: 1.8s; }
.step-check-5 { animation-delay: 3.0s; }

/* === Counters: count up effect via opacity === */
.counter {
  display: inline-block;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}
.counter-pages { animation-delay: 1.1s; }
.counter-cards { animation-delay: 1.7s; }

/* === Podcast equalizer bars === */
.equalizer-bar {
  animation: equalize 0.8s ease-in-out infinite alternate;
}
.eq-1 { height: 4px; animation-delay: 2.3s; }
.eq-2 { height: 8px; animation-delay: 2.4s; }
.eq-3 { height: 6px; animation-delay: 2.5s; }
.eq-4 { height: 10px; animation-delay: 2.6s; }

/* === Progress bar: grows after podcast appears === */
.animate-progress-bar {
  width: 0%;
  animation: progressGrow 4s 2.5s ease-in-out forwards;
}

/* === Shimmer on flashcard progress bar === */
.shimmer-bar {
  position: relative;
  overflow: hidden;
}
.shimmer-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 2s 2s infinite;
}

/* === Podcast icon pulse === */
.animate-podcast-pulse {
  animation: podcastPulse 2s 2.3s ease-in-out infinite;
}

/* === Glow pulse behind card === */
.animate-glow-pulse {
  animation: glowPulse 3s ease-in-out infinite;
}

/* === Lightbulb float === */
.animate-bulb-float {
  animation: bulbFloat 3s ease-in-out infinite;
}

/* === Sparkle twinkle === */
.animate-sparkle {
  animation: sparkle 2s ease-in-out infinite;
}
.animate-sparkle-delayed {
  animation: sparkle 2s 0.5s ease-in-out infinite;
}

/* ========== KEYFRAMES ========== */

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes equalize {
  0% { height: 3px; }
  100% { height: 12px; }
}

@keyframes progressGrow {
  0% { width: 0%; }
  100% { width: 72%; }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes podcastPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(111, 63, 245, 0); }
  50% { box-shadow: 0 0 0 4px rgba(111, 63, 245, 0.15); }
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes bulbFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.6); }
}
</style>
