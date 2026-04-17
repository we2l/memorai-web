<template>
  <div class="flex h-[calc(100vh-64px)]">
    <!-- Sidebar: Topic tree -->
    <aside class="w-72 border-r border-base flex flex-col shrink-0">
      <div class="flex items-center justify-between p-4 border-b border-base">
        <h2 class="text-label">Tópicos</h2>
        <button class="btn-secondary !p-1.5" title="Novo tópico" @click="openCreate(null)">
          <Plus :size="16" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="topicStore.loading" class="space-y-2 p-2">
          <div v-for="i in 4" :key="i" class="skeleton h-8 rounded" />
        </div>
        <TopicTree
          v-else
          :topics="topicStore.tree"
          :selected-id="selectedTopicId"
          @select="selectTopic"
          @edit="openEdit"
          @delete="openDelete"
          @add-child="openCreate"
        />
      </div>
    </aside>

    <!-- Main: Notes -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <template v-if="selectedTopicId">
        <!-- Topic header -->
        <div class="flex items-center justify-between p-4 border-b border-base">
          <h2 class="text-headline truncate">{{ selectedTopicName }}</h2>
          <div class="flex items-center gap-2">
            <NuxtLink :to="`/review?topic_id=${selectedTopicId}`" class="btn-primary text-micro">
              <BookOpen :size="14" /> Revisar
            </NuxtLink>
            <button v-if="activeTab === 'notes'" class="btn-primary text-micro" @click="createNote">
              <FilePlus :size="14" /> Nova nota
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-base px-4">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="px-4 py-2.5 text-small transition-colors border-b-2 -mb-px"
            :class="activeTab === tab.id ? 'border-accent-primary text-accent-primary font-medium' : 'border-transparent text-base-muted hover:text-base-secondary'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab: Notes -->
        <div v-if="activeTab === 'notes'" class="flex flex-1 overflow-hidden">
          <!-- Notes list -->
          <div class="w-64 border-r border-base overflow-y-auto shrink-0">
            <div v-if="noteStore.loading" class="space-y-2 p-3">
              <div v-for="i in 3" :key="i" class="skeleton h-12 rounded" />
            </div>
            <div v-else-if="noteStore.notes.length" class="p-2 space-y-1">
              <button
                v-for="note in noteStore.notes"
                :key="note.id"
                class="w-full text-left px-3 py-2 rounded-lg text-small transition-colors group"
                :class="noteStore.current?.id === note.id ? 'bg-accent-primary-subtle text-accent-primary' : 'text-base-secondary hover:bg-surface-tertiary'"
                @click="selectNote(note)"
              >
                <p class="truncate font-medium">{{ note.title }}</p>
                <p class="text-micro text-base-muted">{{ formatDate(note.updated_at) }}</p>
              </button>
            </div>
            <div v-else class="p-4 text-small text-base-muted text-center">
              Nenhuma nota.
            </div>
          </div>

          <!-- Editor -->
          <div v-if="noteStore.current" class="flex-1 flex flex-col overflow-hidden p-4">
            <input
              v-model="noteTitle"
              class="text-title bg-transparent border-b border-dashed border-base outline-none mb-4 text-base-primary pb-1 hover:border-accent-primary focus:border-accent-primary transition-colors"
              placeholder="Título da nota"
              @blur="saveTitle"
            />
            <div class="flex-1 overflow-y-auto">
              <TopicNoteEditor v-model="noteContent" @update:model-value="debouncedSave" />
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-base">
              <div class="flex items-center gap-2">
                <button class="btn-secondary" @click="openNoteToCard">
                  <Zap :size="16" /> Criar card
                </button>
                <span v-if="noteStore.saving" class="text-micro text-base-muted">Salvando...</span>
                <span v-else class="text-micro text-base-muted">Salvo</span>
              </div>
              <button class="text-small text-danger hover:underline font-medium" @click="deleteNote">Excluir nota</button>
            </div>
          </div>
          <div v-else class="flex-1 flex items-center justify-center text-base-muted text-small">
            Selecione ou crie uma nota.
          </div>
        </div>

        <!-- Tab: Errors -->
        <div v-else-if="activeTab === 'errors'" class="flex-1 overflow-y-auto p-4">
          <div v-if="topicErrors.length" class="space-y-2">
            <div v-for="err in topicErrors" :key="err.id" class="card flex items-start gap-3">
              <span class="text-base shrink-0">{{ reasonIcon(err.reason) }}</span>
              <div class="min-w-0 flex-1">
                <div class="text-small text-base-primary truncate card-front-preview" v-html="err.card_front" />
                <p v-if="err.note" class="text-small text-base-secondary mt-1">{{ err.note }}</p>
                <p class="text-micro text-base-muted mt-1">{{ formatDate(err.created_at) }}</p>
              </div>
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-full text-base-muted text-small">
            Nenhum erro registrado neste tópico.
          </div>
        </div>

        <!-- Tab: Cards -->
        <div v-else-if="activeTab === 'cards'" class="flex-1 overflow-y-auto p-4">
          <div v-if="topicCards.length" class="space-y-2">
            <div v-for="card in topicCards" :key="card.id" class="card flex items-center gap-3">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                :class="card.state === 'review' ? 'bg-success' : card.state === 'new' ? 'bg-[#6B7280]' : 'bg-warning'"
              />
              <div class="text-small text-base-primary truncate flex-1 card-front-preview" v-html="card.front" />
              <span class="text-micro text-base-muted shrink-0">{{ cardStateLabel(card.state) }}</span>
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-full text-base-muted text-small">
            Nenhum card vinculado a este tópico.
          </div>
        </div>

        <!-- Tab: Checklist -->
        <div v-else-if="activeTab === 'checklist'" class="flex-1 overflow-y-auto p-4">
          <div class="space-y-2 mb-4">
            <div
              v-for="item in checklistItems"
              :key="item.id"
              class="flex items-center gap-3 group"
            >
              <button
                type="button"
                class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                :class="item.completed ? 'bg-success border-success text-white' : 'border-base hover:border-accent-primary'"
                @click="toggleChecklistItem(item)"
              >
                <span v-if="item.completed" class="text-micro">✓</span>
              </button>
              <span
                class="text-small flex-1"
                :class="item.completed ? 'line-through text-base-muted' : 'text-base-primary'"
              >
                {{ item.text }}
              </span>
              <button
                type="button"
                class="text-micro text-base-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                @click="deleteChecklistItem(item.id)"
              >
                ×
              </button>
            </div>
          </div>
          <form @submit.prevent="addChecklistItem" class="flex gap-2">
            <input
              v-model="newChecklistText"
              class="input-base text-small flex-1"
              placeholder="Adicionar item... ex: Entendi conceito X"
            />
            <button type="submit" class="btn-primary text-micro" :disabled="!newChecklistText.trim()">Adicionar</button>
          </form>
          <div v-if="checklistItems.length" class="mt-4 text-micro text-base-muted">
            {{ checklistItems.filter(i => i.completed).length }}/{{ checklistItems.length }} concluídos
          </div>
        </div>

      </template>

      <div v-else class="flex-1 flex items-center justify-center text-base-muted text-small">
        Selecione um tópico para ver suas notas.
      </div>
    </main>

    <!-- Modals -->
    <UiModal v-model="showCreateTopic" size="sm" aria-label="Criar tópico">
      <h2 class="text-headline mb-4">{{ createParentId ? 'Novo sub-tópico' : 'Novo tópico' }}</h2>
      <form @submit.prevent="handleCreateTopic" class="flex flex-col gap-4">
        <input v-model="newTopicName" type="text" class="input-base w-full" placeholder="Nome do tópico" autofocus />
        <div class="flex gap-3 justify-end">
          <button type="button" class="btn-secondary" @click="showCreateTopic = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="!newTopicName.trim()">Criar</button>
        </div>
      </form>
    </UiModal>

    <UiModal v-model="showEditTopic" size="sm" aria-label="Editar tópico">
      <h2 class="text-headline mb-4">Editar tópico</h2>
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
      title="Deletar tópico?"
      message="Sub-tópicos e notas serão deletados. Cards vinculados perdem o vínculo mas não são deletados."
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
  </div>
