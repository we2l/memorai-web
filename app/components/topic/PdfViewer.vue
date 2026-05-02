<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex flex-col bg-surface">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-base shrink-0">
          <p class="text-small font-medium text-base-primary truncate flex-1">📄 {{ filename }}</p>
          <div class="flex items-center gap-2">
            <button
              class="btn-primary !py-1.5 !px-3 text-small"
              @click="showCardPanel = !showCardPanel"
            >
              🃏 Criar card
            </button>
            <button class="p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-tertiary" aria-label="Fechar" @click="open = false">
              <X :size="18" />
            </button>
          </div>
        </div>

        <div class="flex flex-1 overflow-hidden">
          <!-- PDF -->
          <div class="flex-1 overflow-hidden">
            <iframe
              v-if="url"
              :src="url"
              class="w-full h-full border-0"
              title="Visualizador de PDF"
            />
          </div>

          <!-- Side panel: create card -->
          <Transition name="slide-right">
            <div v-if="showCardPanel" class="w-80 border-l border-base bg-surface-secondary p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
              <h3 class="text-label">Criar card do PDF</h3>
              <p class="text-micro text-base-muted">Copie o trecho do PDF e cole aqui.</p>

              <div>
                <label for="viewer-front" class="text-label mb-1 block">Frente</label>
                <textarea id="viewer-front" v-model="form.front" class="textarea-base" rows="4" placeholder="Cole o trecho ou escreva a pergunta..." />
              </div>
              <div>
                <label for="viewer-back" class="text-label mb-1 block">Verso</label>
                <textarea id="viewer-back" v-model="form.back" class="textarea-base" rows="4" placeholder="Resposta..." />
              </div>
              <div>
                <label class="text-label mb-1 block">Deck</label>
                <UiSelect v-model="form.deck_id" :options="deckOptions" placeholder="Selecione um deck" />
              </div>
              <button
                class="btn-primary w-full justify-center"
                :disabled="!form.front || !form.back || !form.deck_id || saving"
                @click="createCard"
              >
                {{ saving ? 'Salvando...' : 'Criar card' }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = defineProps<{
  url: string
  filename: string
  topicId: string
}>()

const open = defineModel<boolean>({ required: true })
const showCardPanel = ref(false)

const { $api } = useNuxtApp()
const deckStore = useDeckStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ front: '', back: '', deck_id: '' })

const deckOptions = computed(() =>
  deckStore.decks.map(d => ({ value: d.id, label: d.name })),
)

watch(showCardPanel, (val) => {
  if (val && !deckStore.decks.length) deckStore.fetchDecks()
})

async function createCard() {
  saving.value = true
  try {
    await $api('/flashcards', {
      method: 'POST',
      body: {
        front: form.front,
        back: form.back,
        deck_id: form.deck_id,
        topic_id: props.topicId,
      },
    })
    toast.show('Card criado!', 'success')
    form.front = ''
    form.back = ''
  } catch {
    toast.show('Erro ao criar card.', 'error')
  } finally {
    saving.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value && !showCardPanel.value) open.value = false
  if (e.key === 'Escape' && showCardPanel.value) showCardPanel.value = false
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); opacity: 0; }
</style>
