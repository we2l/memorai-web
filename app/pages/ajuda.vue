<template>
  <NuxtLayout :name="auth.user ? 'default' : 'landing'">
    <UiPublicHeader v-if="!auth.user" />
    <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
      <h1 class="font-bold text-page-title text-fg-strong mb-2">Ajuda</h1>
      <p class="text-fg-muted mb-6">Entenda como o Baigi funciona e aproveite ao máximo.</p>

      <!-- Tabs -->
      <div class="flex gap-1 p-1 rounded-xl bg-subtle mb-8">
        <button
          class="flex-1 px-4 py-2 rounded-control text-meta font-medium transition-colors"
          :class="activeTab === 'how' ? 'bg-[var(--bg-card)] text-fg-strong shadow-sm' : 'text-fg-muted hover:text-fg-strong'"
          @click="activeTab = 'how'"
        >
          Como funciona
        </button>
        <button
          class="flex-1 px-4 py-2 rounded-control text-meta font-medium transition-colors"
          :class="activeTab === 'shortcuts' ? 'bg-[var(--bg-card)] text-fg-strong shadow-sm' : 'text-fg-muted hover:text-fg-strong'"
          @click="activeTab = 'shortcuts'"
        >
          Atalhos & Comandos
        </button>
      </div>

      <!-- Tab: Como funciona -->
      <HelpHowItWorks v-if="activeTab === 'how'" />

      <!-- Tab: Atalhos & Comandos -->
      <div v-if="activeTab === 'shortcuts'" class="space-y-10">
        <!-- Atalhos de teclado -->
        <section>
          <h2 class="font-semibold text-section text-fg-strong mb-4 flex items-center gap-2">
            <Keyboard :size="20" class="text-action-fg" />
            Atalhos de teclado
          </h2>
          <div class="card-base overflow-hidden">
            <table class="w-full text-meta">
              <thead>
                <tr class="border-b border-line">
                  <th class="text-left px-5 py-3 text-fg-muted font-medium text-label uppercase tracking-wide">Atalho</th>
                  <th class="text-left px-5 py-3 text-fg-muted font-medium text-label uppercase tracking-wide">Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="shortcut in shortcuts" :key="shortcut.keys" class="border-b border-line last:border-0">
                  <td class="px-5 py-3">
                    <span class="inline-flex items-center gap-1">
                      <kbd
                        v-for="key in shortcut.keys.split('+')"
                        :key="key"
                        class="px-2 py-0.5 text-label font-medium bg-subtle text-fg-strong rounded-control border border-[var(--border-base)]"
                      >{{ key.trim() }}</kbd>
                    </span>
                  </td>
                  <td class="px-5 py-3 text-fg">{{ shortcut.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Dicas rápidas -->
        <section>
          <h2 class="font-semibold text-section text-fg-strong mb-4 flex items-center gap-2">
            <Lightbulb :size="20" class="text-action-fg" />
            Dicas rápidas
          </h2>
          <div class="grid gap-3">
            <div v-for="tip in tips" :key="tip.title" class="card-base p-4 flex gap-3">
              <component :is="tip.icon" :size="20" class="text-action-fg shrink-0 mt-0.5" />
              <div>
                <p class="font-medium text-fg-strong text-meta">{{ tip.title }}</p>
                <p class="text-fg-muted text-meta mt-0.5">{{ tip.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Editor -->
        <section>
          <h2 class="font-semibold text-section text-fg-strong mb-4 flex items-center gap-2">
            <PenTool :size="20" class="text-action-fg" />
            Editor de notas
          </h2>
          <div class="card-base overflow-hidden">
            <table class="w-full text-meta">
              <thead>
                <tr class="border-b border-line">
                  <th class="text-left px-5 py-3 text-fg-muted font-medium text-label uppercase tracking-wide">Comando</th>
                  <th class="text-left px-5 py-3 text-fg-muted font-medium text-label uppercase tracking-wide">O que faz</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cmd in editorCommands" :key="cmd.command" class="border-b border-line last:border-0">
                  <td class="px-5 py-3">
                    <code class="px-2 py-0.5 text-label bg-subtle text-action-fg rounded">{{ cmd.command }}</code>
                  </td>
                  <td class="px-5 py-3 text-fg">{{ cmd.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Suporte -->
        <section>
          <h2 class="font-semibold text-section text-fg-strong mb-4 flex items-center gap-2">
            <MessageCircle :size="20" class="text-action-fg" />
            Suporte
          </h2>
          <div class="card-base p-5">
            <p class="text-fg text-meta">
              Tem dúvidas ou sugestões? Fale com a gente:
            </p>
            <div class="mt-3 flex flex-wrap gap-3">
              <UiButton variant="secondary" href="mailto:contato@baigi.com.br" class="!py-2 !px-4 !text-meta inline-flex items-center gap-2">
                <Mail :size="16" />
                contato@baigi.com.br
              </UiButton>
            </div>
          </div>
        </section>
      </div>
    </div>
    <UiPublicFooter />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { Keyboard, Lightbulb, PenTool, MessageCircle, Mail, Search as SearchIcon, Scissors, Headphones, BarChart3 } from 'lucide-vue-next'

// Public page: app layout when logged in, landing when anonymous (RF-F11.2)
definePageMeta({ layout: false })

const auth = useAuthStore()

// /ajuda?tab=atalhos: "Ajuda e atalhos" of the account menu, the search and the "?" shortcut
const route = useRoute()
const activeTab = ref<'how' | 'shortcuts'>('how')
// After mount: the page is prerendered without the query (no hydration mismatch)
onMounted(() => { if (route.query.tab === 'atalhos') activeTab.value = 'shortcuts' })
watch(() => route.query.tab, (tab) => { if (tab === 'atalhos') activeTab.value = 'shortcuts' })

const isMac = import.meta.client
  ? (navigator.platform?.includes('Mac') || navigator.userAgent?.includes('Mac'))
  : false

const mod = isMac ? '⌘' : 'Ctrl'

const shortcuts = [
  { keys: `${mod} + K`, description: 'Buscar cadernos, materiais e cards, ou perguntar ao tira-dúvidas' },
  { keys: 'Alt + R', description: 'Revisar hoje' },
  { keys: 'Alt + N', description: 'Nota em branco (no caderno aberto ou no último usado)' },
  { keys: '?', description: 'Abrir estes atalhos (na revisão, os atalhos da revisão)' },
  { keys: `${mod} + Shift + C`, description: 'Criar cloze (lacuna) no editor' },
  { keys: 'Esc', description: 'Fechar modal ou painel aberto' },
]

const tips = [
  { icon: SearchIcon, title: 'Busca com Ctrl+K', description: 'Ache um caderno, um material ou um card de qualquer tela, ou pergunte ao tira-dúvidas.' },
  { icon: Scissors, title: 'Selecione texto → crie card', description: 'No editor de notas, selecione um trecho e use o bubble menu para transformar em flashcard.' },
  { icon: PenTool, title: 'Comandos com barra', description: 'No editor, digite / para inserir blocos: títulos, listas, callouts, imagens, cloze e mais.' },
  { icon: Headphones, title: 'Podcast dos pontos fracos', description: 'O Baigi gera podcasts focados nos cards que você mais erra. Ouça no ônibus, na academia.' },
  { icon: BarChart3, title: 'Praticar: revisar, questões e ouvir', description: 'Três jeitos de treinar o mesmo conteúdo, num lugar só. Escolha o que cabe no seu momento.' },
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
