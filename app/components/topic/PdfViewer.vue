<template>
  <UiModal v-model="open" size="lg" aria-label="Visualizar PDF">
    <div class="flex flex-col" style="height: 80vh;">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-base shrink-0">
        <p class="text-small font-medium text-base-primary truncate flex-1">📄 {{ filename }}</p>
        <div class="flex items-center gap-2 text-micro text-base-muted">
          <span v-if="totalPages">{{ currentPage }}/{{ totalPages }}</span>
        </div>
      </div>

      <!-- PDF pages -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        <div v-if="loading" class="flex items-center justify-center h-full">
          <p class="text-base-muted">Carregando PDF...</p>
        </div>
        <div v-if="error" class="flex items-center justify-center h-full">
          <p class="text-danger text-small">{{ error }}</p>
        </div>
        <div
          v-for="page in renderedPages"
          :key="page.num"
          class="relative mx-auto bg-white rounded shadow-md"
          :style="{ width: page.width + 'px' }"
        >
          <canvas :ref="el => setCanvasRef(el, page.num)" />
          <div
            :ref="el => setTextRef(el, page.num)"
            class="absolute inset-0 select-text"
            style="overflow: hidden; opacity: 0.3; line-height: 1;"
          />
        </div>
      </div>
    </div>

    <!-- Selection toolbar -->
    <UiSelectionToolbar ref="toolbar" @create-card="onCreateCard" />

    <!-- Card creation modal -->
    <UiModal v-model="showCardModal" size="md" aria-label="Criar card do PDF">
      <h2 class="text-headline mb-4">Criar card</h2>
      <form class="flex flex-col gap-4" @submit.prevent="submitCard">
        <div>
          <label for="pdf-front" class="text-label mb-1 block">Frente</label>
          <textarea id="pdf-front" v-model="cardForm.front" class="textarea-base" rows="3" placeholder="Pergunta..." />
        </div>
        <div>
          <label for="pdf-back" class="text-label mb-1 block">Verso</label>
          <textarea id="pdf-back" v-model="cardForm.back" class="textarea-base" rows="3" placeholder="Resposta..." />
        </div>
        <div>
          <label class="text-label mb-1 block">Deck</label>
          <UiSelect v-model="cardForm.deck_id" :options="deckOptions" placeholder="Selecione um deck" />
        </div>
        <div class="flex gap-3 justify-end">
          <button type="button" class="btn-secondary" @click="showCardModal = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="!cardForm.front || !cardForm.back || !cardForm.deck_id || saving">
            {{ saving ? 'Salvando...' : 'Criar card' }}
          </button>
        </div>
      </form>
    </UiModal>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  url: string
  filename: string
  topicId: string
}>()

const open = defineModel<boolean>({ required: true })

const loading = ref(true)
const error = ref('')
const totalPages = ref(0)
const currentPage = ref(1)
const renderedPages = ref<{ num: number; width: number; height: number }[]>([])
const canvasRefs = new Map<number, HTMLCanvasElement>()
const textRefs = new Map<number, HTMLElement>()
const scrollContainer = ref<HTMLElement | null>(null)

function setCanvasRef(el: any, num: number) { if (el) canvasRefs.set(num, el as HTMLCanvasElement) }
function setTextRef(el: any, num: number) { if (el) textRefs.set(num, el as HTMLElement) }

// Selection + card creation
const toolbar = ref<{ lastSelection: string } | null>(null)
const showCardModal = ref(false)
const cardForm = reactive({ front: '', back: '', deck_id: '' })
const saving = ref(false)

const { $api } = useNuxtApp()
const deckStore = useDeckStore()
const toast = useToast()

const deckOptions = computed(() =>
  deckStore.decks.map(d => ({ value: d.id, label: d.name })),
)

function onCreateCard() {
  cardForm.front = toolbar.value?.lastSelection || ''
  cardForm.back = ''
  showCardModal.value = true
  if (!deckStore.decks.length) deckStore.fetchDecks()
}

async function submitCard() {
  saving.value = true
  try {
    await $api('/flashcards', {
      method: 'POST',
      body: { front: cardForm.front, back: cardForm.back, deck_id: cardForm.deck_id, topic_id: props.topicId },
    })
    toast.show('Card criado!', 'success')
    showCardModal.value = false
  } catch {
    toast.show('Erro ao criar card.', 'error')
  } finally {
    saving.value = false
  }
}

// PDF rendering
async function renderPdf() {
  loading.value = true
  error.value = ''

  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

    const pdf = await pdfjsLib.getDocument(props.url).promise
    totalPages.value = pdf.numPages

    const scale = 1.5
    const pages: { num: number; width: number; height: number }[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })
      pages.push({ num: i, width: viewport.width, height: viewport.height })
    }

    renderedPages.value = pages

    await nextTick()

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })

      // Render canvas
      const canvas = canvasRefs.get(i)
      if (canvas) {
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
      }

      // Render text layer for selection
      const textDiv = textRefs.get(i)
      if (textDiv) {
        textDiv.style.width = viewport.width + 'px'
        textDiv.style.height = viewport.height + 'px'

        const textContent = await page.getTextContent()
        const { TextLayer } = await import('pdfjs-dist')
        const textLayer = new TextLayer({
          textContentSource: textContent,
          container: textDiv,
          viewport,
        })
        await textLayer.render()
      }
    }
  } catch (e: any) {
    error.value = 'Erro ao carregar PDF.'
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(open, (val) => {
  if (val && props.url) {
    canvasRefs.clear()
    textRefs.clear()
    renderedPages.value = []
    nextTick(() => renderPdf())
  }
})
</script>

<style>
/* pdfjs text layer styles */
.textLayer {
  position: absolute;
  text-align: initial;
  inset: 0;
  overflow: hidden;
  opacity: 0.3;
  line-height: 1;
}
.textLayer span,
.textLayer br {
  color: transparent;
  position: absolute;
  white-space: pre;
  transform-origin: 0% 0%;
}
.textLayer span::selection {
  background: rgba(217, 119, 6, 0.3);
}
</style>
