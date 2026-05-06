<template>
  <div class="flex h-[calc(100vh-64px)]">
    <!-- Sidebar: Topic tree (desktop: inline, mobile: overlay) -->
    <aside
      class="border-r border-base flex flex-col shrink-0 transition-all duration-200 bg-surface"
      :class="[
        sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72',
        'max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:w-full max-lg:border-r-0',
        !sidebarOpen && 'max-lg:hidden',
      ]"
    >
      <div class="p-3 sm:p-4 border-b border-base">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-body font-semibold text-base-primary">Cadernos</h2>
          <div class="flex items-center gap-1">
            <button class="p-1 rounded-lg text-base-muted hover:text-accent-primary hover:bg-surface-tertiary transition-colors lg:hidden" title="Fechar" @click="sidebarOpen = false">
              <X :size="16" />
            </button>
            <button class="p-1 rounded-lg text-base-muted hover:text-accent-primary hover:bg-surface-tertiary transition-colors max-lg:hidden" title="Recolher painel" @click="sidebarCollapsed = true">
              <PanelLeftClose :size="16" />
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="(topicStore.tree?.length ?? 0) >= 5"
            class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small flex-1 justify-center"
            @click="showGraph = true"
          >
            <Network :size="16" /> Mapa
          </button>
          <div v-else class="relative flex-1 group">
            <button
              class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small w-full justify-center opacity-50 cursor-not-allowed"
              disabled
            >
              <Network :size="16" /> Mapa
            </button>
            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-base shadow-lg text-micro text-base-muted whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Disponível com 5+ cadernos ({{ topicStore.tree?.length ?? 0 }}/5)
            </span>
          </div>
          <div class="relative flex-1">
            <button class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small w-full justify-center" data-tour="create-notebook" @click="showAddMenu = !showAddMenu">
              <Plus :size="16" /> Novo
            </button>
            <div v-if="showAddMenu" class="absolute right-0 top-full mt-1 w-52 bg-surface-secondary border border-base rounded-lg shadow-lg py-1 z-20">
              <button class="w-full text-left px-3 py-2 text-small hover:bg-surface-tertiary transition-colors" @click="showAddMenu = false; openCreate(null)">
                Novo caderno
              </button>
              <NuxtLink to="/importar" class="block px-3 py-2 text-small hover:bg-surface-tertiary transition-colors" @click="showAddMenu = false">
                Importar Anki
              </NuxtLink>
              <button class="w-full text-left px-3 py-2 text-small hover:bg-surface-tertiary transition-colors" @click="showAddMenu = false; triggerStructureUpload()">
                <span class="block">PDF → Cadernos com IA</span>
                <span class="block text-micro text-base-muted">Sobe um PDF e a IA organiza em cadernos</span>
              </button>
            </div>
          </div>
        </div>
        <input ref="structureFileInput" type="file" accept=".pdf" class="hidden" @change="handleStructurePdf" />
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="topicStore.loading" class="space-y-2 p-2">
          <div v-for="i in 4" :key="i" class="skeleton h-8 rounded" />
        </div>
        <TopicTree
          v-else
          :topics="topicStore.tree"
          :selected-id="selectedTopicId"
          :progress-map="progressMap"
          @select="selectTopic"
          @edit="openEdit"
          @delete="openDelete"
          @add-child="openCreate"
        />
      </div>
    </aside>

    <!-- Main: Topic Hub -->
    <main class="flex-1 flex flex-col overflow-y-auto pb-20 lg:pb-0" style="background: radial-gradient(circle at top, rgba(217,119,6,0.04), transparent 60%);">
      <template v-if="selectedTopicId">
        <!-- Topic header -->
        <div ref="headerRef" class="p-5 border-b border-base bg-surface-secondary/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <button
                class="btn-secondary !p-1.5 !min-h-[2.75rem] shrink-0 lg:hidden"
                title="Ver cadernos"
                @click="sidebarOpen = true"
              >
                <PanelLeftOpen :size="16" />
              </button>
              <button
                v-if="sidebarCollapsed"
                class="btn-secondary !p-1.5 !min-h-[2.75rem] shrink-0 max-lg:hidden"
                title="Expandir cadernos"
                @click="sidebarCollapsed = false"
              >
                <PanelLeftOpen :size="16" />
              </button>
              <div class="min-w-0">
                <h2 class="text-headline truncate">{{ selectedTopicName }}</h2>
                <p v-if="topicCards.length" class="text-small text-base-muted mt-0.5">
                  {{ memorizeProgress > 0 ? memorizeProgress + '% dominado · ' : '' }}{{ topicCards.length }} card{{ topicCards.length !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div v-if="topicCards.length" class="mt-3">
            <div class="flex items-center gap-3">
              <div class="flex-1 h-2.5 rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  class="h-2.5 rounded-full transition-all duration-500"
                  :class="memorizeProgress < 30 ? 'bg-danger' : memorizeProgress < 70 ? 'bg-warning' : 'bg-success'"
                  :style="{ width: memorizeProgress + '%' }"
                />
              </div>
              <span class="text-small text-base-muted shrink-0">{{ memorizeProgress }}%</span>
            </div>
          </div>

          <!-- Sub-topics -->
          <div v-if="subTopics.length" class="flex flex-wrap gap-1.5 mt-3">
            <button
              v-for="sub in subTopics"
              :key="sub.id"
              class="text-small px-2.5 py-1 rounded-full bg-surface-tertiary text-base-muted hover:text-accent-primary hover:bg-accent-primary-subtle transition-colors"
              @click="selectTopic(sub.id)"
            >
              {{ sub.name }}
            </button>
          </div>

        </div>

        <!-- HERO — simple: pending cards + review button -->
        <div v-if="pendingCount > 0" class="mx-4 mt-5 mb-3 px-6 py-5 rounded-2xl bg-surface-secondary flex items-center justify-between gap-4">
          <div>
            <p class="text-headline text-base-primary">{{ pendingCount }} card{{ pendingCount !== 1 ? 's' : '' }} pendente{{ pendingCount !== 1 ? 's' : '' }}</p>
            <p class="text-small text-base-muted mt-1">Continue seu progresso de hoje</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <NuxtLink :to="`/revisar?mode=blitz&topic_id=${selectedTopicId}`" class="btn-secondary !py-3 !px-4 text-small">⚡ Rápida</NuxtLink>
            <NuxtLink :to="`/revisar?topic_id=${selectedTopicId}`" class="btn-primary !py-3 !px-6">
              Revisar agora
            </NuxtLink>
          </div>
        </div>

        <!-- Podcast generate button -->
        <div v-if="selectedTopicId" class="mx-4 mb-3">
          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-secondary border border-base hover:border-accent-primary/30 transition-colors text-left" @click="showPodcastSheet = true">
            <span class="text-xl">🎙️</span>
            <div class="flex-1">
              <p class="text-small text-base-primary">Gerar podcast deste caderno</p>
              <p class="text-micro text-base-muted">Ouça seus pontos fracos</p>
            </div>
            <span class="text-base-muted text-small">→</span>
          </button>
        </div>

        <PodcastGenerateSheet
          v-if="selectedTopicId"
          v-model="showPodcastSheet"
          :topic-id="selectedTopicId"
          :topic-name="selectedTopicName ?? ''"
          :weak-cards-count="topicCards.filter(c => c.lapses > 0).length"
          @generated="onPodcastGenerated"
        />

        <!-- Sticky header (appears on scroll) -->
        <div
          v-if="showStickyHeader"
          class="sticky top-0 z-10 px-4 py-2.5 border-b border-base bg-overlay flex items-center justify-between"
        >
          <span class="text-small font-medium text-base-primary truncate">{{ selectedTopicName }}</span>
          <NuxtLink v-if="dueCardsCount > 0" :to="`/revisar?topic_id=${selectedTopicId}`" class="btn-primary !py-2 !px-3.5 !min-h-[2.75rem] text-small shrink-0">
            Revisar {{ dueCardsCount }}
          </NuxtLink>
        </div>

        <!-- Tabs -->
        <div class="px-4 mt-4">
          <UiHubTabs
            v-model="activeTab"
            :tabs="[
              { key: 'notes', label: 'Material', count: noteStore.notes.length },
              { key: 'cards', label: 'Cards', count: topicCards.length },
            ]"
            :storage-key="`memorai-hub-tab-${selectedTopicId}`"
          />
        </div>

        <!-- Tab: Material -->
        <TopicHubNotesTab
          v-if="activeTab === 'notes'"
          :notes="noteStore.notes"
          :active-note="editingNote"
          :note-title="noteTitle"
          :saving="noteStore.saving"
          :has-documents="!!docsInlineRef?.documents?.length"
          :cards-from-note="cardsFromNote"
          :cards-ai-remaining="cardsAiRemaining"
          :cards-ai-limit="cardsAiLimit"
          @open-note="openNoteEditor"
          @close-editor="editingNote = null; noteStore.current = null"
          @quick-add="handleQuickAdd"
          @create-note="createNote"
          @generate-from-note="generateFromCurrentNote"
          @improve-note="openChatForNote"
          @delete-note="showDeleteNote = true"
          @save-title="saveTitle"
          @update:note-title="noteTitle = $event"
        >
          <template #documents>
            <TopicDocumentsInline
              v-if="selectedTopicId"
              ref="docsInlineRef"
              :topic-id="selectedTopicId"
              @generate-from-pdf="(docId: string) => handleAiGenerate('pdf', 5, docId)"
              @note-ready="noteStore.fetchForTopic(selectedTopicId!)"
              @generate-cards="(noteId: string) => handleAiGenerate('notes', 5)"
              @structure-ready="topicStore.fetchTree()"
            />
          </template>
          <template #editor>
            <TopicNoteEditor v-model="noteContent" @update:model-value="debouncedSave" />
            <UiSelectionToolbar @create-card="openNoteToCard" @ask-ai="askAiAboutSelection" />
          </template>
          <template #read-content>
            <div class="prose-memorai" v-html="noteContentHtml" />
          </template>
        </TopicHubNotesTab>

        <!-- Tab: Cards -->
        <TopicHubCardsTab
          v-if="activeTab === 'cards'"
          :topic-id="selectedTopicId!"
          :cards="topicCards"
          :generated-cards="generatedCards"
          :ai-generating="aiGenerating"
          :error-patterns="errorPatterns"
          :note-name-by-id="noteNameById"
          :highlight-id="highlightCardId"
          :can-use-ocr="featureUsage.canUse('cards_ai')"
          @create-card="openCreateCard"
          @delete-card="confirmDeleteCard"
          @edit-card="openEditCard"
          @accept-card="acceptCard"
          @accept-all-cards="acceptAllCards"
          @edit-generated="editGeneratedCard"
          @discard-generated="(i: number) => generatedCards.splice(i, 1)"
          @ocr-cards="handleOcrCards"
        >
          <template #ai-generate>
            <AgentAiGenerateInline
              :topic-id="selectedTopicId!"
              :has-notes="noteStore.notes.length > 0"
              :has-documents="docsInlineRef?.documents?.length > 0"
              @generate="handleAiGenerate"
            />
          </template>
        </TopicHubCardsTab>

      </template>

      <div v-else class="flex-1 flex flex-col items-center justify-center text-base-muted text-small gap-3">
        <button
          class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small lg:hidden"
          @click="sidebarOpen = true"
        >
          <PanelLeftOpen :size="16" /> Ver cadernos
        </button>
        <button
          v-if="sidebarCollapsed"
          class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small max-lg:hidden"
          @click="sidebarCollapsed = false"
        >
          <PanelLeftOpen :size="16" /> Ver cadernos
        </button>
        <span>Selecione um caderno para começar.</span>
      </div>
    </main>

    <!-- Mobile: sticky bottom review button -->
    <div v-if="selectedTopicId && dueCardsCount > 0" class="lg:hidden fixed bottom-16 left-0 right-0 p-3 bg-overlay border-t border-base z-30 flex gap-2">
      <NuxtLink :to="`/revisar?mode=blitz&topic_id=${selectedTopicId}`" class="btn-secondary flex-none justify-center !py-2.5 !px-3">
        ⚡ Rápida
      </NuxtLink>
      <NuxtLink :to="`/revisar?topic_id=${selectedTopicId}`" class="btn-primary flex-1 justify-center">
        Revisar {{ dueCardsCount }} card{{ dueCardsCount !== 1 ? 's' : '' }}
      </NuxtLink>
    </div>

    <!-- Modals -->
    <UiModal v-model="showCreateTopic" size="sm" aria-label="Criar caderno">
      <h2 class="text-headline mb-4">{{ createParentId ? 'Novo tópico' : 'Novo caderno' }}</h2>
      <form @submit.prevent="handleCreateTopic" class="flex flex-col gap-4">
        <input v-model="newTopicName" type="text" class="input-base w-full" :placeholder="createParentId ? 'Nome do tópico' : 'Nome do caderno'" autofocus />
        <div class="flex gap-3 justify-end">
          <button type="button" class="btn-secondary" @click="showCreateTopic = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="!newTopicName.trim()">Criar</button>
        </div>
      </form>
    </UiModal>

    <UiModal v-model="showEditTopic" size="sm" aria-label="Editar">
      <h2 class="text-headline mb-4">{{ editTopicIsRoot ? 'Editar caderno' : 'Editar tópico' }}</h2>
      <form @submit.prevent="handleEditTopic" class="flex flex-col gap-4">
        <input v-model="editTopicName" type="text" class="input-base w-full" autofocus />
        <div class="flex gap-3 justify-end">
          <button type="button" class="btn-secondary" @click="showEditTopic = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="!editTopicName.trim()">Salvar</button>
        </div>
      </form>
    </UiModal>

    <UiConfirmModal
      v-model="showDeleteTopic"
      title="Deletar?"
      message="Conteúdo e notas serão deletados. Cards vinculados serão removidos."
      confirm-label="Deletar"
      @confirm="handleDeleteTopic"
    />

    <TopicNoteToCardModal
      v-if="noteStore.current"
      v-model="showNoteToCard"
      :note-id="noteStore.current.id"
      :selected-text="selectedText"
      @created="onCardCreated"
    />

    <UiConfirmModal
      v-model="showDeleteCard"
      title="Excluir card?"
      message="O card será removido permanentemente."
      confirm-label="Excluir"
      @confirm="handleDeleteCard"
    />

    <UiConfirmModal
      v-model="showDeleteNote"
      title="Excluir nota?"
      message="A nota será removida permanentemente. Cards gerados dela não serão afetados."
      confirm-label="Excluir"
      @confirm="handleDeleteNote"
    />

    <FlashcardCardFormModal
      v-model="showCardForm"
      :topic-id="selectedTopicId ?? undefined"
      :card="editingCard"
      :initial-front="cardFormInitialFront"
      :initial-back="cardFormInitialBack"
      :local-only="editingGeneratedCardIndex !== null"
      @created="onCardCreated"
      @updated="onCardCreated"
      @local-save="onLocalSaveGenerated"
    />

    <!-- Edit AI generated card (in-place, no save) -->

    <!-- Note editor modal removed — now using split-view in HubNotesTab -->

    <TopicGraphOverlay v-model="showGraph" />
  </div>
</template>

<script setup lang="ts">
import { Plus, Network, Trash2, PanelLeftClose, PanelLeftOpen, X } from 'lucide-vue-next'
import type { Topic, Note } from '~/types'

const topicStore = useTopicStore()
const noteStore = useNoteStore()
const toast = useToast()
const route = useRoute()
const { $api } = useNuxtApp()
const featureUsage = useFeatureUsage()

const selectedTopicId = ref<string | null>(null)
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(true)
const noteTitle = ref('')
const noteContent = ref<Record<string, any> | null>(null)
const selectedText = ref('')
const topicErrors = ref<any[]>([])
const topicCards = ref<any[]>([])
const errorPatterns = ref<any>(null)
const generatedCards = ref<any[]>([])
const generatingDeckId = ref<string>('')
const aiGenerating = ref(false)

// Topic modals
const showCreateTopic = ref(false)
const showEditTopic = ref(false)
const showDeleteTopic = ref(false)
const showNoteToCard = ref(false)
const showGraph = ref(false)
const showAddMenu = ref(false)
const showPodcastSheet = ref(false)
const highlightCardId = ref('')

function onPodcastGenerated() {
  const podcastStore = usePodcastStore()
  podcastStore.startPolling()
}
const showCardForm = ref(false)
const cardFormInitialFront = ref('')
const cardFormInitialBack = ref('')
const editingGeneratedCardIndex = ref<number | null>(null)
const editingCard = ref<any>(null)
const docsInlineRef = ref<any>(null)
const activeTab = ref('notes')
const editingNote = ref<Note | null>(null)

const newTopicName = ref('')
const editTopicName = ref('')
const createParentId = ref<string | null>(null)
const editTopicId = ref<string | null>(null)
const deleteTopicId = ref<string | null>(null)

const cardsAiRemaining = computed(() => featureUsage.remaining('cards_ai'))
const cardsAiLimit = computed(() => featureUsage.usage.value?.features?.cards_ai?.limit ?? null)

const selectedTopicName = computed(() => {
  function find(topics: Topic[], id: string): string | null {
    for (const t of topics) {
      if (t.id === id) return t.name
      const found = find(t.children ?? [], id)
      if (found) return found
    }
    return null
  }
  return selectedTopicId.value ? find(topicStore.tree, selectedTopicId.value) ?? '' : ''
})

const memorizeProgress = computed(() => {
  if (!topicCards.value.length) return 0
  const mastered = topicCards.value.filter(c => c.state === 'review').length
  return Math.round((mastered / topicCards.value.length) * 100)
})

const dueCardsCount = computed(() => {
  return topicCards.value.filter(c => c.due && new Date(c.due) <= new Date()).length
})

const newCardsCount = computed(() => {
  return topicCards.value.filter(c => c.state === 'new').length
})

const pendingCount = computed(() => dueCardsCount.value + newCardsCount.value)

const noteContentHtml = computed(() => {
  if (!noteContent.value) return ''
  return extractHtmlFromTiptap(noteContent.value)
})

function extractHtmlFromTiptap(doc: any): string {
  if (!doc) return ''
  if (typeof doc === 'string') return doc

  if (doc.type === 'doc' && doc.content) {
    return doc.content.map((n: any) => renderNode(n)).join('')
  }

  return renderNode(doc)
}

function renderNode(node: any): string {
  if (!node) return ''

  switch (node.type) {
    case 'heading': {
      const level = node.attrs?.level ?? 2
      return `<h${level}>${renderChildren(node)}</h${level}>`
    }
    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`
    case 'bulletList':
      return `<ul>${renderChildren(node)}</ul>`
    case 'orderedList':
      return `<ol>${renderChildren(node)}</ol>`
    case 'listItem':
      return `<li>${renderChildren(node)}</li>`
    case 'callout': {
      const calloutType = node.attrs?.type || 'info'
      return `<div class="callout callout-${calloutType}">${renderChildren(node)}</div>`
    }
    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`
    case 'image':
      return `<img src="${node.attrs?.src}" alt="${node.attrs?.alt || ''}" />`
    case 'text': {
      let text = escapeHtml(node.text || '')
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `<strong>${text}</strong>`
          else if (mark.type === 'italic') text = `<em>${text}</em>`
          else if (mark.type === 'code') text = `<code>${text}</code>`
        }
      }
      return text
    }
    default:
      return renderChildren(node)
  }
}

