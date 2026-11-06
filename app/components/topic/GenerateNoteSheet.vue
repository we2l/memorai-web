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
        <template v-if="auth.onTrial">
          Seu PDF tem {{ document?.pages_count }} páginas. Restam {{ pageLimit }} das {{ trialPages }} páginas do teste: a nota cobre as primeiras {{ pageLimit }}.
        </template>
        <template v-else-if="isFree">
          Seu PDF tem {{ document?.pages_count }} páginas. No Grátis, a nota cobre as primeiras {{ pageLimit }}, o suficiente para avaliar a qualidade. O restante fica disponível no {{ proName }}.
        </template>
        <template v-else>
          Seu PDF tem {{ document?.pages_count }} páginas. Serão processadas as primeiras {{ pageLimit }}, o limite ideal para a qualidade da IA.
        </template>
      </p>

      <p v-if="quotaText" class="text-label text-fg-muted">{{ quotaText }}</p>
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
const featureUsage = useFeatureUsage()
const proName = useProName()

const isFree = computed(() => auth.user?.plan !== 'pro')
const { limitOf, fetchPlans, feature } = usePlans()
// In the trial the pages are of its whole period (100): what is left of them (prd-planos-lancamento RF-B6)
const trialPages = computed(() => featureUsage.usage.value?.pdf_pages?.limit ?? null)
const pageLimit = computed(() => (auth.onTrial
  ? featureUsage.usage.value?.pdf_pages?.remaining ?? null
  : limitOf(isFree.value ? 'free' : 'pro')?.extras.pdf_pages_per_note ?? null))
// "PDFs transformados em nota: 1 de 3 no teste" (label of the catalog); nothing for a Free account whose trial
// opens on this click (RF-F7b)
const quotaText = computed(() => {
  const f = featureUsage.usage.value?.features?.pdf_to_note
  if (!f || featureUsage.opensTrial('pdf_to_note')) return ''
  const label = feature('pdf_to_note')?.label ?? 'PDFs transformados em nota'
  const count = f.limit === null ? `${f.used}` : `${f.used} de ${f.limit}`
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${count} ${featureUsage.periodLabel.value}`
})
const isPartial = computed(() =>
  !!pageLimit.value && !!props.document?.pages_count && props.document.pages_count > pageLimit.value,
)

watch(open, (val) => {
  if (!val) return
  void fetchPlans()
  void featureUsage.fetchUsage()
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