</template>

<script setup lang="ts">
import { Plus, FilePlus, Zap, BookOpen } from 'lucide-vue-next'
import type { Topic, Note } from '~/types'

const topicStore = useTopicStore()
const noteStore = useNoteStore()
const toast = useToast()
const { $api } = useNuxtApp()

const selectedTopicId = ref<string | null>(null)
const activeTab = ref<'notes' | 'errors' | 'cards' | 'checklist'>('notes')
const noteTitle = ref('')
const noteContent = ref<Record<string, any> | null>(null)
const selectedText = ref('')
const topicErrors = ref<any[]>([])
const topicCards = ref<any[]>([])
const checklistItems = ref<any[]>([])
const newChecklistText = ref('')
const tabs = [
  { id: 'notes' as const, label: 'Notas' },
  { id: 'errors' as const, label: 'Erros' },
  { id: 'cards' as const, label: 'Cards' },
  { id: 'checklist' as const, label: 'Checklist' },
]

// Topic modals
const showCreateTopic = ref(false)
const showEditTopic = ref(false)
const showDeleteTopic = ref(false)
const showNoteToCard = ref(false)
const newTopicName = ref('')
const editTopicName = ref('')
const createParentId = ref<string | null>(null)
const editTopicId = ref<string | null>(null)
const deleteTopicId = ref<string | null>(null)

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
  activeTab.value = 'notes'
  noteStore.current = null
  noteStore.fetchForTopic(id)
  loadTopicData(id)
}

