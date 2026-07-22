<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <h1 class="font-heading font-bold text-3xl text-base-primary mb-2">Ajuda</h1>
    <p class="text-base-muted mb-8">Atalhos, dicas e informações úteis para aproveitar o Baigi ao máximo.</p>

    <!-- Atalhos de teclado -->
    <section class="mb-10">
      <h2 class="font-heading font-semibold text-xl text-base-primary mb-4 flex items-center gap-2">
        <Keyboard :size="20" class="text-[var(--color-accent-soft)]" />
        Atalhos de teclado
      </h2>
      <div class="card-base overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--border-divider)]">
              <th class="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wide">Atalho</th>
              <th class="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wide">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shortcut in shortcuts" :key="shortcut.keys" class="border-b border-[var(--border-divider)] last:border-0">
              <td class="px-5 py-3">
                <span class="inline-flex items-center gap-1">
                  <kbd
                    v-for="key in shortcut.keys.split('+')"
                    :key="key"
                    class="px-2 py-0.5 text-xs font-medium bg-[var(--bg-soft)] text-[var(--text-heading)] rounded-md border border-[var(--border-base)]"
                  >{{ key.trim() }}</kbd>
                </span>
              </td>
              <td class="px-5 py-3 text-[var(--text-body)]">{{ shortcut.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Dicas rápidas -->
    <section class="mb-10">
      <h2 class="font-heading font-semibold text-xl text-base-primary mb-4 flex items-center gap-2">
        <Lightbulb :size="20" class="text-[var(--color-accent-soft)]" />
        Dicas rápidas
      </h2>
      <div class="grid gap-3">
        <div v-for="tip in tips" :key="tip.title" class="card-base p-4 flex gap-3">
          <span class="text-xl shrink-0">{{ tip.emoji }}</span>
          <div>
            <p class="font-medium text-[var(--text-heading)] text-sm">{{ tip.title }}</p>
            <p class="text-[var(--text-muted)] text-sm mt-0.5">{{ tip.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Editor -->
    <section class="mb-10">
      <h2 class="font-heading font-semibold text-xl text-base-primary mb-4 flex items-center gap-2">
        <PenTool :size="20" class="text-[var(--color-accent-soft)]" />
        Editor de notas
      </h2>
      <div class="card-base overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--border-divider)]">
              <th class="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wide">Comando</th>
              <th class="text-left px-5 py-3 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wide">O que faz</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cmd in editorCommands" :key="cmd.command" class="border-b border-[var(--border-divider)] last:border-0">
              <td class="px-5 py-3">
                <code class="px-2 py-0.5 text-xs bg-[var(--bg-soft)] text-[var(--color-accent-soft)] rounded">{{ cmd.command }}</code>
              </td>
              <td class="px-5 py-3 text-[var(--text-body)]">{{ cmd.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Suporte -->
    <section>
      <h2 class="font-heading font-semibold text-xl text-base-primary mb-4 flex items-center gap-2">
        <MessageCircle :size="20" class="text-[var(--color-accent-soft)]" />
        Suporte
      </h2>
      <div class="card-base p-5">
        <p class="text-[var(--text-body)] text-sm">
          Tem dúvidas ou sugestões? Fale com a gente:
        </p>
        <div class="mt-3 flex flex-wrap gap-3">
          <a href="mailto:contato@memorai.ia.br" class="btn-secondary !py-2 !px-4 !text-sm inline-flex items-center gap-2">
            <Mail :size="16" />
            contato@memorai.ia.br
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Keyboard, Lightbulb, PenTool, MessageCircle, Mail } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const isMac = import.meta.client
  ? (navigator.platform?.includes('Mac') || navigator.userAgent?.includes('Mac'))
  : false

const mod = isMac ? '⌘' : 'Ctrl'

const shortcuts = [
  { keys: `${mod} + K`, description: 'Abrir busca rápida (Command Palette)' },
  { keys: 'Alt + R', description: 'Ir para revisão' },
  { keys: 'Alt + N', description: 'Criar nova nota' },
  { keys: `${mod} + Shift + C`, description: 'Criar cloze (lacuna) no editor' },
  { keys: 'Esc', description: 'Fechar modal ou painel aberto' },
]

const tips = [
  {
    emoji: '🔍',
    title: 'Busca rápida com Ctrl+K',
    description: 'Acesse qualquer página, caderno ou ação em segundos. Funciona de qualquer lugar do app.',
  },
  {
    emoji: '✂️',
    title: 'Selecione texto → crie card',
    description: 'No editor de notas, selecione um trecho e use o bubble menu para transformar em flashcard.',
  },
  {
    emoji: '/',
    title: 'Comandos com barra',
    description: 'No editor, digite / para inserir blocos: títulos, listas, callouts, imagens, cloze e mais.',
  },
  {
    emoji: '🎧',
    title: 'Podcast dos pontos fracos',
    description: 'O Baigi gera podcasts focados nos cards que você mais erra. Ouça no ônibus, na academia.',
  },
  {
    emoji: '📊',
    title: 'Grafo de conhecimento',
    description: 'Veja como seus cadernos se conectam. Nós vermelhos = pontos fracos. Use pra priorizar estudo.',
  },
]

const editorCommands = [
  { command: '/h1, /h2, /h3', description: 'Títulos de diferentes níveis' },
  { command: '/lista', description: 'Lista com bullets' },
  { command: '/numerada', description: 'Lista numerada' },
  { command: '/citacao', description: 'Bloco de citação' },
  { command: '/divisor', description: 'Linha divisória' },
  { command: '/imagem', description: 'Upload de imagem' },
  { command: '/erro', description: 'Callout de erro (vermelho)' },
  { command: '/insight', description: 'Callout de insight (azul)' },
  { command: '/pegadinha', description: 'Callout de pegadinha (amarelo)' },
  { command: '/cloze', description: 'Marcar texto como lacuna' },
]
</script>
