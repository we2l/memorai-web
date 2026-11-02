<template>
  <UiSheet v-model="model" title="Gerar episódio" description="Áudio dos seus pontos fracos, para ouvir no caminho e reforçar sem tela.">
    <div class="flex flex-col gap-5">
      <!-- Any level of the tree: the episode covers the subtree (prd-4e-praticar-v3 RF-F9, RF-B9) -->
      <div class="flex flex-col gap-2">
        <UiSelect
          v-model="selectedTopicId"
          label="Escopo"
          :options="topicOptions"
          placeholder="Escolha o caderno ou o assunto"
          :hint="topicOptions.length ? undefined : 'Crie um caderno e revise alguns cards para gerar um episódio.'"
          data-testid="podcast-scope"
        />
        <TopicRequirementNotice :gate="gate" />
      </div>

      <UiRadioGroup v-model="contentMode" label="Conteúdo" :options="modes" variant="cards" :columns="3" @update:model-value="selectMode" />

      <UiRadioGroup v-if="!isFree" v-model="duration" label="Duração" :options="durationOptions" variant="cards" :columns="2" />
      <div v-else class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p class="text-meta text-fg-muted">No plano Grátis você ouve uma prévia curta do episódio.</p>
        <UiButton size="sm" variant="ghost" :icon-left="Lock" @click="openUpgrade">Episódios completos no Pro</UiButton>
      </div>
    </div>

    <template #footer>
      <p class="mr-auto text-label text-fg-muted" data-testid="podcast-quota">
        {{ estimatedTime }}<span v-if="quotaText"> · {{ quotaText }}</span>
      </p>
      <UiButton variant="primary" :icon-left="Mic" :loading="generating" :disabled="!canGenerate" @click="handleGenerate">
        {{ generating ? 'Gerando...' : 'Gerar episódio' }}
      </UiButton>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
// Generate an episode (prd-4e-praticar-v3 RF-F9): the scope in the tree (caderno, matéria, assunto), the
// content, the length with the real time of the catalog ("Completo · ≈ 15 min" from podcast_max_minutes),
// and the quota and the requirement before the action (F1 RF-F5: the 422 {code} becomes the same text).
import { Lock, Mic } from 'lucide-vue-next'
import type { PodcastContentMode, PodcastDuration, PodcastFormat, PodcastTone } from '~/types'
import { topicTreeOptions } from '~/utils/topicOptions'

const props = defineProps<{
  /** Scope it opens with (the caderno of the page) */
  topicId?: string
  weakCardsCount?: number
}>()

const emit = defineEmits<{ generated: [] }>()

const model = defineModel<boolean>({ default: false })
const auth = useAuthStore()
const podcastStore = usePodcastStore()
const toast = useToast()
const topicStore = useTopicStore()

const plans = usePlans()
const usage = useFeatureUsage()

const isFree = computed(() => auth.user?.plan === 'free')
const generating = computed(() => podcastStore.generating)

const selectedTopicId = ref(props.topicId ?? '')
watch(() => [model.value, props.topicId] as const, ([open, id]) => { if (open && id) selectedTopicId.value = id }, { immediate: true })
const topicOptions = computed(() => topicTreeOptions(topicStore.tree))
watch(model, (val) => {
  if (!val) return
  if (!topicStore.tree.length) void topicStore.fetchTree()
  void plans.fetchPlans()
  void usage.fetchUsage()
}, { immediate: true }) // lazy-mounted already open

// can_podcast of /details (subtree), read when the sheet opens or the scope changes
const scopeId = computed(() => (model.value ? selectedTopicId.value || null : null))
const { gate, details, blocked, fromError } = useTopicGate(() => scopeId.value, 'can_podcast')

const quota = computed(() => usage.usage.value?.features?.podcast ?? null)
const quotaText = computed(() => {
  const q = quota.value
  if (!q || q.limit === null) return null
  return `${q.used} de ${q.limit} este mês`
})
const quotaSpent = computed(() => !!quota.value && quota.value.limit !== null && (quota.value.remaining ?? 1) <= 0)
const canGenerate = computed(() => !!selectedTopicId.value && !blocked.value && !generating.value && !quotaSpent.value)

// Real length of the catalog (RF-T1: medium ≤ 15 min; short ≈ half, ~910 words ≈ 7 min)
const maxMinutes = computed(() => plans.limitOf('pro')?.extras?.podcast_max_minutes ?? 15)

const duration = ref<PodcastDuration>('medium')
const tone = ref<PodcastTone>('conversational')
const format = ref<PodcastFormat>('expository')
const contentMode = ref<PodcastContentMode>('weak_points')
const weakCount = computed(() => props.weakCardsCount ?? details.value?.weak_count ?? 0)

watchEffect(() => { duration.value = isFree.value ? 'short' : (weakCount.value <= 5 ? 'short' : 'medium') })

const durationOptions = computed(() => [
  { value: 'short', label: `Curto · ≈ ${Math.max(1, Math.round(maxMinutes.value / 2))} min`, description: weakCount.value && weakCount.value <= 5 ? 'Recomendado para poucos pontos fracos' : '5 cards' },
  { value: 'medium', label: `Completo · ≈ ${maxMinutes.value} min`, description: weakCount.value > 5 ? `Recomendado: ${weakCount.value} pontos fracos` : '10 cards' },
])

const estimatedTime = computed(() => {
  if (isFree.value) return 'Pronto em ~1 min'
  return duration.value === 'short' ? 'Pronto em ~4 min' : 'Pronto em ~8 min'
})

const modes = [
  { value: 'weak_points' as const, label: 'Pontos fracos', description: 'Os cards que você mais erra' },
  { value: 'general_review' as const, label: 'Revisão geral', description: 'Reforço do que está vencendo' },
  { value: 'pre_exam' as const, label: 'Pré-prova', description: 'Os assuntos da prova mais próxima' },
]

function selectMode(mode: string) {
  tone.value = mode === 'pre_exam' ? 'motivational' : 'conversational'
  format.value = mode === 'pre_exam' ? 'debate' : 'expository'
}

function openUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: { feature: 'podcast', planRequired: 'pro' } }))
}

async function handleGenerate() {
  if (!selectedTopicId.value) {
    toast.show('Escolha o caderno ou o assunto.', 'error')
    return
  }
  try {
    const firstName = auth.user?.name?.split(' ')[0] || 'Lucas'
    await podcastStore.generate({
      topic_id: selectedTopicId.value,
      content_mode: contentMode.value,
      duration: duration.value,
      tone: tone.value,
      format: format.value,
      speaker_config: {
        host1: { name: 'Ana', voice: 'Achird' },
        ...(format.value === 'debate' ? { host2: { name: firstName, voice: 'Charon' } } : {}),
      },
    })
    toast.show('Episódio na fila. Ele aparece na lista quando ficar pronto.', 'success')
    model.value = false
    emit('generated')
  } catch (e) {
    // A requirement (422 with code) becomes the notice under the scope; anything else, a toast
    if (!fromError(e)) reportApiError(e)
  }
}
</script>
