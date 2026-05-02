<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-surface flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-base shrink-0">
          <p class="text-small font-medium text-base-primary truncate">📄 {{ filename }}</p>
          <button class="p-1.5 rounded-lg text-base-muted hover:text-base-primary hover:bg-surface-tertiary" aria-label="Fechar" @click="open = false">
            <X :size="18" />
          </button>
        </div>

        <!-- PDF via iframe (supports native text selection) -->
        <div class="flex-1 overflow-hidden">
          <iframe
            v-if="url"
            :src="url"
            class="w-full h-full border-0"
            title="Visualizador de PDF"
          />
        </div>

        <!-- Tip -->
        <div class="px-4 py-2 border-t border-base text-micro text-base-muted shrink-0">
          💡 Selecione texto no PDF e use o botão flutuante para criar cards
        </div>

        <!-- Selection toolbar -->
        <UiSelectionToolbar ref="toolbar" @create-card="onCreateCard" />

        <!-- Card creation modal -->
        <TopicPdfToCardModal
          v-model="showCardModal"
          :selected-text="selectedText"
          :topic-id="topicId"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  url: string
  filename: string
  topicId: string
}>()

const open = defineModel<boolean>({ required: true })
const toolbar = ref<{ lastSelection: string } | null>(null)
const showCardModal = ref(false)
const selectedText = ref('')

function onCreateCard() {
  selectedText.value = toolbar.value?.lastSelection || ''
  showCardModal.value = true
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>
