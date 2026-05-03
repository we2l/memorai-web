<template>
  <UiModal v-model="open" size="sm" aria-label="Criar material de estudo">
    <div class="py-2">
      <h2 class="text-headline mb-3">Criar material de estudo</h2>

      <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-tertiary mb-4">
        <span class="text-2xl">📄</span>
        <div class="min-w-0">
          <p class="text-small font-medium text-base-primary truncate">{{ document?.original_name }}</p>
          <p v-if="document?.pages_count" class="text-micro text-base-muted">{{ document.pages_count }} páginas</p>
        </div>
      </div>

      <p class="text-small text-base-secondary mb-4">
        A IA vai analisar o PDF e criar uma nota com resumo dos pontos-chave, pegadinhas e conceitos importantes.
      </p>

      <p class="text-micro text-base-muted mb-5">
        {{ used }}/{{ limit ?? '∞' }} processamentos usados este mês
      </p>

      <div class="flex gap-3 justify-end">
        <button class="btn-secondary" @click="open = false">Cancelar</button>
        <button class="btn-primary" :disabled="generating" @click="generate">
          {{ generating ? 'Gerando...' : 'Criar ✨' }}
        </button>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import type { Document } from '~/types'

const props = defineProps<{ document: Document | null }>()
const emit = defineEmits<{ generated: [] }>()
const open = defineModel<boolean>({ required: true })

const { $api } = useNuxtApp()
const toast = useToast()
const generating = ref(false)
const limit = ref<number | null>(null)
const used = ref(0)

watch(open, async (val) => {
  if (!val) return
  try {
    const res = await $api<{ data: { features: Record<string, { limit: number | null; used: number; remaining: number | null }> } }>('/usage')
    const feature = res.data?.features?.pdf_to_note
    limit.value = feature?.limit ?? null
    used.value = feature?.used ?? 0
  } catch {}
})

async function generate() {
  if (!props.document) return
  generating.value = true
  try {
    await $api(`/documents/${props.document.id}/generate-note`, { method: 'POST' })
    toast.show('Processamento iniciado! A nota aparecerá em breve.')
    open.value = false
    emit('generated')
  } catch (e: any) {
    const msg = e?.data?.message || 'Erro ao processar PDF.'
    toast.show(msg, 'error')
  } finally {
    generating.value = false
  }
}
</script>
