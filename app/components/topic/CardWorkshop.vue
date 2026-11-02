<template>
  <div data-testid="card-workshop" :class="panel ? '' : 'rounded-card bg-raised p-5 shadow-card'">
    <!-- Generating -->
    <div v-if="loading" class="flex flex-col items-center gap-3 py-10 text-center" role="status">
      <UiSpinner />
      <p class="text-meta font-medium text-fg-strong">Lendo o texto…</p>
      <p class="text-label text-fg-muted">A IA está escolhendo o que vale revisar</p>
    </div>

    <!-- Suggestions to accept -->
    <template v-else-if="cards.length">
      <div class="mb-3 flex items-start gap-2">
        <Sparkles class="mt-0.5 size-4 shrink-0 text-action-fg" aria-hidden="true" />
        <div>
          <h3 class="text-meta font-semibold text-fg-strong">
            {{ cards.length }} {{ cards.length === 1 ? 'sugestão' : 'sugestões' }} de card
          </h3>
          <p class="text-label text-fg-muted">Revise antes de salvar: aceite, edite ou descarte.</p>
        </div>
      </div>

      <ul class="flex flex-col gap-2" :class="panel ? '' : 'max-h-[65vh] overflow-y-auto'" aria-label="Sugestões">
        <li
          v-for="(card, index) in cards"
          :key="index"
          class="rounded-row border p-3"
          :class="acceptedIndexes?.has(index) ? 'border-success bg-success-subtle' : 'border-line-strong bg-raised'"
          data-testid="workshop-card"
        >
          <!-- Edit mode -->
          <form v-if="editingIndex === index" class="flex flex-col gap-3" @submit.prevent="confirmEdit(index)">
            <UiTextarea v-model="editFront" label="Frente" :rows="2" @keydown.stop />
            <UiTextarea v-model="editBack" label="Verso" :rows="3" @keydown.stop />
            <div class="flex gap-2">
              <UiButton size="sm" variant="primary" type="submit">Salvar</UiButton>
              <UiButton size="sm" variant="ghost" @click="editingIndex = null">Cancelar</UiButton>
            </div>
          </form>

          <!-- View mode -->
          <template v-else>
            <p class="text-meta font-semibold text-fg-strong">{{ card.front }}</p>
            <p class="mt-1.5 text-meta text-fg">{{ card.back }}</p>
            <p v-if="card.source_excerpt" class="mt-2 flex items-center gap-1 text-label text-fg-muted">
              <FileText class="size-3 shrink-0" aria-hidden="true" />
              <span class="truncate">{{ card.source_excerpt }}</span>
            </p>
            <div class="mt-2 flex items-center gap-1">
              <template v-if="!acceptedIndexes?.has(index)">
                <UiIconButton :icon="Check" label="Aceitar" size="sm" @click="$emit('accept-card', index)" />
                <UiIconButton :icon="Pencil" label="Editar" size="sm" @click="startEdit(index, card)" />
                <UiIconButton :icon="Trash2" label="Descartar" size="sm" @click="$emit('remove-card', index)" />
              </template>
              <UiTag v-else tone="success" :icon="Check">Salvo</UiTag>
            </div>
          </template>
        </li>
      </ul>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
        <UiButton variant="ghost" @click="$emit('discard')">Descartar tudo</UiButton>
        <UiButton variant="primary" :loading="saving" @click="$emit('save')">
          Salvar {{ remaining }} card{{ remaining !== 1 ? 's' : '' }}
        </UiButton>
      </div>
    </template>

    <!-- Saved -->
    <div v-else-if="showSuccess" class="flex flex-col items-center gap-3 py-8 text-center" role="status">
      <CheckCircle2 class="size-8 text-success" aria-hidden="true" />
      <div>
        <p class="text-meta font-semibold text-fg-strong">Tudo pronto!</p>
        <p class="text-meta text-fg-muted">{{ savedCount }} card{{ savedCount !== 1 ? 's' : '' }} salvo{{ savedCount !== 1 ? 's' : '' }}{{ panel ? ' nesta nota' : '' }}.</p>
      </div>
      <div class="flex w-full max-w-xs flex-col gap-2">
        <slot name="post-save-actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The AI's card suggestions to accept, edit or discard before saving (useCardWorkshop). `panel`: inside
// "Cards desta parte" of the material (prd-4c-material-v3 RF-F4), 340 px wide, the text still on screen;
// otherwise a section of its own (the library).
import { Check, CheckCircle2, FileText, Pencil, Sparkles, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  cards: Array<{ front: string; back: string; source_excerpt?: string }>
  loading: boolean
  saving?: boolean
  acceptedIndexes?: Set<number>
  showSuccess?: boolean
  savedCount?: number
  panel?: boolean
}>()

const emit = defineEmits<{
  'save': []
  'discard': []
  'edit-card': [index: number, data: { front: string; back: string }]
  'remove-card': [index: number]
  'accept-card': [index: number]
}>()

const remaining = computed(() => props.cards.length - (props.acceptedIndexes?.size ?? 0))

const editingIndex = ref<number | null>(null)
const editFront = ref('')
const editBack = ref('')

function startEdit(index: number, card: { front: string; back: string }) {
  editingIndex.value = index
  editFront.value = card.front
  editBack.value = card.back
}

function confirmEdit(index: number) {
  emit('edit-card', index, { front: editFront.value, back: editBack.value })
  editingIndex.value = null
}
</script>
