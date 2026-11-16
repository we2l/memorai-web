<template>
  <UiSheet v-model="open" :title="step === 'text' ? 'Colar texto' : 'Adicionar'" :description="description" :side="wide ? 'right' : 'bottom'">
    <div v-if="!topicStore.tree.length && topicStore.loading" class="flex flex-col gap-2" aria-busy="true">
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </div>

    <template v-else>
      <!-- Without a caderno of its own, "Caderno novo" is the default: it is made with the first material (H3) -->
      <UiSelect v-if="topicOptions.length > 1" v-model="topicId" :options="topicOptions" label="Gravar em" class="mb-3" />

      <ul v-if="step === 'menu'" class="-mx-3 flex flex-col" aria-label="O que adicionar">
        <li v-for="opt in options" :key="opt.kind">
          <UiListRow as="button" :title="opt.label" :meta="opt.meta" :disabled="(!topicId && opt.kind !== 'anki') || creating" @click="choose(opt.kind)">
            <template #leading>
              <span class="flex size-9 items-center justify-center rounded-control bg-soft text-fg-muted" aria-hidden="true">
                <component :is="opt.icon" class="size-4.5" />
              </span>
            </template>
            <template v-if="opt.kbd" #trailing><kbd class="rounded-tag bg-soft px-1.5 text-label shadow-0">{{ opt.kbd }}</kbd></template>
          </UiListRow>
        </li>
      </ul>
      <!-- The trial opens on the first material (prd-planos-lancamento RF-F2) -->
      <p v-if="step === 'menu' && trialHint" class="mt-3 rounded-row bg-soft px-3 py-2 text-meta text-fg" data-testid="add-trial">{{ trialHint }}.</p>
      <UiCheckbox v-if="step === 'menu'" v-model="autoCards" class="mt-3" label="Gerar cards automaticamente" description="Usa 1 geração para o material todo (as 4 primeiras partes)." />

      <form v-else class="flex flex-col gap-3" @submit.prevent="saveText">
        <UiTextarea
          ref="textRef"
          v-model="text"
          label="Texto"
          :rows="8"
          hint="Vira uma nota no caderno; a 1ª linha é o título."
          placeholder="Cole aqui um resumo, um trecho da apostila ou suas anotações..."
          @keydown.ctrl.enter="saveText"
          @keydown.meta.enter="saveText"
        />
        <div class="flex flex-wrap justify-end gap-2">
          <UiButton variant="ghost" @click="step = 'menu'">Voltar</UiButton>
          <UiButton type="submit" variant="primary" :loading="saving || creating" :disabled="!text.trim()">Salvar nota</UiButton>
        </div>
      </form>
    </template>

    <input ref="pdfInput" type="file" accept=".pdf,application/pdf" class="hidden" tabindex="-1" aria-hidden="true" @change="onFile($event, 'pdf')">
    <input ref="photoInput" type="file" accept="image/*" class="hidden" tabindex="-1" aria-hidden="true" @change="onFile($event, 'photo')">
  </UiSheet>
</template>

<script setup lang="ts">
// "+ Adicionar" of the shell (prd-navegacao-v3 RF-5, tasks 4.1/4.2; scope of /cadernos/{id}, prd-4b-caderno-v3 RF-F10): PDF, Colar texto, Questão que errei
// (prd-questao-errada), Foto, Nota em branco and Importar do Anki, each one the flow that already exists. It writes into the open scope (the caderno
// or matéria of the route), else the last one used, else the first caderno. Replaces the FAB "Anotar" and
// the QuickCapture modal: the pasted text is the old quick note, the blank note opens the editor (Alt+N).
// PDF, photo and blank note run on the caderno screen (useAddIntent); the text is saved here.
// Without a caderno of its own (none, or only the onboarding sample), "Gravar em" starts on "Caderno novo": the caderno
// is made with the first material, named after the PDF or "Meu caderno" (prd-ativacao-material-proprio H3). A caderno
// in the exam mode also offers "Mandar o edital" (H6), which builds its own caderno.
import type { Component } from 'vue'
import { Camera, ClipboardPaste, ClipboardX, Download, FileText, FileUp, PenLine } from 'lucide-vue-next'
import type { AddIntent, AddKind } from '~/composables/useAddSheet'
import { readAutoCardsPref, writeAutoCardsPref } from '~/utils/autoCardsPref'

