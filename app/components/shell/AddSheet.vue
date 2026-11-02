<template>
  <UiSheet v-model="open" :title="step === 'text' ? 'Colar texto' : 'Adicionar'" :description="description" :side="wide ? 'right' : 'bottom'">
    <div v-if="!topicOptions.length && topicStore.loading" class="flex flex-col gap-2" aria-busy="true">
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </div>

    <!-- No caderno yet: create one, or import an Anki deck (it creates the caderno) -->
    <div v-else-if="!topicOptions.length" class="flex flex-col items-start gap-3 py-2">
      <p class="text-body text-fg">Crie um caderno para guardar o que você adicionar.</p>
      <UiButton variant="primary" to="/cadernos?action=new-notebook" @click="open = false">Criar caderno</UiButton>
      <UiButton variant="ghost" :icon-left="Download" to="/importar" @click="open = false">Importar do Anki</UiButton>
    </div>

    <template v-else>
      <UiSelect v-model="topicId" :options="topicOptions" label="Gravar em" class="mb-3" />

      <ul v-if="step === 'menu'" class="-mx-3 flex flex-col" aria-label="O que adicionar">
        <li v-for="opt in OPTIONS" :key="opt.kind">
          <UiListRow as="button" :title="opt.label" :meta="opt.meta" :disabled="!topicId && opt.kind !== 'anki'" @click="choose(opt.kind)">
            <template #leading>
              <span class="flex size-9 items-center justify-center rounded-control bg-subtle text-fg-muted" aria-hidden="true">
                <component :is="opt.icon" class="size-4.5" />
              </span>
            </template>
            <template v-if="opt.kbd" #trailing><kbd class="rounded-tag border border-line px-1.5 text-label">{{ opt.kbd }}</kbd></template>
          </UiListRow>
        </li>
      </ul>

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
          <UiButton type="submit" variant="primary" :loading="saving" :disabled="!text.trim()">Salvar nota</UiButton>
        </div>
      </form>
    </template>

    <input ref="pdfInput" type="file" accept=".pdf,application/pdf" class="hidden" tabindex="-1" aria-hidden="true" @change="onFile($event, 'pdf')">
    <input ref="photoInput" type="file" accept="image/*" class="hidden" tabindex="-1" aria-hidden="true" @change="onFile($event, 'photo')">
  </UiSheet>
</template>

<script setup lang="ts">
// "+ Adicionar" of the shell (prd-navegacao-v3 RF-5, tasks 4.1/4.2): PDF, Colar texto, Foto, Nota em branco
// and Importar do Anki, each one the flow that already exists. It writes into the open scope (the caderno
// or matéria of the route), else the last one used, else the first caderno. Replaces the FAB "Anotar" and
// the QuickCapture modal: the pasted text is the old quick note, the blank note opens the editor (Alt+N).
// PDF, photo and blank note run on the caderno screen (useAddIntent); the text is saved here.
import type { Component } from 'vue'
import { Camera, ClipboardPaste, Download, FileUp, PenLine } from 'lucide-vue-next'
import type { AddIntent, AddKind } from '~/composables/useAddSheet'

const { open, preset } = useAddSheet()
const intent = useAddIntent()
const topicStore = useTopicStore()
const route = useRoute()
const { $api } = useNuxtApp()
const toast = useToast()

const OPTIONS: { kind: AddKind, label: string, meta: string, icon: Component, kbd?: string }[] = [
  { kind: 'pdf', label: 'PDF', meta: 'A IA resume, organiza em partes e cria os cards', icon: FileUp },
  { kind: 'text', label: 'Colar texto', meta: 'Um resumo ou trecho vira uma nota', icon: ClipboardPaste },
  { kind: 'photo', label: 'Foto', meta: 'De uma página: a IA sugere os cards', icon: Camera },
  { kind: 'note', label: 'Nota em branco', meta: 'Abre o editor', icon: PenLine, kbd: 'Alt N' },
  { kind: 'anki', label: 'Importar do Anki', meta: 'Arquivo .apkg: cria um caderno novo', icon: Download },
]

const step = ref<'menu' | 'text'>('menu')
const text = ref('')
const saving = ref(false)
const topicId = ref('')
const textRef = ref<{ focus: () => void } | null>(null)
const pdfInput = ref<HTMLInputElement | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)

const wide = ref(false)
onMounted(() => { wide.value = window.matchMedia('(min-width: 768px)').matches })

/** Cadernos and their matérias/assuntos, indented by depth (a native <select>). */
const topicOptions = computed(() => {
  const out: { value: string, label: string }[] = []
  const walk = (topics: typeof topicStore.tree, depth: number) => {
    for (const t of topics) {
      out.push({ value: t.id, label: `${'— '.repeat(depth)}${t.name}` })
      if (t.children?.length) walk(t.children, depth + 1)
    }
  }
  walk(topicStore.tree, 0)
  return out
})

const topicName = computed(() => topicStore.findById(topicId.value)?.name ?? '')
const description = computed(() => (topicName.value ? `Grava em ${topicName.value}` : undefined))

/** The open scope, else the last used, else the first caderno. */
function pickScope() {
  const known = (id: string | null) => (id && topicStore.findById(id) ? id : null)
  topicId.value = known(scopeTopicFromQuery(route.query)) ?? known(lastAddTopic()) ?? topicStore.tree[0]?.id ?? ''
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
    if (kind === 'note' || kind === 'text') choose(kind)
  }
}, { immediate: true })
// The tree may arrive after the sheet opened
watch(() => topicStore.tree, () => { if (open.value && !topicId.value) pickScope() })

function handOff(next: AddIntent) {
  rememberAddTopic(next.topicId)
  intent.value = next
  open.value = false
  if (!(route.path === '/cadernos' && route.query.topic === next.topicId)) void navigateTo(cadernoPath(next.topicId))
}

function choose(kind: AddKind) {
  if (!topicId.value && kind !== 'anki') return
  if (kind === 'pdf') pdfInput.value?.click()
  else if (kind === 'photo') photoInput.value?.click()
  else if (kind === 'note') handOff({ kind: 'note', topicId: topicId.value })
  else if (kind === 'anki') {
    open.value = false
    void navigateTo('/importar')
  } else {
    step.value = 'text'
    nextTick(() => requestAnimationFrame(() => textRef.value?.focus()))
  }
}

function onFile(e: Event, kind: 'pdf' | 'photo') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file && topicId.value) handOff({ kind, topicId: topicId.value, file })
}

/** The old quick note: paragraphs of the text, the first line as the title. */
async function saveText() {
  const body = text.value.trim()
  if (!body || !topicId.value || saving.value) return
  saving.value = true
  const target = topicId.value
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
    // Saved into the caderno on screen: its material list shows the new note
    if (route.path === '/cadernos' && route.query.topic === target) void useNoteStore().fetchForTopic(target)
  } catch (err) {
    reportApiError(err, { error: 'Não foi possível salvar a nota. Tente de novo.' })
  } finally {
    saving.value = false
  }
}
</script>
