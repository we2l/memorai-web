<template>
  <UiSection :title="title" description="O que você colocar aqui vira nota, cards e revisão." data-testid="scope-empty">
    <ul class="grid gap-2 sm:flex sm:flex-wrap">
      <li v-for="opt in OPTIONS" :key="opt.kind">
        <UiButton
          :variant="opt.kind === 'pdf' ? 'primary' : 'secondary'"
          :icon-left="opt.icon"
          block
          class="sm:w-auto"
          :to="opt.kind === 'anki' ? `/importar?topic_id=${topicId}` : undefined"
          :data-testid="`empty-${opt.kind}`"
          @click="choose(opt.kind)"
        >
          {{ opt.label }}
        </UiButton>
      </li>
    </ul>
    <UiCheckbox v-model="autoCards" class="mt-4" label="Gerar cards automaticamente" description="A IA lê o PDF, resume em partes e já cria os cards." />
    <p v-if="canAddSubject" class="mt-3 text-meta text-fg-muted">
      Quer organizar antes, como no edital?
      <button type="button" class="min-h-touch font-medium text-action-fg underline-offset-2 hover:underline" data-testid="scope-add-subject" @click="$emit('add-subject')">
        {{ isRoot ? 'Criar uma matéria' : 'Criar um assunto' }}
      </button>
    </p>
    <p class="mt-1 text-meta text-fg-muted">
      Prefere escrever os cards? <UiLink :to="`${cadernoPath(topicId, { view: 'cards' })}?new=1`" data-testid="empty-card">Criar um card à mão</UiLink>
    </p>

    <input ref="pdfInput" type="file" accept=".pdf,application/pdf" class="hidden" tabindex="-1" aria-hidden="true" @change="onFile($event, 'pdf')">
    <input ref="photoInput" type="file" accept="image/*" class="hidden" tabindex="-1" aria-hidden="true" @change="onFile($event, 'photo')">
  </UiSection>
</template>

<script setup lang="ts">
// The empty scope (prd-4b-caderno-v3 RF-F12): ONE block "Adicionar ao caderno" with the 5 options of
// "+ Adicionar" in a row, the primary on "Enviar PDF". Replaces the StartCard and the 2nd empty state.
import type { Component } from 'vue'
import { Camera, ClipboardPaste, Download, FileUp, PenLine } from 'lucide-vue-next'
import { readAutoCardsPref, writeAutoCardsPref } from '~/utils/autoCardsPref'

const props = defineProps<{ topicId: string; isRoot: boolean; canAddSubject?: boolean }>()
const emit = defineEmits<{ (e: 'pdf', file: File, autoCards: boolean): void; (e: 'photo', file: File): void; (e: 'note'): void; (e: 'add-subject'): void }>()

type Kind = 'pdf' | 'text' | 'photo' | 'note' | 'anki'
const OPTIONS: { kind: Kind; label: string; icon: Component }[] = [
  { kind: 'pdf', label: 'Enviar PDF', icon: FileUp },
  { kind: 'text', label: 'Colar texto', icon: ClipboardPaste },
  { kind: 'photo', label: 'Foto', icon: Camera },
  { kind: 'note', label: 'Nota em branco', icon: PenLine },
  { kind: 'anki', label: 'Importar do Anki', icon: Download },
]

const title = computed(() => (props.isRoot ? 'Adicionar ao caderno' : 'Adicionar aqui'))
const autoCards = ref(readAutoCardsPref())
watch(autoCards, writeAutoCardsPref)

const pdfInput = ref<HTMLInputElement | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)

function choose(kind: Kind) {
  if (kind === 'pdf') pdfInput.value?.click()
  else if (kind === 'photo') photoInput.value?.click()
  else if (kind === 'note') emit('note')
  else if (kind === 'text') useAddSheet().show('scope', 'text')
}

function onFile(e: Event, kind: 'pdf' | 'photo') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (kind === 'pdf') emit('pdf', file, autoCards.value)
  else emit('photo', file)
}
</script>
