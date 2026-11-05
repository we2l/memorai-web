<template>
  <div class="flex flex-col gap-section">
    <UiSection title="Como as peças se conectam">
      <div class="grid gap-6 sm:grid-cols-3">
        <div v-for="column in flow" :key="column.label">
          <p class="mb-2 text-label font-semibold text-fg-muted">{{ column.label }}</p>
          <ul class="flex flex-col gap-2">
            <li v-for="node in column.nodes" :key="node.label" class="flex items-center gap-2 rounded-control bg-subtle px-3 py-2 text-meta font-semibold text-fg-strong">
              <component :is="node.icon" class="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
              {{ node.label }}
            </li>
          </ul>
        </div>
      </div>
      <p class="mt-5 border-t border-line pt-4 text-meta text-fg-muted">Os erros da revisão alimentam o podcast e mostram padrões: você melhora a cada ciclo.</p>
    </UiSection>

    <UiSection title="O que cada recurso faz por você">
      <ul class="grid gap-5 md:grid-cols-2">
        <li v-for="item in features" :key="item.title" class="flex items-start gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-control bg-subtle" aria-hidden="true">
            <component :is="item.icon" class="size-5 text-fg-muted" />
          </span>
          <div>
            <h3 class="text-body font-semibold text-fg-strong">{{ item.title }}</h3>
            <p class="mt-0.5 text-meta text-fg">{{ item.description }}</p>
            <p class="mt-1 text-meta text-fg-muted">{{ item.impact }}</p>
          </div>
        </li>
      </ul>
    </UiSection>

    <UiSection title="O ciclo de aprendizado">
      <ol class="flex flex-col gap-3">
        <li v-for="(step, i) in loop" :key="i" class="flex items-start gap-3">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-label font-semibold text-fg-strong tabular-nums" aria-hidden="true">{{ i + 1 }}</span>
          <p class="text-body text-fg">{{ step }}</p>
        </li>
      </ol>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, Brain, CalendarCheck, Layers, RefreshCw, Headphones, BarChart3, XCircle, Zap } from 'lucide-vue-next'

const flow = [
  { label: 'Você cria', nodes: [{ icon: BookOpen, label: 'Notas' }, { icon: CalendarCheck, label: 'Provas' }, { icon: Layers, label: 'Cards' }] },
  { label: 'O sistema processa', nodes: [{ icon: Brain, label: 'IA e revisão espaçada' }, { icon: Zap, label: 'Prioriza, gera e conecta' }] },
  { label: 'Você recebe', nodes: [{ icon: RefreshCw, label: 'Revisão inteligente' }, { icon: Headphones, label: 'Podcast personalizado' }, { icon: BarChart3, label: 'Simulados focados' }] },
]

const features = [
  {
    icon: CalendarCheck,
    title: 'Agenda de Provas',
    description: 'Cadastre suas provas com os cadernos vinculados.',
    impact: 'O algoritmo prioriza esses cards automaticamente. Nos últimos 3 dias, a Reta final traz até 20 cards extras.',
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
    title: 'Anti-acúmulo',
    description: 'Limites diários, modo recuperação e sugestão de retenção.',
    impact: 'Se os cards começarem a acumular, o sistema sugere reduzir a retenção ou focar no essencial.',
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

