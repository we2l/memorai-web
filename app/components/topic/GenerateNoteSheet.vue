<template>
  <UiSheet v-model="open" size="sm" title="Gerar resumo com IA">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3 rounded-row bg-subtle p-3">
        <FileText class="size-5 shrink-0 text-fg-muted" aria-hidden="true" />
        <div class="min-w-0">
          <p class="truncate text-meta font-medium text-fg-strong">{{ document?.original_name }}</p>
          <p v-if="document?.pages_count" class="text-label text-fg-muted">{{ document.pages_count }} páginas</p>
        </div>
      </div>

      <p class="text-meta text-fg">
        A IA vai ler o PDF e extrair conceitos, pegadinhas e pontos-chave em uma nota estruturada.
        <span class="mt-2 block text-fg-muted">Leva cerca de 2 minutos. Pode sair da tela.</span>
      </p>

      <!-- The page limit comes from the catalog (RN-01) -->
      <p v-if="isPartial" class="rounded-row bg-subtle p-3 text-meta text-fg-muted">
        <template v-if="isFree">
          Seu PDF tem {{ document?.pages_count }} páginas. No Grátis, a nota cobre as primeiras {{ pageLimit }}, o suficiente para avaliar a qualidade. O restante fica disponível no Pro.
        </template>
        <template v-else>
          Seu PDF tem {{ document?.pages_count }} páginas. Serão processadas as primeiras {{ pageLimit }}, o limite ideal para a qualidade da IA.
        </template>
      </p>

      <p class="text-label text-fg-muted">{{ used }} de {{ limit ?? 'ilimitados' }} créditos usados este mês</p>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" :loading="generating" @click="generate">Gerar resumo</UiButton>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import type { Document } from '~/types'

const props = defineProps<{ document: Document | null }>()
const emit = defineEmits<{ generated: [] }>()
const open = defineModel<boolean>({ required: true })

const { $api } = useNuxtApp()
const toast = useToast()
const auth = useAuthStore()
const generating = ref(false)
const limit = ref<number | null>(null)
const used = ref(0)

const isFree = computed(() => auth.user?.plan !== 'pro')
const { limitOf, fetchPlans } = usePlans()
const pageLimit = computed(() => limitOf(isFree.value ? 'free' : 'pro')?.extras.pdf_pages_per_note ?? null)
const isPartial = computed(() =>
  !!pageLimit.value && !!props.document?.pages_count && props.document.pages_count > pageLimit.value,
)

watch(open, async (val) => {
  if (!val) return
  void fetchPlans()
  try {
    const res = await $api<{ data: { features: Record<string, { limit: number | null; used: number; remaining: number | null }> } }>('/usage')
    const feature = res.data?.features?.pdf_to_note
    limit.value = feature?.limit ?? null
    used.value = feature?.used ?? 0
  } catch (e) {
    reportApiError(e, { silent: true })
  }
})

async function generate() {
  if (!props.document) return
  generating.value = true
  try {
    const res = await $api<{ message: string }>(`/documents/${props.document.id}/generate-note`, { method: 'POST' })
    toast.show(res.message)
    open.value = false
    emit('generated')
  } catch (e: any) {
    // 402 opens the UpgradeModal (api plugin); 409/429 carry a user-facing message (RF-64)
    if (e?.response?.status !== 402) toast.show(e?.data?.message || 'Erro ao processar PDF.', 'error')
  } finally {
    generating.value = false
  }
}
</script>
