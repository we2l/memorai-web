<template>
  <UiDialog v-model="open" :title="filename" size="xl" :description="totalPages ? `${totalPages} páginas · página ${currentPage}` : undefined">
    <div
      ref="scrollContainer"
      class="-mx-5 h-[75dvh] select-text overflow-y-auto bg-soft px-3 py-4 sm:-mx-6"
      data-testid="pdf-pages"
      tabindex="0"
      role="region"
      aria-label="Páginas do PDF"
      @scroll.passive="onScroll"
      @mouseup="readSelection"
      @keyup="readSelection"
      @touchend="readSelection"
    >
      <p v-if="loading" class="py-16 text-center text-meta text-fg-muted" role="status">Carregando o PDF…</p>
      <p v-else-if="error" class="py-16 text-center text-meta text-danger" role="alert">{{ error }}</p>
      <div class="flex flex-col items-center gap-4">
        <div
          v-for="n in totalPages"
          :key="n"
          :ref="el => setPageRef(el, n)"
          class="relative max-w-full bg-raised shadow-1"
          :style="{ width: `${sizeOf(n).w}px`, height: `${sizeOf(n).h}px` }"
          :data-page="n"
          :data-drawn="drawn.has(n) ? '1' : undefined"
          :aria-label="`Página ${n}`"
          role="group"
        >
          <canvas :ref="el => setCanvasRef(el, n)" class="block" />
          <div :ref="el => setTextRef(el, n)" class="textLayer" />
        </div>
      </div>
    </div>

    <template #footer>
      <span class="mr-auto text-meta text-fg-muted">{{ selection ? 'Trecho selecionado' : 'Selecione um trecho para criar um card' }}</span>
      <UiButton :disabled="!selection" :icon-left="Zap" @click="onCreateCard">Criar card do trecho</UiButton>
    </template>
  </UiDialog>

  <!-- Card from the selection of the PDF: the note it came from is its origin -->
  <UiDialog v-model="showCardModal" title="Criar card" size="md">
    <form id="pdf-card-form" class="flex flex-col gap-4" @submit.prevent="submitCard">
      <UiTextarea v-model="cardForm.front" label="Frente" :rows="3" placeholder="Pergunta..." />
      <UiTextarea v-model="cardForm.back" label="Verso" :rows="3" placeholder="Resposta..." />
      <p v-if="notebookName" class="text-meta text-fg-muted">Caderno: <span class="font-medium text-fg-strong">{{ notebookName }}</span></p>
    </form>
    <template #footer="{ close }">
      <UiButton variant="ghost" @click="close">Cancelar</UiButton>
      <UiButton type="submit" form="pdf-card-form" variant="primary" :loading="saving" :disabled="!cardForm.front || !cardForm.back">Criar card</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// The PDF of a material (prd-4c-material-v3 RF-F6): opens on a page (`page`, from "Ver no PDF (p. X)" and
// the "(pág. X)" links of the text) and draws only the pages on screen plus one on each side
// (IntersectionObserver over placeholders the size of the first page). A page that goes far is released
// (its canvas emptied), so scrolling a 600-page PDF never holds hundreds of canvases. The card made from
// a selection carries the open note as its origin (RF-B4). The file comes from the 15-minute signed URL.
import { Zap } from 'lucide-vue-next'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

const props = defineProps<{
  url: string
  filename: string
  topicId: string
  /** The note the PDF belongs to: origin of the card made from a selection */
  noteId?: string | null
  /** Page to open on (1-based) */
  page?: number | null
}>()

const open = defineModel<boolean>({ required: true })

const loading = ref(true)
const error = ref('')
const totalPages = ref(0)
const currentPage = ref(1)
/** Pages whose canvas is drawn right now */
const drawn = reactive(new Set<number>())
const baseSize = ref({ w: 0, h: 0 })
const sizes = reactive(new Map<number, { w: number; h: number }>())
const scrollContainer = ref<HTMLElement | null>(null)
const pageRefs = new Map<number, HTMLElement>()
const canvasRefs = new Map<number, HTMLCanvasElement>()
const textRefs = new Map<number, HTMLElement>()
const tasks = new Map<number, RenderTask>()
const GAP = 16

let pdf: PDFDocumentProxy | null = null
let scale = 1.5
let observer: IntersectionObserver | null = null
let loadSeq = 0

const sizeOf = (n: number) => sizes.get(n) ?? baseSize.value

function setPageRef(el: unknown, n: number) { if (el) pageRefs.set(n, el as HTMLElement) }
function setCanvasRef(el: unknown, n: number) { if (el) canvasRefs.set(n, el as HTMLCanvasElement) }
function setTextRef(el: unknown, n: number) { if (el) textRefs.set(n, el as HTMLElement) }

// Selection + card creation
const selection = ref('')
const showCardModal = ref(false)
const cardForm = reactive({ front: '', back: '' })
const saving = ref(false)

const { $api } = useNuxtApp()
const topicStore = useTopicStore()
const toast = useToast()

// POST /flashcards infers the deck from the topic (RF-B7)
const notebookName = computed(() => topicStore.rootOf(props.topicId)?.name ?? '')

