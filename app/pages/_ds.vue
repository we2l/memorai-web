<template>
  <div class="min-h-screen bg-page text-fg" data-ds-page>
    <header class="border-b border-line bg-raised px-4 py-3 sm:px-6">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-section text-fg-strong">Design system v3</h1>
          <p class="text-meta text-fg-muted">Referência interna dos componentes-base (ADR-027). Só em dev ou com NUXT_DS_PAGE=1.</p>
        </div>
        <UiTabs v-model="mode" :tabs="MODES" label="Tema da página" />
      </div>
    </header>

    <div :class="mode === 'lado' && 'lg:grid lg:grid-cols-2'">
      <!-- Lado a lado: <html> claro e o painel direito com .dark. É a única subárvore .dark do app e só
           funciona porque os componentes v3 leem os tokens crus (@theme inline resolve no elemento); um
           nome v2 (ponteiro resolvido no <html>) apareceria claro aqui, e isso também é uma conferência. -->
      <main
        v-for="pane in panes"
        :key="pane.key"
        class="min-w-0 bg-page px-4 py-8 text-fg sm:px-6"
        :class="pane.dark && 'dark'"
        :aria-label="pane.label"
      >
        <div class="mx-auto flex max-w-5xl flex-col gap-8">
          <p class="text-label font-semibold text-fg-muted">{{ pane.label }}</p>

          <!-- Ações -->
          <UiSection title="Ações" description="Um primário por tela, roxo com volume; os outros neutros. iconTone colore só o ícone." data-ds-scope>
            <div class="flex flex-col gap-6">
              <div class="flex flex-wrap items-center gap-3">
                <UiButton data-ds-scope variant="primary">Revisar agora</UiButton>
                <UiButton :icon-left="CircleHelp" icon-tone="quiz">20 questões</UiButton>
                <UiButton :icon-left="Headphones" icon-tone="listen">Ouvir · 12 min</UiButton>
                <UiButton variant="ghost">Cancelar</UiButton>
                <UiButton variant="danger" :icon-left="Trash2">Excluir caderno</UiButton>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <UiButton data-ds-scope variant="primary" size="sm">Gerar cards</UiButton>
                <UiButton size="sm" :icon-left="Plus">Caderno</UiButton>
                <UiButton variant="ghost" size="sm">Pular</UiButton>
                <UiButton variant="danger" size="sm">Remover</UiButton>
                <UiButton to="/_ds" size="sm" :icon-right="ArrowRight">Como link</UiButton>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <UiButton data-ds-scope variant="primary" loading>Salvando</UiButton>
                <UiButton data-ds-scope variant="primary" disabled>Indisponível</UiButton>
                <UiButton disabled>Secundário desabilitado</UiButton>
                <UiButton loading>Carregando</UiButton>
              </div>
              <UiButton variant="secondary" block>Bloco (largura toda)</UiButton>
              <div class="flex flex-wrap items-center gap-2">
                <UiIconButton :icon="X" label="Fechar" />
                <UiIconButton :icon="Ellipsis" label="Mais ações" variant="subtle" />
                <UiIconButton :icon="Pencil" label="Editar" size="sm" />
                <UiIconButton :icon="Star" label="Favorito" :pressed="favorite" @click="favorite = !favorite" />
                <UiIconButton :icon="RotateCw" label="Atualizando" loading />
                <UiIconButton :icon="Trash2" label="Excluir" disabled />
              </div>
              <p class="text-body">
                Texto com <UiLink to="/_ds">link de ação</UiLink>, um <UiLink to="/_ds" variant="muted">link discreto</UiLink>
                e um <UiLink href="https://baigi.com.br" external>link externo</UiLink>.
              </p>
              <UiLink to="/_ds" standalone>Ver projeção</UiLink>
              <UiTabs v-model="tab" :tabs="TABS" label="Exemplo de abas">
                <template #default="{ active }">
                  <p class="text-meta text-fg-muted">Painel da aba “{{ TABS.find(t => t.key === active)?.label }}”.</p>
                </template>
              </UiTabs>
            </div>
          </UiSection>

          <!-- Estrutura -->
          <div class="flex flex-col gap-4" data-ds-scope>
            <UiSection variant="plain">
              <UiPageHeader title="TRF 4ª Região — Analista" meta="Prova em 45 dias · 60 cards e 20 questões por dia" :back="{ to: '/_ds', label: 'Cadernos' }">
                <template #leading><UiSubjectMark color="purple" size="lg" /></template>
                <template #actions>
                  <UiButton data-ds-scope variant="primary">Revisar hoje · 45</UiButton>
                  <UiButton :icon-left="CircleHelp" icon-tone="quiz">20 questões</UiButton>
                </template>
              </UiPageHeader>
            </UiSection>

            <UiSection label="Próximo passo" title="Continuar a apostila de Direito Constitucional" description="Você parou na p. 72 ontem" variant="tinted">
              <template #action><UiButton>Continuar leitura</UiButton></template>
            </UiSection>

            <UiSection title="Tópicos">
              <template #action><UiLink to="/_ds" standalone>+ Tópico</UiLink></template>
              <div class="-mx-2 divide-y divide-line">
                <UiListRow v-for="(s, i) in SUBJECTS" :key="s.name" :title="s.name" :meta="s.meta" to="/_ds" :active="i === 1">
                  <template #leading><UiSubjectMark :color="s.color" /></template>
                  <template #trailing>
                    <span class="hidden tabular-nums sm:inline">{{ s.today }} hoje</span>
                    <UiProgressBar :value="s.mastery" :label="`Domínio de ${s.name}`" class="w-24" />
                  </template>
                </UiListRow>
                <UiListRow title="Linha como botão" meta="as=&quot;button&quot;" as="button">
                  <template #leading><UiPracticeIcon mode="review" size="sm" /></template>
                </UiListRow>
                <UiListRow title="Linha estática" meta="sem link">
                  <template #trailing><UiTag tone="warning">ponto fraco</UiTag></template>
                </UiListRow>
              </div>
            </UiSection>

            <UiSection title="Números" description="O número fica em fg-strong; tom só em conquista, com texto ao lado.">
              <div class="flex flex-wrap items-end gap-8">
                <UiStat value="41%" label="de domínio · 902 de 2.200 em dia">
                  <UiProgressBar :value="41" label="Domínio geral" class="mt-2 w-40" />
                </UiStat>
                <UiStat value="63%" label="de acerto em 120 questões" hint="meta 70%" />
                <UiStat value="6" unit="dias" label="seguidos" tone="streak" />
                <UiStat value="3" unit="de 3" label="lotes de hoje" tone="celebrate" />
                <UiStat value="45" label="para hoje · ~18 min" size="lg" />
              </div>
            </UiSection>

            <UiSection title="Barras, selos e marcas">
              <div class="grid gap-6 md:grid-cols-2">
                <div class="flex flex-col gap-3">
                  <UiProgressBar :value="62" label="Domínio (action, sm)" show-value />
                  <UiProgressBar :value="74" label="Acerto em questões (neutral)" tone="neutral" show-value />
                  <UiProgressBar :value="80" label="Meta da semana (celebrate, md)" tone="celebrate" size="md" show-value />
                  <UiProgressBar :value="1" :max="3" :segments="3" label="Meta de hoje" size="md" show-value class="w-56" />
                </div>
                <div class="flex flex-col gap-4">
                  <div class="flex flex-wrap gap-2">
                    <UiTag v-for="t in TAG_TONES" :key="t" :tone="t">{{ t }}</UiTag>
                  </div>
                  <div class="flex flex-wrap items-center gap-3">
                    <UiSubjectMark v-for="i in 8" :key="i" :index="i - 1" size="lg" :label="`Tópico ${i}`" />
                    <UiSubjectMark :index="0" size="md" />
                    <UiSubjectMark :index="0" />
                  </div>
                  <div class="flex flex-wrap items-center gap-3">
                    <UiPracticeIcon v-for="m in PRACTICE" :key="m" :mode="m" size="lg" />
                    <UiPracticeIcon v-for="m in PRACTICE" :key="`${m}-md`" :mode="m" />
                    <UiPracticeIcon v-for="m in PRACTICE" :key="`${m}-sm`" :mode="m" size="sm" />
                  </div>
                </div>
              </div>
            </UiSection>
          </div>

          <!-- Formulários -->
          <UiSection title="Formulários" description="Rótulo ligado ao campo, dica e erro em aria-describedby, borda line-input (≥ 3:1)." data-ds-scope>
            <div class="grid gap-6 md:grid-cols-2">
              <UiInput v-model="form.name" label="Nome do caderno" hint="Aparece no topo e na busca." placeholder="Ex.: TRF 4ª Região" />
              <UiInput v-model="form.search" label="Buscar" hide-label placeholder="Buscar nos cadernos">
                <template #prefix><Search class="size-4" aria-hidden="true" /></template>
                <template #suffix><kbd class="text-label">Ctrl K</kbd></template>
              </UiInput>
              <UiInput v-model="form.email" label="E-mail" type="email" error="Informe um e-mail válido." />
              <UiInput model-value="Somente leitura" label="Desabilitado" disabled />
              <UiTextarea v-model="form.note" label="Anotação" optional placeholder="Escreva aqui" :rows="3" />
              <div class="flex flex-col gap-4">
                <UiSelect v-model="form.hour" label="Horário do lembrete" :options="HOURS" placeholder="Escolha um horário" />
                <UiSelect v-model="form.voice" label="Voz" :options="HOURS" disabled />
              </div>
              <div>
                <UiCheckbox v-model="form.terms" label="Aceito os termos de uso" />
                <UiCheckbox v-model="form.weak" label="Só o que errei" description="Inclui os erros das questões de ontem." />
                <UiCheckbox :model-value="false" label="Desabilitado" disabled />
              </div>
              <div class="divide-y divide-line">
                <UiSwitch v-model="form.reminder" label="E-mails de estudo" description="Um por dia, só quando houver cards para revisar." />
                <UiSwitch v-model="form.sound" label="Sons na revisão" />
                <UiSwitch :model-value="true" label="Desabilitado" disabled />
              </div>
              <UiRadioGroup v-model="form.mode" label="Modo da revisão" :options="RADIO" />
            </div>
            <UiRadioGroup v-model="form.mode" label="Modo (cartões)" :options="RADIO" variant="cards" :columns="3" class="mt-6" />
          </UiSection>

          <!-- Sobreposições -->
          <UiSection title="Sobreposições" description="Diálogo e folha com a lógica do UiModal (Esc no do topo, foco preso e devolvido, rolagem travada); menu com teclado completo." data-ds-scope>
            <div class="flex flex-wrap items-center gap-3">
              <UiButton @click="overlay.dialog = true">Abrir diálogo</UiButton>
              <UiButton @click="overlay.bottom = true">Folha de baixo</UiButton>
              <UiButton @click="overlay.right = true">Painel lateral</UiButton>
              <UiMenu :items="MENU" label="Ações do caderno" />
              <UiMenu :items="MENU" align="start">
                <template #trigger="{ props }">
                  <UiButton v-bind="props" :icon-right="ChevronDown">Opções</UiButton>
                </template>
              </UiMenu>
              <UiButton variant="ghost" @click="toast.show('Cards gerados', 'success')">Toast de sucesso</UiButton>
              <UiButton variant="ghost" @click="toast.show('Card excluído', 'info', { action: { label: 'Desfazer', onClick: () => {} } })">Toast com ação</UiButton>
              <UiButton variant="ghost" @click="toast.show('Não foi possível salvar', 'error')">Toast de erro</UiButton>
            </div>
            <div class="mt-6 flex flex-col gap-2">
              <UiToast message="Cards gerados" tone="success" />
              <UiToast message="Card excluído" tone="info" :action="{ label: 'Desfazer' }" />
              <UiToast message="Sua sessão expira em 5 minutos" tone="warning" />
              <UiToast message="Não foi possível salvar" tone="error" />
            </div>
            <UiDialog v-model="overlay.dialog" title="Excluir caderno?" description="Os cards e as notas vão junto. Não dá para desfazer.">
              <UiInput v-model="form.name" label="Digite o nome do caderno para confirmar" />
              <template #footer="{ close }">
                <UiButton variant="ghost" @click="close">Cancelar</UiButton>
                <UiButton variant="danger" @click="close">Excluir</UiButton>
              </template>
            </UiDialog>
            <UiSheet v-model="overlay.bottom" title="Gerar podcast" description="Dos seus pontos fracos de hoje.">
              <UiRadioGroup v-model="form.mode" label="Duração" :options="RADIO" />
              <template #footer="{ close }"><UiButton variant="primary" block @click="close">Gerar</UiButton></template>
            </UiSheet>
            <UiSheet v-model="overlay.right" side="right" title="Detalhes do card">
              <p class="text-body">Painel lateral para detalhe e edição.</p>
            </UiSheet>
          </UiSection>

          <!-- Feedback -->
          <UiSection title="Feedback" description="Vazio com 1 CTA, erro com tentar de novo, esqueleto no formato do conteúdo e conquista (≤ 700 ms, respeita movimento reduzido)." data-ds-scope>
            <div class="grid gap-6 md:grid-cols-2">
              <UiEmptyState title="Nenhum podcast ainda" description="Gere um a partir dos seus pontos fracos." mascot :level="3">
                <template #action><UiButton data-ds-scope variant="primary">Gerar podcast</UiButton></template>
              </UiEmptyState>
              <UiErrorState description="Confira sua conexão e tente de novo." />
              <div class="flex flex-col gap-4">
                <UiSkeleton />
                <UiSkeleton variant="row" />
                <UiSkeleton variant="block" size="sm" />
              </div>
              <div>
                <UiCelebration :key="celebrateKey" kind="batch" title="Lote concluído!" :stats="[{ value: 20, label: 'cards' }, { value: '86%', label: 'de acerto' }]">
                  <UiButton data-ds-scope variant="primary">Próximo lote</UiButton>
                  <UiButton @click="celebrateKey++">Repetir animação</UiButton>
                </UiCelebration>
              </div>
            </div>
          </UiSection>
        </div>
      </main>
    </div>
    <ShellToastHost />
  </div>