const { open, preset } = useAddSheet()
const trialHint = useTrialInvite()
const intent = useAddIntent()
const topicStore = useTopicStore()
const route = useRoute()
const { $api } = useNuxtApp()
const toast = useToast()
const pasteQuestion = usePasteQuestion()

type MenuKind = AddKind | 'edital'
const OPTIONS: { kind: MenuKind, label: string, meta: string, icon: Component, kbd?: string }[] = [
  { kind: 'pdf', label: 'PDF', meta: 'A IA resume e organiza em partes', icon: FileUp },
  { kind: 'text', label: 'Colar texto', meta: 'Um resumo ou trecho vira uma nota', icon: ClipboardPaste },
  { kind: 'question', label: 'Questão que errei', meta: 'Cole do Qconcursos, do TEC ou de uma prova: vira card', icon: ClipboardX },
  { kind: 'photo', label: 'Foto', meta: 'De uma página: a IA sugere os cards', icon: Camera },
  { kind: 'note', label: 'Nota em branco', meta: 'Abre o editor', icon: PenLine, kbd: 'Alt N' },
  { kind: 'anki', label: 'Importar do Anki', meta: 'Arquivo .apkg, com os cards e os intervalos', icon: Download },
]
const EDITAL: typeof OPTIONS[number] = { kind: 'edital', label: 'Mandar o edital', meta: 'O Baigi monta as matérias e os assuntos, e marca a data da prova.', icon: FileText }

// "Criar cards automaticamente" of the PDF, explicit and remembered (prd-4b-caderno-v3 RF-F10)
const autoCards = ref(readAutoCardsPref())
watch(autoCards, writeAutoCardsPref)

const step = ref<'menu' | 'text'>('menu')
const text = ref('')
const saving = ref(false)
const topicId = ref('')
const textRef = ref<{ focus: () => void } | null>(null)
const pdfInput = ref<HTMLInputElement | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)

const wide = ref(false)
onMounted(() => { wide.value = window.matchMedia('(min-width: 768px)').matches })

const auth = useAuthStore()
const ownNotebook = computed(() => hasOwnNotebook(topicStore.tree))
/** Cadernos and their matérias/assuntos, indented by depth (a native <select>); "Caderno novo" first without one of its own. */
const topicOptions = computed(() => [
  ...(ownNotebook.value ? [] : [{ value: NEW_NOTEBOOK, label: 'Caderno novo' }]),
  ...topicTreeOptions(topicStore.tree),
])
const isNew = computed(() => topicId.value === NEW_NOTEBOOK)

const topicName = computed(() => topicStore.findById(topicId.value)?.name ?? '')
const description = computed(() => {
  if (isNew.value) return 'Cria um caderno com o que você adicionar'
  return topicName.value ? `Grava em ${topicName.value}` : undefined
})

/** The caderno of the target is in the exam mode (or the new one, from the account's mode): the edital fits (H6). */
const examTarget = computed(() => {
  if (isNew.value) return auth.user?.default_learning_mode === 'exam'
  const id = topicId.value
  if (!id) return false
  const root = topicStore.tree.find(t => t.id === id || isUnder(t, id))
  return root?.learning_mode === 'exam'
})
function isUnder(root: { id: string; children?: { id: string; children?: unknown[] }[] | null }, id: string): boolean {
  return (root.children ?? []).some(c => c.id === id || isUnder(c as typeof root, id))
}
const options = computed(() => (examTarget.value ? [...OPTIONS.slice(0, 1), EDITAL, ...OPTIONS.slice(1)] : OPTIONS))

/** The open scope, else the last used (never the sample while there is no caderno of its own), else the first caderno. */
function pickScope() {
  const known = (id: string | null) => (id && topicStore.findById(id) ? id : null)
  const scope = known(scopeTopicOfRoute(route))
  if (!ownNotebook.value) {
    topicId.value = scope ?? NEW_NOTEBOOK
    return
  }
  topicId.value = scope ?? known(lastAddTopic()) ?? topicStore.tree.find(t => !t.is_sample)?.id ?? topicStore.tree[0]?.id ?? ''
}