function renderChildren(node: any): string {
  if (!node.content) return node.text ? escapeHtml(node.text) : ''
  return node.content.map((child: any) => renderNode(child)).join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function cardsFromNote(noteId: string): number {
  return topicCards.value.filter(c => c.source_note_id === noteId).length
}

function noteNameById(noteId: string): string {
  return noteStore.notes.find(n => n.id === noteId)?.title ?? 'Nota'
}

const subTopics = computed(() => {
  if (!selectedTopicId.value) return []
  function findChildren(topics: Topic[], parentId: string): Topic[] {
    for (const t of topics) {
      if (t.id === parentId) return t.children ?? []
      const found = findChildren(t.children ?? [], parentId)
      if (found.length) return found
    }
    return []
  }
  return findChildren(topicStore.tree, selectedTopicId.value)
})

const headerRef = ref<HTMLElement>()
const showStickyHeader = ref(false)

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let pendingSaveNoteId: string | null = null
let pendingSaveContent: Record<string, any> | null = null

function flushPendingSave() {
  if (saveTimeout && pendingSaveNoteId && pendingSaveContent) {
    clearTimeout(saveTimeout)
    saveTimeout = null
    noteStore.update(pendingSaveNoteId, { content: pendingSaveContent })
    pendingSaveNoteId = null
    pendingSaveContent = null
  }
}

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  pendingSaveNoteId = noteStore.current?.id ?? null
  pendingSaveContent = noteContent.value ? JSON.parse(JSON.stringify(noteContent.value)) : null
  saveTimeout = setTimeout(() => {
    if (pendingSaveNoteId && pendingSaveContent) {
      noteStore.update(pendingSaveNoteId, { content: pendingSaveContent })
      pendingSaveNoteId = null
      pendingSaveContent = null
    }
    saveTimeout = null
  }, 1000)
}