</template>

<script setup lang="ts">
// Reference page of the DS v3 (prd-ds-v3-fundacao RF-2.5, tasks 13.1): every base component with its
// variants, tones and states, both themes side by side. Dev only: nuxt.config.ts drops the route from the
// production build (and keeps the chunk out of the precache under NUXT_DS_PAGE=1). Each block is its own
// [data-ds-scope], so the "one primary per screen" dev warning counts per block.
import { ArrowRight, ChevronDown, CircleHelp, Copy, Ellipsis, Headphones, Pencil, Plus, RotateCw, Search, Star, Trash2, X } from 'lucide-vue-next'
import type { TagTone } from '~/components/ui/Tag.vue'
import type { PracticeMode } from '~/components/ui/PracticeIcon.vue'

definePageMeta({ layout: false })
useHead({ title: 'Design system · Baigi', meta: [{ name: 'robots', content: 'noindex' }] })

type Mode = 'lado' | 'claro' | 'escuro'
const MODES = [{ key: 'lado', label: 'Lado a lado' }, { key: 'claro', label: 'Claro' }, { key: 'escuro', label: 'Escuro' }]
const route = useRoute()
const initial = String(route.query.tema ?? 'lado')
const mode = ref<Mode>(initial === 'claro' || initial === 'escuro' ? initial : 'lado')
const panes = computed(() => {
  if (mode.value === 'claro') return [{ key: 'claro', label: 'Tema claro', dark: false }]
  if (mode.value === 'escuro') return [{ key: 'escuro', label: 'Tema escuro', dark: false }]
  return [{ key: 'claro', label: 'Tema claro', dark: false }, { key: 'escuro', label: 'Tema escuro', dark: true }]
})

