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
        <!-- Notes header -->
        <div class="flex items-center justify-between p-4 border-b border-base">
          <h2 class="text-headline truncate">{{ selectedTopicName }}</h2>
          <button class="btn-secondary" @click="createNote">
            <FilePlus :size="16" /> Nova nota
          </button>
        </div>

        <!-- Notes list + editor -->
        <div class="flex flex-1 overflow-hidden">
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
                :class="noteStore.current?.id === note.id ? 'bg-primary-500/15 text-primary-400' : 'text-base-secondary hover:bg-surface-tertiary'"
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
              class="text-title bg-transparent border-none outline-none mb-4 text-base-primary"
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
              <button class="text-micro text-danger hover:underline" @click="deleteNote">Excluir nota</button>
            </div>
          </div>
          <div v-else class="flex-1 flex items-center justify-center text-base-muted text-small">
            Selecione ou crie uma nota.
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
import { Plus, FilePlus, Zap } from 'lucide-vue-next'
import type { Topic, Note } from '~/types'

const topicStore = useTopicStore()
const noteStore = useNoteStore()
const toast = useToast()

const selectedTopicId = ref<string | null>(null)
const noteTitle = ref('')
const noteContent = ref<Record<string, any> | null>(null)
const selectedText = ref('')

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

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (noteStore.current) {
      noteStore.update(noteStore.current.id, { content: noteContent.value })
    }
  }, 1000)
}

function saveTitle() {
  if (noteStore.current && noteTitle.value !== noteStore.current.title) {
    noteStore.update(noteStore.current.id, { title: noteTitle.value })
  }
}

function selectTopic(id: string) {
  selectedTopicId.value = id
  noteStore.current = null
  noteStore.fetchForTopic(id)
}

function selectNote(note: Note) {
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

onMounted(() => {
  topicStore.fetchTree()
})
</script>
