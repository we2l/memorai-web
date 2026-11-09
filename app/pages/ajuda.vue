<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-section px-gutter pt-8 lg:pt-12">
    <UiPageHeader title="Ajuda" meta="Entenda como o Baigi funciona e aproveite ao máximo." />

    <UiTabs v-model="activeTab" :tabs="TABS" label="Seções da ajuda">
      <!-- Tab: Como funciona -->
      <HelpHowItWorks v-if="activeTab === 'how'" />

      <!-- Tab: Atalhos e comandos -->
      <div v-else class="flex flex-col gap-section">
        <UiSection title="Atalhos de teclado" flush class="px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
          <table class="w-full text-left text-meta">
            <thead>
              <tr class="border-b border-line text-label text-fg-muted">
                <th scope="col" class="py-3 pr-3 font-medium">Atalho</th>
                <th scope="col" class="py-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="shortcut in shortcuts" :key="shortcut.keys">
                <td class="py-3 pr-3">
                  <span class="inline-flex items-center gap-1">
                    <kbd
                      v-for="key in shortcut.keys.split('+')"
                      :key="key"
                      class="rounded-tag border border-line-strong bg-soft px-2 py-0.5 text-label text-fg-strong"
                    >{{ key.trim() }}</kbd>
                  </span>
                </td>
                <td class="py-3 text-fg">{{ shortcut.description }}</td>
              </tr>
            </tbody>
          </table>
        </UiSection>

        <UiSection title="Dicas rápidas">
          <ul class="flex flex-col gap-4">
            <li v-for="tip in tips" :key="tip.title" class="flex gap-3">
              <component :is="tip.icon" class="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden="true" />
              <div>
                <p class="text-body font-semibold text-fg-strong">{{ tip.title }}</p>
                <p class="mt-0.5 text-meta text-fg-muted">{{ tip.description }}</p>
              </div>
            </li>
          </ul>
        </UiSection>

        <UiSection title="Editor de notas" flush class="px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
          <table class="w-full text-left text-meta">
            <thead>
              <tr class="border-b border-line text-label text-fg-muted">
                <th scope="col" class="py-3 pr-3 font-medium">Comando</th>
                <th scope="col" class="py-3 font-medium">O que faz</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="cmd in editorCommands" :key="cmd.command">
                <td class="py-3 pr-3"><code class="rounded-tag bg-soft px-2 py-0.5 text-label text-fg-strong">{{ cmd.command }}</code></td>
                <td class="py-3 text-fg">{{ cmd.description }}</td>
              </tr>
            </tbody>
          </table>
        </UiSection>

        <UiSection title="Suporte" description="Tem dúvidas ou sugestões? Fale com a gente:">
          <UiButton href="mailto:contato@baigi.com.br" :icon-left="Mail">contato@baigi.com.br</UiButton>
        </UiSection>
      </div>
    </UiTabs>
  </div>
</template>

<script setup lang="ts">
import { PenTool, Mail, Search as SearchIcon, Scissors, Headphones, BarChart3 } from 'lucide-vue-next'

// One public layout, signed in or not (prd-4h-landing-v3 RF-F14): swapping it by login was the hydration mismatch
definePageMeta({ layout: 'public' })

useHead({ title: 'Ajuda · Baigi' })

// /ajuda?tab=atalhos: "Ajuda e atalhos" of the account menu, the search and the "?" shortcut
const route = useRoute()
const TABS = [{ key: 'how', label: 'Como funciona' }, { key: 'shortcuts', label: 'Atalhos e comandos' }]
const activeTab = ref('how')
// After mount: the page is prerendered without the query (no hydration mismatch)
onMounted(() => { if (route.query.tab === 'atalhos') activeTab.value = 'shortcuts' })
watch(() => route.query.tab, (tab) => { activeTab.value = tab === 'atalhos' ? 'shortcuts' : 'how' })
// The tab goes in the address: a link or a reload keeps it
watch(activeTab, (tab) => {
  const query = tab === 'shortcuts' ? { tab: 'atalhos' } : {}
  if (route.query.tab !== query.tab) void navigateTo({ query }, { replace: true })
})

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
  { icon: SearchIcon, title: 'Busca com Ctrl\u00A0K', description: 'Ache um caderno, um material ou um card de qualquer tela, ou pergunte ao tira-dúvidas.' },
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