async function loadTopicData(id: string) {
  try {
    const [errRes, detailRes, checkRes] = await Promise.all([
      $api<any>(`/topics/${id}/error-logs`),
      $api<any>(`/topics/${id}/details`),
      $api<any>(`/topics/${id}/checklist`),
    ])
    topicErrors.value = errRes.data
    topicCards.value = detailRes.data.flashcards
    checklistItems.value = checkRes.data
  } catch {}
}

async function addChecklistItem() {
  if (!newChecklistText.value.trim() || !selectedTopicId.value) return
  try {
    const res = await $api<any>(`/topics/${selectedTopicId.value}/checklist`, {
      method: 'POST',
      body: { text: newChecklistText.value.trim() },
    })
    checklistItems.value.push(res.data)
    newChecklistText.value = ''
  } catch {}
}

async function toggleChecklistItem(item: any) {
  try {
    const res = await $api<any>(`/topics/${selectedTopicId.value}/checklist/${item.id}`, {
      method: 'PUT',
      body: { completed: !item.completed },
    })
    const idx = checklistItems.value.findIndex(i => i.id === item.id)
    if (idx >= 0) checklistItems.value[idx] = res.data
  } catch {}
}

async function deleteChecklistItem(id: string) {
  try {
    await $api(`/topics/${selectedTopicId.value}/checklist/${id}`, { method: 'DELETE' })
    checklistItems.value = checklistItems.value.filter(i => i.id !== id)
  } catch {}
}

function reasonIcon(reason: string): string {
  const map: Record<string, string> = { confused: '🔄', didnt_know: '❓', forgot: '🧠', silly_mistake: '😅' }
  return map[reason] ?? '❌'
}

function cardStateLabel(state: string): string {
  const map: Record<string, string> = { review: 'Dominado', learning: 'Aprendendo', relearning: 'Reaprendendo', new: 'Novo' }
  return map[state] ?? state
}

function selectNote(note: Note) {
  flushPendingSave()
  noteStore.current = note
  noteTitle.value = note.title
  noteContent.value = note.content
}

async function createNote() {
  if (!selectedTopicId.value) return
  const note = await noteStore.create(selectedTopicId.value, { title: 'Nova nota' })
  selectNote(note)
  await topicStore.fetchTree()
}

async function deleteNote() {
  if (!noteStore.current) return
  await noteStore.remove(noteStore.current.id)
  toast.show('Nota excluída.', 'success')
  await topicStore.fetchTree()
}

function openCreate(parentId: string | null) {
  createParentId.value = parentId
  newTopicName.value = ''
  showCreateTopic.value = true
}

function openEdit(topic: Topic) {
  editTopicId.value = topic.id
  editTopicName.value = topic.name
  showEditTopic.value = true
}

function openDelete(topic: Topic) {
  deleteTopicId.value = topic.id
  showDeleteTopic.value = true
}

async function handleCreateTopic() {
  await topicStore.create({ name: newTopicName.value, parent_id: createParentId.value })
  showCreateTopic.value = false
  toast.show('Tópico criado!', 'success')
}

async function handleEditTopic() {
  if (!editTopicId.value) return
  await topicStore.update(editTopicId.value, { name: editTopicName.value })
  showEditTopic.value = false
  toast.show('Tópico atualizado!', 'success')
}

async function handleDeleteTopic() {
  if (!deleteTopicId.value) return
  await topicStore.remove(deleteTopicId.value)
  if (selectedTopicId.value === deleteTopicId.value) selectedTopicId.value = null
  showDeleteTopic.value = false
  toast.show('Tópico deletado.', 'success')
}

function openNoteToCard() {
  if (import.meta.client) {
    selectedText.value = window.getSelection()?.toString() ?? ''
  }
  showNoteToCard.value = true
}

async function onCardCreated() {
  await topicStore.fetchTree()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

onMounted(async () => {
  await topicStore.fetchTree()
  const route = useRoute()
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
  }
})
</script>
