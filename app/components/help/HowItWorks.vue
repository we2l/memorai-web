<template>
  <div class="space-y-10">
    <!-- Diagrama do fluxo -->
    <section>
      <h2 class="font-heading font-semibold text-xl text-base-primary mb-4">Como as peças se conectam</h2>
      <div class="card-base p-6 sm:p-8">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
          <!-- Coluna 1: Inputs -->
          <div class="space-y-3">
            <p class="text-micro font-bold uppercase tracking-wide text-base-muted">Você cria</p>
            <div class="space-y-2">
              <div class="flow-node bg-[var(--badge-info-bg)] border-[var(--badge-info-text)]/20"><BookOpen :size="14" class="inline text-[var(--badge-info-text)]" /> Notas</div>
              <div class="flow-node bg-[var(--badge-warning-bg)] border-[var(--badge-warning-text)]/20"><CalendarCheck :size="14" class="inline text-[var(--badge-warning-text)]" /> Provas</div>
              <div class="flow-node bg-[var(--badge-success-bg)] border-[var(--badge-success-text)]/20"><Layers :size="14" class="inline text-[var(--badge-success-text)]" /> Cards</div>
            </div>
          </div>

          <!-- Coluna 2: Sistema -->
          <div class="space-y-3 flex flex-col items-center justify-center">
            <p class="text-micro font-bold uppercase tracking-wide text-base-muted">O sistema processa</p>
            <div class="flow-node bg-[var(--badge-primary-bg)] dark:bg-[var(--color-accent-primary)]/10 border-base dark:border-[var(--color-accent-primary)]/30 !py-4">
              <Brain :size="24" class="text-[var(--color-accent-primary)]" />
              <span class="block text-small font-semibold text-[var(--color-accent-primary)]">IA + revisão espaçada</span>
              <span class="block text-micro text-base-muted">prioriza, gera, conecta</span>
            </div>
            <!-- Arrows (mobile: vertical, desktop: implied by grid) -->
            <div class="hidden sm:flex items-center gap-1 text-base-muted">
              <span>←</span> processa <span>→</span>
            </div>
          </div>

          <!-- Coluna 3: Outputs -->
          <div class="space-y-3">
            <p class="text-micro font-bold uppercase tracking-wide text-base-muted">Você recebe</p>
            <div class="space-y-2">
              <div class="flow-node bg-[var(--badge-success-bg)] border-[var(--badge-success-text)]/20"><RefreshCw :size="14" class="inline text-[var(--badge-success-text)]" /> Revisão inteligente</div>
              <div class="flow-node bg-[var(--badge-primary-bg)] dark:bg-[var(--color-accent-primary)]/10 border-base dark:border-[var(--color-accent-primary)]/30"><Headphones :size="14" class="inline text-[var(--color-accent-primary)]" /> Podcast personalizado</div>
              <div class="flow-node bg-[var(--badge-info-bg)] border-[var(--badge-info-text)]/20"><BarChart3 :size="14" class="inline text-[var(--badge-info-text)]" /> Simulados focados</div>
            </div>
          </div>
        </div>

        <!-- Fluxo de erros -->
        <div class="mt-6 pt-6 border-t border-base text-center">
          <p class="text-small text-base-muted">
            <span class="text-[var(--badge-danger-text)] font-medium">Erros na revisão</span> → alimentam o podcast + detectam padrões → <span class="text-[var(--badge-success-text)] font-medium">melhoria contínua</span>
          </p>
        </div>
      </div>
    </section>

    <!-- Cards explicativos -->
    <section>
      <h2 class="font-heading font-semibold text-xl text-base-primary mb-4">O que cada feature faz por você</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="item in features" :key="item.title" class="card-base p-5">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-accent-primary-subtle flex items-center justify-center shrink-0">
              <component :is="item.icon" :size="20" class="text-[var(--badge-primary-text)]" />
            </div>
            <div>
              <h3 class="font-medium text-base-primary text-sm">{{ item.title }}</h3>
              <p class="text-micro text-base-muted mt-1">{{ item.description }}</p>
              <p class="text-micro text-[var(--color-accent-primary)] font-medium mt-2">↳ {{ item.impact }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Resumo: o loop -->
    <section>
      <h2 class="font-heading font-semibold text-xl text-base-primary mb-4">O loop de aprendizado</h2>
      <div class="card-base p-6">
        <ol class="space-y-3">
          <li v-for="(step, i) in loop" :key="i" class="flex items-start gap-3">
            <span class="w-6 h-6 rounded-full bg-accent-primary-subtle flex items-center justify-center shrink-0 text-micro font-bold text-[var(--color-accent-primary)]">{{ i + 1 }}</span>
            <p class="text-small text-base-primary">{{ step }}</p>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, Brain, CalendarCheck, Layers, RefreshCw, Headphones, BarChart3, XCircle, Zap } from 'lucide-vue-next'
const features = [
  {
    icon: CalendarCheck,
    title: 'Agenda de Provas',
    description: 'Cadastre suas provas com os cadernos vinculados.',
    impact: 'O algoritmo prioriza esses cards automaticamente. 3 dias antes → Reta Final (+20 cards extras).',
  },
  {
    icon: RefreshCw,
    title: 'Revisão espaçada',
    description: 'O algoritmo calcula o momento ideal pra revisar cada card.',
    impact: 'Ordem: cards em aprendizado → prova próxima → mais atrasados → normais. Nunca mais do que você aguenta.',
  },
  {
    icon: XCircle,
    title: 'Registro de Erros',
    description: 'Quando erra, registre o motivo (confundi, esqueci, não sabia).',
    impact: 'Padrões são detectados. O podcast aborda seus erros. Tópicos fracos conectados são sugeridos.',
  },
  {
    icon: BookOpen,
    title: 'Notas',
    description: 'Suas notas são indexadas semanticamente pela IA.',
    impact: 'Servem como contexto pra gerar cards, quiz e podcast mais precisos. Aparecem quando erra card vinculado.',
  },
  {
    icon: Headphones,
    title: 'Podcast',
    description: 'Áudio gerado dos seus pontos fracos para revisão passiva.',
    impact: 'Seleção: cards com mais erros + prova próxima. Modo pré-prova foca nos tópicos da prova.',
  },
  {
    icon: BarChart3,
    title: 'Simulados',
    description: 'Questões geradas pela IA a partir das suas notas.',
    impact: 'Conteúdo diversificado via busca semântica. Erros do quiz podem virar cards com 1 clique.',
  },
  {
    icon: Brain,
    title: 'Mapa Mental',
    description: 'Visualize a hierarquia dos conceitos do seu caderno.',
    impact: 'Nível 1 automático (grátis). Nível 2 com IA extrai conceitos — cada nó vira card.',
  },
  {
    icon: Zap,
    title: 'Anti-Backlog',
    description: 'Limites diários, modo sobrevivência e sugestão de retenção.',
    impact: 'Nunca acumula 500 cards. Se sobrecarregar, o sistema sugere reduzir retenção ou focar no essencial.',
  },
]

const loop = [
  'Você cria notas e organiza em cadernos.',
  'A IA indexa tudo e gera cards, quiz e podcast.',
  'Você revisa — a revisão espaçada agenda o próximo momento ideal.',
  'Errou? O motivo é registrado e vira combustível: podcast aborda, padrões são detectados.',
  'Tem prova? O algoritmo prioriza os cadernos vinculados automaticamente.',
  'O ciclo se repete — cada erro te faz mais forte.',
]
</script>

<style scoped>
.flow-node {
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  border-width: 1px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
