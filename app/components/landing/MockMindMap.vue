<template>
  <div class="relative w-full h-[380px] sm:h-[440px] rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
    <!-- Mind map container -->
    <div ref="containerRef" class="absolute inset-0 mindmap-landing" />

    <!-- Fit button -->
    <button
      class="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#6F3FF5] transition-colors"
      aria-label="Centralizar"
      @click="handleFit"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
      </svg>
    </button>

    <!-- Zoom controls -->
    <div class="absolute bottom-3 left-3 flex items-center gap-1">
      <span class="text-[10px] text-gray-400">Zoom e arraste habilitados</span>
    </div>

    <!-- Badge -->
    <div class="absolute top-3 left-3 bg-[#F0EAFF] border border-[#E0D4FF] text-[#6F3FF5] text-[10px] font-semibold px-2.5 py-1 rounded-lg">
      Gerado por IA
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMindMap, type MindMapNode } from '~/composables/useMindMap'

const containerRef = ref<HTMLElement | null>(null)

const mockData: MindMapNode = {
  content: 'Inglês — Nível B2',
  children: [
    {
      content: 'Gramática',
      children: [
        { content: 'Tempos Verbais', children: [
          { content: 'Present Perfect', children: [] },
          { content: 'Past Perfect', children: [] },
          { content: 'Future Continuous', children: [] },
        ] },
        { content: 'Condicionais', children: [
          { content: 'Zero & First', children: [] },
          { content: 'Second & Third', children: [] },
        ] },
        { content: 'Phrasal Verbs', children: [
          { content: 'get up, look for, break down', children: [] },
        ] },
        { content: 'Preposições', children: [] },
      ],
    },
    {
      content: 'Vocabulário',
      children: [
        { content: 'Viagem', children: [
          { content: 'Aeroporto & Hotel', children: [] },
          { content: 'Direções', children: [] },
        ] },
        { content: 'Trabalho', children: [
          { content: 'E-mails formais', children: [] },
          { content: 'Reuniões', children: [] },
        ] },
        { content: 'Expressões idiomáticas', children: [] },
      ],
    },
    {
      content: 'Listening',
      children: [
        { content: 'Podcasts nativos', children: [] },
        { content: 'TED Talks', children: [] },
        { content: 'Música (letras)', children: [] },
      ],
    },
    {
      content: 'Writing',
      children: [
        { content: 'Essays', children: [] },
        { content: 'E-mails', children: [] },
        { content: 'Creative writing', children: [] },
      ],
    },
  ],
}

const { render, fit, destroy } = useMindMap(containerRef)

onMounted(async () => {
  await nextTick()
  setTimeout(() => render(mockData), 100)
})

onUnmounted(() => destroy())

function handleFit() {
  fit()
}
</script>

<style>
.mindmap-landing svg {
  background: transparent;
}

.mindmap-landing .markmap-node text,
.mindmap-landing .markmap-node foreignObject span {
  color: #1E0A3C;
  fill: #1E0A3C;
  font-size: 12px;
}
</style>
