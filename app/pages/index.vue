<template>
  <div>
    <!-- Nav -->
    <header class="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-surface/80 border-b border-base">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <UiLogo :icon-size="24" text-class="text-lg font-semibold text-base-primary" />
        <div class="flex items-center gap-3">
          <NuxtLink to="/entrar" class="text-small text-base-muted hover:text-base-primary transition-colors">Entrar</NuxtLink>
          <NuxtLink to="/criar-conta" class="btn-primary !py-2 !px-4 !min-h-0 text-small">Começar grátis</NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="pt-32 pb-16 sm:pt-40 sm:pb-24 px-4 sm:px-6 max-w-4xl mx-auto text-center relative">
      <h1 class="text-3xl sm:text-5xl font-bold text-base-primary leading-tight mb-4">
        Você estuda… e esquece na prova?<br class="hidden sm:block" /> Com o Memorai, isso não acontece.
      </h1>
      <p class="text-base sm:text-lg text-base-muted max-w-2xl mx-auto mb-8">
        Cole seu material, a IA cria flashcards e você revisa no momento exato para não esquecer — sem a complexidade do Anki.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <NuxtLink to="/criar-conta" class="btn-primary !py-3 !px-8 text-base font-semibold">
          Começar grátis
        </NuxtLink>
        <a href="#como-funciona" class="btn-secondary !py-3 !px-8 text-base">
          Ver como funciona
        </a>
      </div>
      <!-- Demo placeholder -->
      <div class="mt-12 rounded-2xl border border-base bg-surface-secondary overflow-hidden shadow-xl">
        <div class="aspect-video flex items-center justify-center text-base-muted">
          <p class="text-small">GIF demo: PDF → cards → revisão (5-8s loop)</p>
        </div>
      </div>
    </section>

    <!-- Prova social -->
    <section class="py-6 px-4 sm:px-6 max-w-3xl mx-auto text-center">
      <p class="text-small text-base-muted">
        Junte-se aos primeiros estudantes que estão parando de esquecer o que estudam.
      </p>
    </section>

    <!-- Dor -->
    <section class="py-12 px-4 sm:px-6 max-w-3xl mx-auto text-center">
      <p class="text-lg sm:text-xl text-base-secondary leading-relaxed">
        Você estuda horas, revisa… e mesmo assim esquece metade.<br class="hidden sm:block" />
        <span class="text-base-primary font-medium">Isso não é falta de esforço. É porque você está usando o método errado.</span>
      </p>
    </section>

    <!-- Como funciona -->
    <section id="como-funciona" class="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-bold text-base-primary text-center mb-12">
        3 passos pra memorizar qualquer coisa
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card text-center py-8 px-6">
          <span class="text-4xl mb-4 block">📄</span>
          <h3 class="text-title text-base-primary mb-2">1. Adicione material</h3>
          <p class="text-small text-base-muted">Cole texto, suba um PDF ou importe do Anki. Sem setup.</p>
        </div>
        <div class="card text-center py-8 px-6">
          <span class="text-4xl mb-4 block">✨</span>
          <h3 class="text-title text-base-primary mb-2">2. IA cria flashcards</h3>
          <p class="text-small text-base-muted">Cards prontos em segundos — com pegadinhas, dicas e pontos de prova.</p>
        </div>
        <div class="card text-center py-8 px-6">
          <span class="text-4xl mb-4 block">🧠</span>
          <h3 class="text-title text-base-primary mb-2">3. Revise no momento certo</h3>
          <p class="text-small text-base-muted">O algoritmo calcula quando revisar pra você parar de esquecer. 5 min/dia bastam.</p>
        </div>
      </div>
    </section>

    <!-- Comparação -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 bg-surface-secondary">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-bold text-base-primary text-center mb-4">
          Por que estudantes estão trocando o Anki pelo Memorai?
        </h2>
        <p class="text-base-muted text-center mb-12">Mesmo poder do Anki. Sem a curva de aprendizado absurda.</p>
        <div class="overflow-x-auto">
          <table class="w-full text-small">
            <thead>
              <tr class="border-b border-base">
                <th class="text-left py-3 px-4 text-base-muted font-medium" />
                <th class="py-3 px-4 text-accent-primary font-semibold">Memorai</th>
                <th class="py-3 px-4 text-base-muted font-medium">Anki</th>
                <th class="py-3 px-4 text-base-muted font-medium">Quizlet</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comparison" :key="row.feature" class="border-b border-base/50">
                <td class="py-3 px-4 text-base-secondary">{{ row.feature }}</td>
                <td class="py-3 px-4 text-center">{{ row.memorai }}</td>
                <td class="py-3 px-4 text-center text-base-muted">{{ row.anki }}</td>
                <td class="py-3 px-4 text-center text-base-muted">{{ row.quizlet }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Planos -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-bold text-base-primary text-center mb-4">
        Comece grátis e pare de esquecer de vez
      </h2>
      <p class="text-base-muted text-center mb-12">Core ilimitado. IA como upgrade natural.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <!-- Free -->
        <div class="card py-8 px-6">
          <h3 class="text-title text-base-primary mb-1">Grátis</h3>
          <p class="text-2xl font-bold text-base-primary mb-4">R$ 0<span class="text-small font-normal text-base-muted">/mês</span></p>
          <ul class="space-y-2 text-small text-base-secondary mb-6">
            <li>✓ Flashcards + FSRS ilimitados</li>
            <li>✓ Notas, cadernos, grafo</li>
            <li>✓ Importar Anki</li>
            <li>✓ 20 cards IA/mês</li>
            <li>✓ 1 podcast/mês</li>
          </ul>
          <NuxtLink to="/criar-conta" class="btn-secondary w-full justify-center">Começar grátis</NuxtLink>
        </div>
        <!-- Pro -->
        <div class="card py-8 px-6 border-accent-primary/30 relative">
          <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-primary text-surface text-micro font-semibold px-3 py-1 rounded-full">🔥 Mais popular</span>
          <h3 class="text-title text-accent-primary mb-1">Pro</h3>
          <p class="text-2xl font-bold text-base-primary mb-1">R$ 14,90<span class="text-small font-normal text-base-muted">/mês</span></p>
          <p class="text-micro text-base-muted mb-4">Menos que um lanche por mês pra nunca mais esquecer</p>
          <ul class="space-y-2 text-small text-base-secondary mb-6">
            <li>✓ Tudo do Grátis</li>
            <li>✓ Cards IA ilimitados</li>
            <li>✓ 10 notas IA do PDF/mês</li>
            <li>✓ Chat IA ilimitado</li>
            <li>✓ 5 podcasts/mês</li>
          </ul>
          <NuxtLink to="/criar-conta" class="btn-primary w-full justify-center">Quero memorizar de verdade</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Podcast -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto">
      <div class="flex flex-col md:flex-row items-center gap-8 md:gap-12">
        <div class="flex-1">
          <span class="text-micro uppercase tracking-wide text-accent-primary font-semibold mb-2 block">Exclusivo</span>
          <h2 class="text-2xl sm:text-3xl font-bold text-base-primary mb-4">
            Ouça seus pontos fracos no ônibus
          </h2>
          <p class="text-base-muted mb-4">
            O Memorai gera um podcast personalizado com os conceitos que você mais erra. Transforme horas mortas no trânsito ou lavando louça em tempo líquido de estudo.
          </p>
          <ul class="space-y-2 text-small text-base-secondary">
            <li>🎧 Baseado nos seus erros reais</li>
            <li>🤖 Gerado por IA em minutos</li>
            <li>📱 Ouça offline, quando quiser</li>
          </ul>
        </div>
        <div class="w-full md:w-64 shrink-0">
          <div class="card py-6 px-5 text-center">
            <span class="text-4xl block mb-3">🎧</span>
            <p class="text-small font-medium text-base-primary mb-1">Podcast de Revisão</p>
            <p class="text-micro text-base-muted">5 min · Seus pontos fracos</p>
            <div class="mt-4 h-2 rounded-full bg-surface-tertiary overflow-hidden">
              <div class="h-2 rounded-full bg-accent-primary w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 bg-surface-secondary">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-bold text-base-primary text-center mb-12">
          Perguntas frequentes
        </h2>
        <div class="space-y-4">
          <details v-for="faq in faqs" :key="faq.q" class="card px-6 py-4 group">
            <summary class="flex items-center justify-between cursor-pointer text-base-primary font-medium list-none">
              {{ faq.q }}
              <span class="text-base-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p class="mt-3 text-small text-base-muted">{{ faq.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA Final -->
    <section class="py-16 px-4 sm:px-6 text-center">
      <h2 class="text-2xl sm:text-3xl font-bold text-base-primary mb-4">
        Pare de estudar do jeito errado.
      </h2>
      <p class="text-base-muted text-lg mb-2">Comece a memorizar de verdade hoje.</p>
      <p class="text-small text-base-muted mb-8">Leva menos de 1 minuto.</p>
      <NuxtLink to="/criar-conta" class="btn-primary !py-3 !px-8 text-base font-semibold">
        Criar conta grátis
      </NuxtLink>
    </section>

    <!-- Footer -->
    <footer class="py-8 px-4 sm:px-6 border-t border-base">
      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-small text-base-muted">
          Memorai — Feito no Brasil 🇧🇷
        </p>
        <div class="flex items-center gap-4 text-small text-base-muted">
          <NuxtLink to="/entrar" class="hover:text-accent-primary">Entrar</NuxtLink>
          <span>·</span>
          <NuxtLink to="/terms" class="hover:text-accent-primary">Termos de Uso</NuxtLink>
          <span>·</span>
          <NuxtLink to="/privacy" class="hover:text-accent-primary">Privacidade</NuxtLink>
          <span>·</span>
          <a href="mailto:contato@memorai.com.br" class="hover:text-accent-primary">Contato</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' })

useHead({
  title: 'Memorai — Pare de esquecer o que você estuda',
  meta: [
    { name: 'description', content: 'Cole seu material, a IA gera flashcards. Revise no momento certo com FSRS e memorize de verdade. 100% em português.' },
    { property: 'og:title', content: 'Memorai — Pare de esquecer o que você estuda' },
    { property: 'og:description', content: 'Flashcards com IA + repetição espaçada. Melhor que Anki, mais inteligente que Quizlet.' },
    { property: 'og:type', content: 'website' },
  ],
})

// Redirect logged-in users
const auth = useAuthStore()
if (auth.isAuthenticated) {
  navigateTo('/hoje')
}

const comparison = [
  { feature: 'Interface moderna', memorai: '✅', anki: '❌', quizlet: '✅' },
  { feature: 'Repetição espaçada (FSRS)', memorai: '✅', anki: '✅', quizlet: '❌' },
  { feature: 'IA gera cards', memorai: '✅', anki: '❌', quizlet: '⚠️' },
  { feature: '100% em português', memorai: '✅', anki: '❌', quizlet: '❌' },
  { feature: 'Notas integradas', memorai: '✅', anki: '❌', quizlet: '❌' },
  { feature: 'Podcast de revisão', memorai: '✅', anki: '❌', quizlet: '❌' },
  { feature: 'Importar Anki', memorai: '✅', anki: '—', quizlet: '❌' },
  { feature: 'Curva de aprendizado', memorai: '✅ Fácil', anki: '❌ Difícil', quizlet: '✅ Fácil' },
  { feature: 'Gratuito (core)', memorai: '✅', anki: '✅', quizlet: '❌' },
]

const faqs = [
  { q: 'Posso importar meus decks do Anki?', a: 'Sim! Basta exportar o arquivo .apkg do Anki e importar no Memorai. Decks, cards, tags e mídia são convertidos automaticamente.' },
  { q: 'A IA não vai inventar informações erradas?', a: 'A IA gera cards a partir do SEU material (notas, PDFs). Ela extrai e organiza — não inventa conteúdo. Você sempre revisa antes de aceitar.' },
  { q: 'Se eu cancelar o Pro, perco meus cards?', a: 'Não. O core é grátis para sempre. Seus cards, notas, decks e revisões continuam funcionando normalmente. Você só perde acesso à IA ilimitada.' },
  { q: 'Funciona no celular?', a: 'Sim. O Memorai é um PWA — funciona como app no celular, sem precisar baixar nada. Basta acessar pelo navegador e adicionar à tela inicial.' },
  { q: 'Quanto tempo preciso por dia?', a: '5 a 15 minutos. O algoritmo FSRS calcula o momento ideal de cada revisão, então você estuda menos e lembra mais.' },
]
</script>