function readSelection() {
  const sel = window.getSelection()
  const inside = !!sel && !sel.isCollapsed && !!scrollContainer.value?.contains(sel.anchorNode)
  selection.value = inside ? sel!.toString().replace(/\s+/g, ' ').trim() : ''
}

function onCreateCard() {
  cardForm.front = selection.value
  cardForm.back = ''
  showCardModal.value = true
}

async function submitCard() {
  saving.value = true
  try {
    await $api('/flashcards', {
      method: 'POST',
      body: { front: cardForm.front, back: cardForm.back, topic_id: props.topicId, ...(props.noteId ? { source_note_id: props.noteId } : {}) },
    })
    toast.show('Card criado!', 'success')
    showCardModal.value = false
  } catch (e) {
    reportApiError(e, { error: extractApiMessage(e, 'Não foi possível criar o card.') })
  } finally {
    saving.value = false
  }
}

// === Drawing on demand ===
async function draw(n: number) {
  if (!pdf || drawn.has(n) || tasks.has(n)) return
  const canvas = canvasRefs.get(n)
  const textDiv = textRefs.get(n)
  if (!canvas || !textDiv) return
  const page = await pdf.getPage(n)
  const viewport = page.getViewport({ scale })
  sizes.set(n, { w: viewport.width, h: viewport.height })
  canvas.width = viewport.width
  canvas.height = viewport.height
  const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport })
  tasks.set(n, task)
  drawn.add(n)
  try {
    await task.promise
    textDiv.replaceChildren()
    textDiv.style.width = `${viewport.width}px`
    textDiv.style.height = `${viewport.height}px`
    const { TextLayer } = await import('pdfjs-dist')
    await new TextLayer({ textContentSource: await page.getTextContent(), container: textDiv, viewport }).render()
  } catch {
    // Cancelled (the page left the screen) or a broken page: drawn again when it comes back
    drawn.delete(n)
  } finally {
    tasks.delete(n)
  }
}

function release(n: number) {
  tasks.get(n)?.cancel()
  tasks.delete(n)
  if (!drawn.has(n)) return
  drawn.delete(n)
  const canvas = canvasRefs.get(n)
  if (canvas) { canvas.width = 0; canvas.height = 0 }
  textRefs.get(n)?.replaceChildren()
}

function observe() {
  observer?.disconnect()
  const root = scrollContainer.value
  if (!root) return
  // One page of slack above and below the screen: the visible pages plus one on each side
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const n = Number((e.target as HTMLElement).dataset.page)
      if (e.isIntersecting) void draw(n)
      else release(n)
    }
  }, { root, rootMargin: `${Math.round(baseSize.value.h)}px 0px` })
  for (const el of pageRefs.values()) observer.observe(el)
}

function offsetOf(n: number): number {
  let top = 16
  for (let i = 1; i < n; i++) top += sizeOf(i).h + GAP
  return top
}

function scrollToPage(n: number) {
  const root = scrollContainer.value
  if (!root || !totalPages.value) return
  const target = Math.min(Math.max(1, Math.round(n)), totalPages.value)
  root.scrollTop = offsetOf(target) - 16
  currentPage.value = target
}

let frame = 0
function onScroll() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const root = scrollContainer.value
    if (!root) return
    const middle = root.scrollTop + root.clientHeight / 3
    let n = 1
    while (n < totalPages.value && offsetOf(n + 1) <= middle) n++
    currentPage.value = n
  })
}

async function load() {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  teardown()
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    const doc = await pdfjsLib.getDocument(props.url).promise
    if (seq !== loadSeq) return void doc.destroy()
    pdf = doc
    // Every placeholder takes the size of the first page (a page drawn later corrects its own)
    const first = (await doc.getPage(1)).getViewport({ scale: 1 })
    const room = Math.max(280, (scrollContainer.value?.clientWidth ?? 900) - 24)
    scale = Math.min(1.5, room / first.width)
    baseSize.value = { w: first.width * scale, h: first.height * scale }
    totalPages.value = doc.numPages
    loading.value = false
    await nextTick()
    scrollToPage(props.page ?? 1)
    observe()
  } catch (e) {
    if (seq !== loadSeq) return
    error.value = 'Não foi possível abrir o PDF.'
    reportApiError(e, { silent: true })
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function teardown() {
  observer?.disconnect()
  observer = null
  for (const t of tasks.values()) t.cancel()
  tasks.clear()
  drawn.clear()
  sizes.clear()
  pageRefs.clear()
  canvasRefs.clear()
  textRefs.clear()
  totalPages.value = 0
  void pdf?.destroy()
  pdf = null
}

watch(open, (val) => {
  if (val && props.url) nextTick(load)
  else if (!val) { loadSeq++; teardown() }
}, { immediate: true }) // lazy-mounted already open

// Open again on another page (a link in the text while the viewer is mounted)
watch(() => props.page, (n) => { if (open.value && n && totalPages.value) scrollToPage(n) })

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  loadSeq++
  teardown()
})
</script>

<style>
/* pdf.js text layer (its own DOM, no classes to put utilities on): transparent text over the canvas, for
   the selection */
.textLayer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  line-height: 1;
  text-align: initial;
}
.textLayer span,
.textLayer br {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}
.textLayer span::selection {
  background: color-mix(in srgb, var(--state-warning) 35%, transparent);
}
</style>