// Theme of <html> while the page is open (side by side needs it light); restored on leave
let previous: boolean | null = null
function applyHtmlTheme() {
  const root = document.documentElement
  const dark = mode.value === 'escuro'
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}
onMounted(() => {
  previous = document.documentElement.classList.contains('dark')
  applyHtmlTheme()
})
watch(mode, applyHtmlTheme)
onBeforeUnmount(() => {
  if (previous === null) return
  document.documentElement.classList.toggle('dark', previous)
  document.documentElement.style.colorScheme = previous ? 'dark' : 'light'
})

const favorite = ref(true)
const tab = ref('material')
const TABS = [{ key: 'material', label: 'Material', count: 12 }, { key: 'cards', label: 'Cards', count: 148 }, { key: 'mapa', label: 'Mapa' }]
const SUBJECTS = [
  { name: 'Português', color: 'blue', meta: '62% de domínio · 74% de acerto', mastery: 62, today: 12 },
  { name: 'Direito Constitucional', color: 'purple', meta: '48% de domínio · ponto fraco', mastery: 48, today: 20 },
  { name: 'Direito Administrativo', color: 'green', meta: '37% de domínio', mastery: 37, today: 9 },
  { name: 'Raciocínio Lógico', color: 'orange', meta: '28% de domínio', mastery: 28, today: 4 },
]
const TAG_TONES: TagTone[] = ['neutral', 'action', 'success', 'warning', 'danger', 'info', 'quiz', 'listen']
const PRACTICE: PracticeMode[] = ['review', 'quiz', 'listen']
const HOURS = [{ value: '7', label: '7h' }, { value: '12', label: '12h' }, { value: '19', label: '19h' }, { value: '21', label: '21h' }]
const RADIO = [
  { value: 'normal', label: 'Normal', description: 'Lotes de ~20 cards' },
  { value: 'relampago', label: 'Relâmpago', description: '5 minutos, os mais urgentes' },
  { value: 'erros', label: 'Só erros', description: 'O que você errou ontem' },
]
const toast = useToast()
const overlay = reactive({ dialog: false, bottom: false, right: false })
const celebrateKey = ref(0)
const MENU = [
  { label: 'Renomear', icon: Pencil, onSelect: () => toast.show('Renomear', 'info') },
  { label: 'Duplicar', icon: Copy, meta: 'Ctrl D' },
  { label: 'Mover', disabled: true },
  { label: 'Excluir', icon: Trash2, tone: 'danger' as const, onSelect: () => toast.show('Excluir', 'warning') },
]
const form = reactive({
  name: '', search: '', email: 'rafael@', note: '', hour: '', voice: '7',
  terms: true, weak: false, reminder: true, sound: false, mode: 'normal',
})
</script>