function saveTitle() {
  if (noteStore.current && noteTitle.value !== noteStore.current.title) {
    noteStore.update(noteStore.current.id, { title: noteTitle.value })
  }
}

function selectTopic(id: string) {
  flushPendingSave()
  selectedTopicId.value = id
  noteStore.current = null
  noteStore.fetchForTopic(id).then(() => {
    // Auto-select first note if available
    if (noteStore.notes.length && !noteStore.current) {
      selectNote(noteStore.notes[0])
    }
  })
  loadTopicData(id)
  if (window.innerWidth < 1024) sidebarOpen.value = false
}

async function loadTopicData(id: string) {
  try {
    const [errRes, detailRes, patternsRes] = await Promise.all([
      $api<any>(`/topics/${id}/error-logs`),
      $api<any>(`/topics/${id}/details`),
      $api<any>(`/topics/${id}/error-patterns`),
    ])
    topicErrors.value = errRes.data
    topicCards.value = detailRes.data.flashcards
    errorPatterns.value = patternsRes.data

    // Set default tab based on content
    const hasDue = topicCards.value.some(c => c.due && new Date(c.due) <= new Date())
    const hasNew = topicCards.value.some(c => c.state === 'new')
    const stored = localStorage.getItem(`memorai-hub-tab-${id}`)

    // Query param override (from podcast player link)
    if (route.query.tab === 'cards') {
      activeTab.value = 'cards'
    } else if (stored) {
      activeTab.value = stored
    } else {
      activeTab.value = (hasDue || hasNew) ? 'cards' : 'notes'
    }

    // Highlight card from query param
    if (route.query.highlight) {
      activeTab.value = 'cards'
      highlightCardId.value = route.query.highlight as string
      // Wait for tab + card list to render
      setTimeout(() => {
        const el = document.getElementById(`card-${highlightCardId.value}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { highlightCardId.value = '' }, 3000)
      }, 300)
    }
  } catch {}
}

async function deleteCard(cardId: string) {
  try {
    await $api(`/flashcards/${cardId}`, { method: 'DELETE' })
    topicCards.value = topicCards.value.filter(c => c.id !== cardId)
    toast.show('Card excluído.', 'success')
  } catch {
    toast.show('Erro ao excluir card.', 'error')
  }
}

const showDeleteCard = ref(false)
const deleteCardId = ref<string | null>(null)
const showDeleteNote = ref(false)

function confirmDeleteCard(id: string) {
  deleteCardId.value = id
  showDeleteCard.value = true
}

async function handleDeleteCard() {
  if (!deleteCardId.value) return
  await deleteCard(deleteCardId.value)
  deleteCardId.value = null
  showDeleteCard.value = false
}

function selectNote(note: Note) {
  flushPendingSave()
  noteStore.current = note
  noteTitle.value = note.title
  noteContent.value = note.content
}

function openNoteEditor(note: Note) {
  selectNote(note)
  editingNote.value = note
}

async function handleQuickAdd(text: string) {
  if (!selectedTopicId.value) return
  const title = text.substring(0, 50).split('\n')[0] || 'Material'
  const note = await noteStore.create(selectedTopicId.value, {
    title,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  })
  openNoteEditor(note)
  await topicStore.fetchTree()
}

async function createNote() {
  if (!selectedTopicId.value) return
  const note = await noteStore.create(selectedTopicId.value, { title: 'Novo material' })
  openNoteEditor(note)
  await topicStore.fetchTree()
}

async function deleteNote() {
  if (!noteStore.current) return
  await noteStore.remove(noteStore.current.id)
  toast.show('Nota excluída.', 'success')
  await topicStore.fetchTree()
}

async function handleDeleteNote() {
  await deleteNote()
  showDeleteNote.value = false
}

function openCreate(parentId: string | null) {
  createParentId.value = parentId
  newTopicName.value = ''
  showCreateTopic.value = true
}

function openChatForNote() {
  const chat = useChatStore()
  const note = noteStore.current
  chat.newConversation()
  chat.open({ topicId: selectedTopicId.value ?? undefined, source: 'note_help' })
  if (note) {
    const title = note.title || 'minha nota'
    nextTick(() => {
      chat.sendMessage(`Me ajuda a melhorar essa nota "${title}"`)
    })
  }
}

function askAiAboutSelection() {
  const sel = window.getSelection()?.toString().trim()
  if (!sel) return
  const chat = useChatStore()
  chat.newConversation()
  chat.open({ topicId: selectedTopicId.value ?? undefined, source: 'note_help' })
  nextTick(() => {
    chat.sendMessage(`Me explica isso: "${sel}"`)
  })
}

function openChatForPdf(docId: string) {
  const chat = useChatStore()
  chat.newConversation()
  chat.open({ topicId: selectedTopicId.value ?? undefined, documentId: docId, source: 'pdf_summary' })
  nextTick(() => {
    chat.sendMessage('Resuma este documento pra mim, destacando os pontos mais importantes.')
  })
}

const structureFileInput = ref<HTMLInputElement | null>(null)

function triggerStructureUpload() {
  structureFileInput.value?.click()
}

async function handleStructurePdf(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.name.endsWith('.pdf')) { toast.show('Apenas PDF.', 'error'); return }
  if (file.size > 50 * 1024 * 1024) { toast.show('Máximo 50MB.', 'error'); return }

  toast.show('Enviando PDF...')
  try {
    const config = useRuntimeConfig()
    const auth = useAuthStore()

    // Upload without topic_id
    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await $api<any>('/documents', { method: 'POST', body: formData })
    const documentId = uploadRes.data.id

    // Trigger structure generation
    await $api('/topics/from-document', { method: 'POST', body: { document_id: documentId } })
    toast.show('A IA está organizando seus cadernos... ⏳')

    // Poll for completion
    const poll = setInterval(async () => {
      try {
        const res = await $api<any>(`/documents/${documentId}`)
        if (res.data.study_structure_status === 'completed') {
          clearInterval(poll)
          toast.show('Cadernos criados com sucesso! 📚')
          topicStore.fetchTree()
        } else if (res.data.study_structure_status === 'failed') {
          clearInterval(poll)
          toast.show('Falha ao criar estrutura. Tente novamente.', 'error')
        }
      } catch { clearInterval(poll) }
    }, 4000)

    // Timeout after 5 min
    setTimeout(() => clearInterval(poll), 300000)
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao enviar PDF.', 'error')
  } finally {
    if (structureFileInput.value) structureFileInput.value.value = ''
  }
}

const editTopicIsRoot = ref(false)

function openEdit(topic: Topic) {
  editTopicId.value = topic.id
  editTopicName.value = topic.name
  editTopicIsRoot.value = !topic.parent_id
  showEditTopic.value = true
}

function openDelete(topic: Topic) {
  deleteTopicId.value = topic.id
  showDeleteTopic.value = true
}

async function handleCreateTopic() {
  await topicStore.create({ name: newTopicName.value, parent_id: createParentId.value })
  showCreateTopic.value = false
  toast.show('Caderno criado!', 'success')
}

async function handleEditTopic() {
  if (!editTopicId.value) return
  await topicStore.update(editTopicId.value, { name: editTopicName.value })
  showEditTopic.value = false
  toast.show('Salvo!', 'success')
}

async function handleDeleteTopic() {
  if (!deleteTopicId.value) return
  await topicStore.remove(deleteTopicId.value)
  if (selectedTopicId.value === deleteTopicId.value) selectedTopicId.value = null
  showDeleteTopic.value = false
  toast.show('Deletado.', 'success')
}

function extractTextFromTiptap(doc: any): string {
  if (!doc) return ''
  if (typeof doc === 'string') return doc
  let text = ''
  if (doc.text) text += doc.text
  if (doc.content) {
    for (const node of doc.content) {
      text += extractTextFromTiptap(node)
      if (node.type === 'paragraph' || node.type === 'heading') text += '\n'
    }
  }
  return text.trim()
}

function getEditorHtml(): string {
  // Get HTML from the Tiptap editor DOM
  const el = document.querySelector('.ProseMirror')
  return el?.innerHTML ?? ''
}

function openNoteToCard() {
  if (import.meta.client) {
    const current = window.getSelection()?.toString()?.trim() ?? ''
    if (current) {
      selectedText.value = current
      showNoteToCard.value = true
    } else {
      cardFormInitialFront.value = getEditorHtml()
      showCardForm.value = true
    }
  }
}

async function handleAiGenerate(source: string, quantity: number, documentIdOrPrompt?: string) {
  if (!selectedTopicId.value) return

  let deckId = topicCards.value[0]?.deck_id
  if (!deckId) {
    const deckStore = useDeckStore()
    if (!deckStore.decks.length) await deckStore.fetchDecks()
    deckId = deckStore.decks[0]?.id
  }
  if (!deckId) {
    toast.show('Crie um deck antes de gerar cards.', 'error')
    return
  }

  activeTab.value = 'cards'
  aiGenerating.value = true
  toast.show('Gerando cards com IA...', 'success')
  try {
    const res = await $api<any>('/ai/generate-cards', {
      method: 'POST',
      body: {
        topic_id: selectedTopicId.value,
        deck_id: deckId,
        source,
        count: quantity,
        document_id: source === 'pdf' ? documentIdOrPrompt : undefined,
        prompt: source === 'free' ? documentIdOrPrompt : undefined,
      },
    })
    const cards = res.data?.cards ?? []
    if (cards.length) {
      generatedCards.value = cards
      generatingDeckId.value = deckId
    } else {
      toast.show('Nenhum card gerado.', 'error')
    }
  } catch (e: any) {
    const msg = e.data?.message || 'Erro ao gerar cards.'
    toast.show(msg, 'error')
  } finally {
    aiGenerating.value = false
  }
}

function handleOcrCards(cards: any[]) {
  generatedCards.value = cards.map(c => ({ front: c.front, back: c.back }))
  generatingDeckId.value = topicCards.value[0]?.deck_id || null
  activeTab.value = 'cards'
  toast.show(`${cards.length} cards gerados da imagem!`, 'success')
}

async function acceptCard(index: number) {
  const card = generatedCards.value[index]
  if (!card || !generatingDeckId.value) return
  try {
    await $api('/ai/accept-cards', {
      method: 'POST',
      body: {
        deck_id: generatingDeckId.value,
        cards: [{ ...card, topic_id: selectedTopicId.value }],
      },
    })
    generatedCards.value.splice(index, 1)
    toast.show('Card aceito!', 'success')
    if (selectedTopicId.value) await loadTopicData(selectedTopicId.value)
  } catch {
    toast.show('Erro ao aceitar card.', 'error')
  }
}

function editGeneratedCard(index: number) {
  const card = generatedCards.value[index]
  if (!card) return
  cardFormInitialFront.value = card.front ?? ''
  cardFormInitialBack.value = card.back ?? ''
  editingGeneratedCardIndex.value = index
  showCardForm.value = true
}

function openCreateCard() {
  cardFormInitialFront.value = ''
  cardFormInitialBack.value = ''
  editingGeneratedCardIndex.value = null
  editingCard.value = null
  showCardForm.value = true
}

function openEditCard(card: any) {
  editingCard.value = card
  editingGeneratedCardIndex.value = null
  showCardForm.value = true
}

function generateFromCurrentNote(count: number = 5) {
  if (!selectedTopicId.value) {
    toast.show('Selecione um caderno primeiro.', 'error')
    return
  }
  handleAiGenerate('notes', count)
}

async function acceptAllCards() {
  if (!generatedCards.value.length || !generatingDeckId.value) return
  try {
    await $api('/ai/accept-cards', {
      method: 'POST',
      body: {
        deck_id: generatingDeckId.value,
        cards: generatedCards.value.map(c => ({ ...c, topic_id: selectedTopicId.value })),
      },
    })
    const count = generatedCards.value.length
    generatedCards.value = []
    toast.show(`${count} cards aceitos!`, 'success')
    if (selectedTopicId.value) await loadTopicData(selectedTopicId.value)
  } catch {
    toast.show('Erro ao aceitar cards.', 'error')
  }
}

async function onCardCreated() {
  if (selectedTopicId.value) await loadTopicData(selectedTopicId.value)
  await topicStore.fetchTree()
}

function onLocalSaveGenerated(card: { front: string; back: string; tags: string[]; frontAudioBlob: Blob | null; backAudioBlob: Blob | null }) {
  if (editingGeneratedCardIndex.value === null) return
  generatedCards.value[editingGeneratedCardIndex.value] = {
    ...generatedCards.value[editingGeneratedCardIndex.value],
    front: card.front,
    back: card.back,
    frontAudioBlob: card.frontAudioBlob,
    backAudioBlob: card.backAudioBlob,
  }
  editingGeneratedCardIndex.value = null
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const progressMap = ref<Record<string, number>>({})

onMounted(async () => {
  await topicStore.fetchTree()
  featureUsage.fetchUsage()
  try {
    const res = await $api<any>('/topics/progress')
    for (const tp of res.data) {
      progressMap.value[tp.id] = tp.progress
    }
  } catch {}
  if (route.query.view === 'graph') {
    showGraph.value = true
  }
  if (route.query.topic) {
    selectTopic(route.query.topic as string)
    if (route.query.note) {
      // Wait for notes to load, then select
      const noteId = route.query.note as string
      const unwatch = watch(() => noteStore.notes, (notes) => {
        const note = notes.find(n => n.id === noteId)
        if (note) {
          selectNote(note)
          unwatch()
        }
      }, { immediate: true })
    }
  } else if (topicStore.tree.length) {
    // Auto-select first topic
    selectTopic(topicStore.tree[0].id)
  }

  // Sticky header observer
  const observer = new IntersectionObserver(
    ([entry]) => { showStickyHeader.value = !entry.isIntersecting },
    { threshold: 0 }
  )
  watch(headerRef, (el) => { if (el) observer.observe(el) }, { immediate: true })
  onUnmounted(() => observer.disconnect())
})
</script>