/** H3: the caderno made with the first material; null when it failed (the sheet stays open with a toast). */
const creating = ref(false)
async function ensureTopic(kind: 'pdf' | 'text' | 'question' | 'photo' | 'note', fileName?: string): Promise<string | null> {
  if (!isNew.value) return topicId.value
  creating.value = true
  try {
    const topic = await topicStore.create({ name: autoNotebookName(fileName), learning_mode: notebookModeOf(auth.user?.default_learning_mode) })
    useAnalytics().track('notebook_auto_created', { kind })
    topicId.value = topic.id
    return topic.id as string
  } catch (err) {
    reportApiError(err, { error: 'Não foi possível criar o caderno. Tente de novo.' })
    return null
  } finally {
    creating.value = false
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    step.value = 'menu'
    text.value = ''
    return
  }
  if (!topicStore.tree.length && !topicStore.loading) await topicStore.fetchTree()
  pickScope()
  if (preset.value) {
    const kind = preset.value
    preset.value = null
    if (kind === 'note' || kind === 'text' || kind === 'question') choose(kind)
  }
}, { immediate: true })
// The tree may arrive after the sheet opened
watch(() => topicStore.tree, () => { if (open.value && !topicId.value) pickScope() })

/** The hub of the scope runs the flow (and its material list shows the new line on top). */
function handOff(next: AddIntent) {
  rememberAddTopic(next.topicId)
  intent.value = next
  open.value = false
  const hub = cadernoPath(next.topicId)
  if (route.path !== hub) void navigateTo(hub)
}

async function choose(kind: MenuKind) {
  if ((!topicId.value && kind !== 'anki') || creating.value) return
  if (kind === 'edital') {
    open.value = false
    void navigateTo('/cadernos/edital?from=add_sheet')
  }
  else if (kind === 'pdf') pdfInput.value?.click()
  else if (kind === 'photo') photoInput.value?.click()
  else if (kind === 'note') {
    const id = await ensureTopic('note')
    if (id) handOff({ kind: 'note', topicId: id })
  }
  else if (kind === 'question') {
    const id = await ensureTopic('question')
    if (!id) return
    // The sheet of the question takes over, in the place chosen here
    rememberAddTopic(id)
    open.value = false
    pasteQuestion.show('add', id)
  }
  else if (kind === 'anki') {
    open.value = false
    // A new caderno: the import makes it (no topic_id)
    void navigateTo(topicId.value && !isNew.value ? `/importar?topic_id=${topicId.value}` : '/importar')
  } else {
    step.value = 'text'
    nextTick(() => requestAnimationFrame(() => textRef.value?.focus()))
  }
}

async function onFile(e: Event, kind: 'pdf' | 'photo') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !topicId.value) return
  const id = await ensureTopic(kind, kind === 'pdf' ? file.name : undefined)
  if (id) handOff({ kind, topicId: id, file, ...(kind === 'pdf' ? { autoCards: autoCards.value } : {}) })
}

/** The old quick note: paragraphs of the text, the first line as the title. */
async function saveText() {
  const body = text.value.trim()
  if (!body || !topicId.value || saving.value) return
  const target = await ensureTopic('text')
  if (!target) return
  saving.value = true
  try {
    const title = body.split('\n')[0]!.slice(0, 80) || 'Texto colado'
    const content = {
      type: 'doc',
      content: body.split('\n').filter(l => l.trim()).map(p => ({ type: 'paragraph', content: [{ type: 'text', text: p }] })),
    }
    const res = await $api<{ data: { id: string } }>(`/topics/${target}/notes`, { method: 'POST', body: { title, content } })
    rememberAddTopic(target)
    open.value = false
    toast.show(`Nota salva em ${topicName.value || 'seu caderno'}.`, 'success', {
      action: { label: 'Abrir', onClick: () => { void navigateTo(cadernoPath(target, { note: res.data.id })) } },
    })
    void topicStore.fetchTree()
    // A hub on screen (this scope or one above it): its numbers and material list come again
    const scope = useScopeStore()
    if (scope.topicId && route.path === cadernoPath(scope.topicId)) void scope.refresh()
  } catch (err) {
    reportApiError(err, { error: 'Não foi possível salvar a nota. Tente de novo.' })
  } finally {
    saving.value = false
  }
}
</script>
