<template>
  <div class="min-h-screen bg-white">
    <!-- Navbar - white background like reference -->
    <header class="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <LandingLogoLanding :icon-size="34" size="md" />

        <nav class="hidden md:flex items-center gap-8">
          <a href="#como-funciona" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Como funciona</a>
          <a href="#planos" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Planos</a>
        </nav>

        <div class="flex items-center gap-4">
          <NuxtLink to="/entrar" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Entrar</NuxtLink>
          <NuxtLink to="/criar-conta" class="bg-[#6F3FF5] hover:bg-[#5A2EE6] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
            Começar grátis
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 sm:px-6 bg-white relative">
      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center pb-16 sm:pb-24">
        <!-- Left -->
        <div class="order-2 lg:order-1">
          <span class="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-[#F0EAFF] text-[#6F3FF5] border border-[#E0D4FF]">
            Sistema completo de estudos com IA
          </span>

          <h1 class="mt-6 text-[2.75rem] sm:text-[3.25rem] font-extrabold text-[#1E0A3C] leading-[1.08] tracking-tight">
            Seu PDF vira notas, flashcards e simulados em 30 segundos.
          </h1>

          <p class="mt-5 text-[17px] text-gray-600 max-w-[420px] leading-relaxed">
            Notas, flashcards, simulados e podcast personalizado — tudo gerado pela IA a partir do seu material.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-5">
            <NuxtLink to="/criar-conta" class="bg-[#6F3FF5] hover:bg-[#5A2EE6] text-white font-semibold text-[15px] px-8 py-4 rounded-2xl shadow-[0_4px_16px_rgba(111,63,245,0.3)] hover:shadow-[0_6px_20px_rgba(111,63,245,0.4)] transition-all hover:-translate-y-0.5">
              Começar grátis
            </NuxtLink>
            <button class="inline-flex items-center gap-3 text-[15px] font-medium text-gray-700 hover:text-[#6F3FF5] transition-colors" @click="showDemoModal = true">
              <span class="w-10 h-10 rounded-full bg-[#2D1B69] flex items-center justify-center shadow-md">
                <svg class="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </span>
              Ver demonstração (30s)
            </button>
          </div>

          <div class="mt-10">
            <p class="text-sm font-semibold text-gray-800">Feito para quem estuda de verdade.</p>
            <p class="text-xs text-gray-500 mt-1">Concurseiros · Universitários · Vestibulandos · Idiomas</p>
          </div>
        </div>

        <!-- Right -->
        <div class="order-1 lg:order-2">
          <LandingHeroPipeline />
        </div>
      </div>

      <!-- Wave separator: hero → social proof -->
      <div class="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
        <svg class="block w-full h-[70px] sm:h-[90px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 90" preserveAspectRatio="none">
          <path d="M0,50 C480,90 960,70 1440,20 L1440,90 L0,90 Z" fill="#F5F0FF" />
        </svg>
      </div>
    </section>

    <!-- Social proof -->
    <section class="py-12 px-4 sm:px-6 bg-[#F5F0FF]">
      <div class="max-w-4xl mx-auto">
        <p class="text-xs uppercase tracking-widest text-[#6F3FF5] font-bold text-center mb-5">Do primeiro PDF até o dia da prova</p>
        <div class="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          <div v-for="stat in socialStats" :key="stat.label" class="text-center">
            <p class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C]">{{ stat.value }}</p>
            <p class="text-[11px] text-gray-500 mt-0.5">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Wave separator: social proof → comparison -->
    <div class="overflow-hidden leading-[0] bg-[#F5F0FF]">
      <svg class="block w-full h-[70px] sm:h-[90px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 90" preserveAspectRatio="none">
        <path d="M0,30 C480,0 960,20 1440,40 L1440,90 L0,90 Z" fill="#FFFFFF" />
      </svg>
    </div>

    <!-- Comparação Baigi vs Anki -->
    <section class="pt-8 pb-16 sm:pb-20 px-4 sm:px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C] text-center mb-3">
          O Anki que deveria existir.
        </h2>
        <p class="text-sm text-gray-500 text-center mb-12">Repetição espaçada que funciona — sem a dor de cabeça.</p>

        <!-- Bento grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="item in comparisons"
            :key="item.solution"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <!-- Pain (Anki) -->
            <span class="text-[10px] font-medium text-gray-300 uppercase tracking-wide mb-2">Anki</span>
            <div class="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center mb-2">
              <component :is="item.painIcon" class="w-3.5 h-3.5 text-red-400" :stroke-width="2" />
            </div>
            <p class="text-xs text-gray-400 line-through decoration-red-300/60 mb-3">{{ item.pain }}</p>
            <!-- Arrow -->
            <svg class="w-3 h-3 text-[#BEA6FF] mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <!-- Solution (Baigi) -->
            <span class="text-[10px] font-bold text-[#6F3FF5] uppercase tracking-wide mb-2">Baigi</span>
            <div class="w-9 h-9 rounded-lg bg-[#F0EAFF] flex items-center justify-center mb-2">
              <component :is="item.solIcon" class="w-4.5 h-4.5 text-[#6F3FF5]" :stroke-width="2" />
            </div>
            <p class="text-sm font-semibold text-[#1E0A3C]">{{ item.solution }}</p>
          </div>
        </div>

        <div class="text-center mt-10">
          <p class="text-sm text-gray-500">
            Você não precisa abandonar o Anki.
            <span class="font-semibold text-[#6F3FF5]">Importe seus decks e continue de onde parou.</span>
          </p>
        </div>
      </div>
    </section>

    <!-- Wave: white → lavender -->
    <div class="overflow-hidden leading-[0] bg-white">
      <svg class="block w-full h-[50px] sm:h-[70px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path d="M0,35 C360,0 1080,70 1440,35 L1440,70 L0,70 Z" fill="#F5F0FF" />
      </svg>
    </div>

    <!-- Como funciona -->
    <section id="como-funciona" class="py-16 sm:py-20 px-4 sm:px-6 bg-[#F5F0FF]">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C]">Como funciona</h2>
          <p class="mt-2 text-sm text-gray-500">Três passos. Zero configuração.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="(step, i) in steps" :key="step.title" class="bg-white rounded-2xl border border-gray-100 shadow-md p-8 text-center hover:shadow-lg transition-shadow relative">
            <span class="absolute top-4 left-4 text-[11px] font-bold text-[#6F3FF5] bg-[#F0EAFF] w-6 h-6 rounded-full flex items-center justify-center">{{ i + 1 }}</span>
            <div class="w-14 h-14 rounded-2xl bg-[#F0EAFF] flex items-center justify-center mx-auto mb-5">
              <component :is="step.icon" class="w-7 h-7 text-[#6F3FF5]" :stroke-width="2" />
            </div>
            <h3 class="text-base font-bold text-[#1E0A3C] mb-2">{{ step.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Wave: lavender → white -->
    <div class="overflow-hidden leading-[0] bg-[#F5F0FF]">
      <svg class="block w-full h-[50px] sm:h-[70px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill="#FFFFFF" />
      </svg>
    </div>

    <!-- Casos de uso -->
    <section class="py-16 sm:py-20 px-4 sm:px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C] text-center mb-12">
          Para todo tipo de estudante
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="uc in useCases" :key="uc.title" class="bg-white rounded-2xl border border-gray-100 shadow-md p-8 text-center hover:shadow-lg transition-shadow">
            <div class="w-14 h-14 rounded-2xl bg-[#F0EAFF] flex items-center justify-center mx-auto mb-5">
              <component :is="uc.icon" class="w-7 h-7 text-[#6F3FF5]" :stroke-width="2" />
            </div>
            <h3 class="text-base font-bold text-[#1E0A3C] mb-2">{{ uc.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ uc.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Wave: white → lavender -->
    <div class="overflow-hidden leading-[0] bg-white">
      <svg class="block w-full h-[50px] sm:h-[70px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path d="M0,35 C360,0 1080,70 1440,35 L1440,70 L0,70 Z" fill="#F5F0FF" />
      </svg>
    </div>

    <!-- Visão macro do conhecimento -->
    <section class="py-16 sm:py-20 px-4 sm:px-6 bg-[#F5F0FF]">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C]">
            Enxergue seu conhecimento por inteiro.
          </h2>
          <p class="mt-2 text-sm text-gray-500">Veja exatamente quais assuntos você domina e quais precisam de revisão.</p>
        </div>

        <!-- Tabs -->
        <div class="flex items-center justify-center gap-2 mb-6">
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            :class="activeTab === 'graph' ? 'bg-white text-[#6F3FF5] shadow-md border border-[#E0D4FF]' : 'text-gray-500 hover:text-[#6F3FF5]'"
            @click="activeTab = 'graph'"
          >
            <Network :size="16" :stroke-width="2" />
            Grafo de Conhecimento
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            :class="activeTab === 'mindmap' ? 'bg-white text-[#6F3FF5] shadow-md border border-[#E0D4FF]' : 'text-gray-500 hover:text-[#6F3FF5]'"
            @click="activeTab = 'mindmap'"
          >
            <GitBranch :size="16" :stroke-width="2" />
            Mapa Mental
          </button>
        </div>

        <!-- Tab content -->
        <div class="relative">
          <LandingMockGraph v-if="activeTab === 'graph'" />
          <LandingMockMindMap v-else />
        </div>

        <!-- Caption -->
        <p class="mt-4 text-center text-xs text-gray-400">
          {{ activeTab === 'graph' ? 'Arraste nós, dê zoom e clique para ver detalhes — igual no app real.' : 'Expanda e recolha ramos, dê zoom — gerado automaticamente pela IA a partir das suas notas.' }}
        </p>

        <!-- Extra features grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          <div v-for="feat in hiddenFeatures" :key="feat.title" class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div class="w-10 h-10 rounded-xl bg-[#F0EAFF] flex items-center justify-center mx-auto mb-3">
              <component :is="feat.icon" class="w-5 h-5 text-[#6F3FF5]" :stroke-width="2" />
            </div>
            <h4 class="text-sm font-bold text-[#1E0A3C] mb-1">{{ feat.title }}</h4>
            <p class="text-[11px] text-gray-500 leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Wave: lavender → white -->
    <div class="overflow-hidden leading-[0] bg-[#F5F0FF]">
      <svg class="block w-full h-[50px] sm:h-[70px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill="#FFFFFF" />
      </svg>
    </div>

    <!-- Planos -->
    <section id="planos" class="py-16 sm:py-20 px-4 sm:px-6 bg-white">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C] text-center mb-3">
          Comece grátis. Evolua quando quiser.
        </h2>
        <p class="text-sm text-gray-500 text-center mb-8">Core ilimitado pra sempre. IA como upgrade natural.</p>

        <!-- Toggle -->
        <div class="flex items-center justify-center gap-4 mb-10">
          <span class="text-sm font-semibold cursor-pointer" :class="!isAnnual ? 'text-[#1E0A3C]' : 'text-gray-400'" @click="isAnnual = false">Mensal</span>
          <button
            class="relative w-14 h-7 rounded-full transition-colors duration-200"
            :class="isAnnual ? 'bg-[#6F3FF5]' : 'bg-gray-300'"
            @click="isAnnual = !isAnnual"
            aria-label="Alternar entre plano mensal e anual"
          >
            <span
              class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200"
              :style="{ transform: isAnnual ? 'translateX(28px)' : 'translateX(0)' }"
            />
          </button>
          <span class="text-sm font-semibold cursor-pointer" :class="isAnnual ? 'text-[#1E0A3C]' : 'text-gray-400'" @click="isAnnual = true">
            Anual
            <span class="ml-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">-20%</span>
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <!-- Free -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-md p-7">
            <h3 class="text-lg font-bold text-[#1E0A3C] mb-1">Grátis</h3>
            <p class="text-3xl font-extrabold text-[#1E0A3C] mb-1">R$ 0<span class="text-sm font-normal text-gray-400">/mês</span></p>
            <p class="text-xs text-gray-400 mb-5">Para sempre</p>
            <ul class="space-y-2.5 text-sm text-gray-600 mb-8">
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>Flashcards + repetição espaçada ilimitados</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>Notas, cadernos, grafo, agenda de provas</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>Importar do Anki (.apkg)</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>10 cards com IA/mês</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>5 conversas com agente/mês</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>1 simulado/mês</span></li>
              <li class="flex items-start gap-2"><span class="text-gray-300 font-bold">–</span><span class="text-gray-400">Podcast: prévia 30s</span></li>
            </ul>
            <NuxtLink to="/criar-conta" class="block w-full text-center py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#6F3FF5] hover:text-[#6F3FF5] transition-all">
              Começar grátis
            </NuxtLink>
          </div>

          <!-- Pro -->
          <div class="bg-white rounded-2xl border-2 border-[#6F3FF5]/20 shadow-lg p-7 relative">
            <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6F3FF5] text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-md">
              Mais popular
            </span>
            <h3 class="text-lg font-bold text-[#6F3FF5] mb-1">Pro</h3>
            <div class="mb-1">
              <p class="text-3xl font-extrabold text-[#1E0A3C] inline">
                R$ {{ isAnnual ? '23,99' : '29,90' }}
              </p>
              <span class="text-sm font-normal text-gray-400">/mês</span>
            </div>
            <p v-if="isAnnual" class="text-xs text-gray-400 mb-5">
              R$287,90 cobrado anualmente
              <span class="text-emerald-600 font-semibold">(economize R$71)</span>
            </p>
            <p v-else class="text-xs text-gray-400 mb-5">Cancele quando quiser</p>
            <ul class="space-y-2.5 text-sm text-gray-600 mb-8">
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>Tudo do Grátis, sem limites</span></li>
              <li class="flex items-start gap-2"><span class="text-[#6F3FF5] font-bold">∞</span><span>Cards com IA <strong>ilimitado</strong></span></li>
              <li class="flex items-start gap-2"><span class="text-[#6F3FF5] font-bold">∞</span><span>Agente tira-dúvidas <strong>ilimitado</strong></span></li>
              <li class="flex items-start gap-2"><span class="text-[#6F3FF5] font-bold">∞</span><span>Simulados ilimitados (com dissertativa)</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>30 PDFs processados/mês</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>10 podcasts completos/mês</span></li>
              <li class="flex items-start gap-2"><span class="text-emerald-500 font-bold">✓</span><span>Mapa mental com IA</span></li>
            </ul>
            <NuxtLink to="/criar-conta" class="block w-full text-center py-3.5 rounded-xl bg-[#6F3FF5] hover:bg-[#5A2EE6] text-white text-sm font-semibold shadow-[0_4px_12px_rgba(111,63,245,0.3)] hover:shadow-[0_6px_16px_rgba(111,63,245,0.4)] transition-all">
              Assinar Pro
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Wave: white → lavender -->
    <div class="overflow-hidden leading-[0] bg-white">
      <svg class="block w-full h-[50px] sm:h-[70px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill="#F5F0FF" />
      </svg>
    </div>

    <!-- FAQ -->
    <section class="py-16 sm:py-20 px-4 sm:px-6 bg-[#F5F0FF]">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C] text-center mb-12">
          Perguntas frequentes
        </h2>
        <div class="space-y-3">
          <details v-for="faq in faqs" :key="faq.q" class="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 group">
            <summary class="flex items-center justify-between cursor-pointer text-[#1E0A3C] font-semibold text-sm list-none">
              {{ faq.q }}
              <span class="text-gray-400 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
            </summary>
            <p class="mt-3 text-sm text-gray-500 leading-relaxed">{{ faq.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Wave: lavender → white -->
    <div class="overflow-hidden leading-[0] bg-[#F5F0FF]">
      <svg class="block w-full h-[50px] sm:h-[70px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill="#FFFFFF" />
      </svg>
    </div>

    <!-- CTA Final -->
    <section class="py-20 sm:py-24 px-4 sm:px-6 text-center bg-white">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-[#1E0A3C] mb-3">
        Do primeiro PDF até o dia da prova.
      </h2>
      <p class="text-base text-gray-500 mb-8">Comece agora — grátis, sem cartão, em 30 segundos.</p>
      <NuxtLink to="/criar-conta" class="inline-block bg-[#6F3FF5] hover:bg-[#5A2EE6] text-white font-semibold px-8 py-3.5 rounded-xl shadow-[0_4px_16px_rgba(111,63,245,0.3)] hover:shadow-[0_6px_20px_rgba(111,63,245,0.4)] transition-all hover:-translate-y-0.5">
        Criar conta grátis
      </NuxtLink>
    </section>

    <!-- Footer -->
    <footer class="py-8 px-4 sm:px-6 border-t border-gray-100 bg-white">

    <!-- Demo Video Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDemoModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="showDemoModal = false">
          <div class="absolute inset-0 bg-black/70" />
          <div class="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl bg-[#1E0A3C]">
            <!-- Close -->
            <button class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors" @click="showDemoModal = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <!-- Placeholder video -->
            <div class="aspect-video flex flex-col items-center justify-center gap-4 p-8">
              <div class="w-16 h-16 rounded-full bg-[#6F3FF5] flex items-center justify-center">
                <svg class="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <p class="text-white/80 text-sm text-center">Vídeo de demonstração em breve.</p>
              <p class="text-white/50 text-xs text-center">PDF → Nota → Flashcards → Podcast em 30 segundos.</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <LandingLogoLanding :icon-size="22" size="sm" />
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <a href="#recursos" class="hover:text-[#6F3FF5] transition-colors">Recursos</a>
          <a href="#planos" class="hover:text-[#6F3FF5] transition-colors">Planos</a>
          <NuxtLink to="/ajuda" class="hover:text-[#6F3FF5] transition-colors">Ajuda</NuxtLink>
          <a href="mailto:contato@baigi.com.br" class="hover:text-[#6F3FF5] transition-colors">Contato</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { FileUp, Sparkles, RefreshCw, Headphones, Brain, CalendarCheck, BookOpen, GraduationCap, Globe, PenLine, Layers, MonitorX, StickyNote, Network, ClipboardList, AlarmClockOff, Settings2, Languages, Zap, Podcast, BookMarked, GitBranch, ListChecks, Shield, Timer } from 'lucide-vue-next'

definePageMeta({ layout: 'landing' })

useHead({
  title: 'BAIGI — De PDF a revisão pronta em 30 segundos',
  meta: [
    { name: 'description', content: 'Transforme qualquer material em flashcards, notas, simulados e podcast com IA. Repetição espaçada inteligente. Grátis para começar.' },
    { property: 'og:title', content: 'BAIGI — Sistema completo de estudos com IA' },
    { property: 'og:description', content: 'PDF vira revisão pronta em 30 segundos. Flashcards, podcast e simulados gerados pela IA.' },
    { property: 'og:type', content: 'website' },
  ],
})

const auth = useAuthStore()
if (auth.isAuthenticated) {
  navigateTo('/hoje')
}

const isAnnual = ref(false)
const activeTab = ref<'graph' | 'mindmap'>('graph')
const showDemoModal = ref(false)

const socialStats = [
  { value: '30s', label: 'PDF vira material de estudo' },
  { value: '100%', label: 'em português' },
  { value: 'FSRS-6', label: 'mesmo algoritmo do Anki' },
  { value: '0', label: 'configuração necessária' },
]

const steps = [
  { icon: FileUp, title: 'Corte o tempo de resumo a zero', desc: 'Importe qualquer PDF ou apostila. A IA extrai o conteúdo e estrutura tudo pra você.' },
  { icon: Sparkles, title: 'Material de estudo pronto na hora', desc: 'Notas organizadas, flashcards atômicos e simulados — gerados automaticamente.' },
  { icon: RefreshCw, title: 'Revise exatamente antes de esquecer', desc: 'O algoritmo agenda cada revisão no momento ideal. E você ouve os pontos fracos como podcast.' },
]

const comparisons = [
  { pain: 'Criar cards na mão, um por um', painIcon: PenLine, solution: 'PDF vira 24 cards em 30s', solIcon: Zap, featured: false },
  { pain: 'Backlog infinito desmotiva', painIcon: Layers, solution: 'Modo Sobrevivência prioriza', solIcon: Shield, featured: false },
  { pain: 'Plugins pra tudo funcionar', painIcon: MonitorX, solution: 'Tudo integrado, zero config', solIcon: Sparkles, featured: false },
  { pain: 'Cards soltos, sem contexto', painIcon: StickyNote, solution: 'Notas + grafo + mapa mental', solIcon: Network, featured: false },
  { pain: 'Sem simulados nem provas', painIcon: ClipboardList, solution: 'Simulados com IA integrados', solIcon: ListChecks, featured: false },
  { pain: 'Sem áudio, só leitura', painIcon: AlarmClockOff, solution: 'Podcast dos pontos fracos', solIcon: Headphones, featured: false },
]

const useCases = [
  { icon: BookOpen, title: 'Concurseiros', desc: 'Edital gigante? Importe a apostila e tenha flashcards prontos em segundos. Agenda de provas prioriza o que cai mais.' },
  { icon: GraduationCap, title: 'Universitários', desc: 'Slides do professor viram material de revisão. Simulados antes da prova. Podcast no caminho da aula.' },
  { icon: Globe, title: 'Idiomas', desc: 'Vocabulário, gramática, expressões — tudo com repetição espaçada. Nunca mais esqueça uma palavra.' },
]

const hiddenFeatures = [
  { icon: Shield, title: 'Modo Sobrevivência', desc: 'Nunca deixe um backlog acabar com sua motivação.' },
  { icon: CalendarCheck, title: 'Agenda de Provas', desc: 'Estude mais perto da prova sem reorganizar tudo manualmente.' },
  { icon: Zap, title: 'Revisão Relâmpago', desc: 'Tem 5 minutos? Revise apenas o que importa.' },
  { icon: RefreshCw, title: 'Anti-Backlog', desc: 'O algoritmo reduz a carga sem sacrificar sua retenção.' },
]

const faqs = [
  { q: 'Posso importar do Anki?', a: 'Sim! Importa .apkg com decks, cards, tags e media automaticamente. Sem perder nada.' },
  { q: 'O plano grátis é realmente grátis?', a: 'Sim. Core ilimitado — flashcards, notas, grafo, revisão, importar Anki. A IA tem limites mensais que você pode expandir com o Pro.' },
  { q: 'Funciona no celular?', a: 'Sim, é PWA. Funciona em qualquer navegador como app nativo. Adicione à tela inicial e use offline.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Servidores no Brasil, criptografia em trânsito e repouso, compatível com LGPD.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem fidelidade. Cancela em 1 clique no painel. Seus dados e cards continuam no plano grátis.' },
  { q: 'Preciso saber usar Anki?', a: 'Não. O Baigi é simples desde o primeiro uso. Sem plugins, sem configuração, sem curva de aprendizado.' },
]
</script>

<style scoped>
html {
  scroll-behavior: smooth;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
