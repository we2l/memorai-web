<template>
  <!-- Not on the paid plan (Free and the trial, prd-planos-lancamento RF-F3): the sample of an episode instead of the form -->
  <UiSheet
    v-if="paywall"
    v-model="model"
    title="Podcast dos pontos fracos"
    :description="`Um episódio curto com os cards que você mais erra, para ouvir no caminho. É do ${proName}.`"
  >
    <div class="flex flex-col items-center gap-4" data-testid="podcast-paywall">
      <PodcastSample source="generate_sheet" />
      <p class="text-center text-meta text-fg">
        <template v-if="podcastBenefit">No {{ proName }}: {{ podcastBenefit }}.</template>
        <template v-if="auth.onTrial"> O podcast não entra no teste grátis.</template>
      </p>
    </div>
    <template #footer>
      <UiButton variant="primary" to="/planos" data-testid="podcast-paywall-plans" @click="toPlans">Conhecer o {{ proName }}</UiButton>
    </template>
  </UiSheet>

  <UiSheet v-else v-model="model" title="Gerar episódio" description="Áudio dos seus pontos fracos, para ouvir no caminho e reforçar sem tela.">
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
      <LazyPlansUsageNotice feature="podcast" :usage="usage" />
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
// content, and the quota and the requirement before the action (F1 RF-F5: the 422 {code} becomes the same text).
// The episode is always the short one, up to podcast_max_minutes of the catalog (8 min): the API records `short`
// for every request (prd-planos-lancamento RF-B15), so there is no length to pick. Who is not on the paid plan
// sees the demo video instead (RF-F3): Free and the trial have no podcast.
import { Mic } from 'lucide-vue-next'
import type { PodcastContentMode, PodcastFormat, PodcastTone } from '~/types'
import { topicTreeOptions } from '~/utils/topicOptions'

const props = defineProps<{
  /** Scope it opens with (the caderno of the page) */
  topicId?: string
}>()

const emit = defineEmits<{ generated: [] }>()

const model = defineModel<boolean>({ default: false })
const auth = useAuthStore()
const podcastStore = usePodcastStore()
const toast = useToast()
const topicStore = useTopicStore()

const plans = usePlans()
const usage = usePaidQuota()
const quota = computed(() => usage.usage.value?.features?.podcast ?? null)

// A known account outside the paid plan (the trial included): the paywall with the demo. The Free's preview
// (prd-uso-justo §9) has one ~30 s podcast of its own cards: the form while it is not spent.
const previewPodcast = computed(() => hasPreview(plans.plans.value, auth.user) && previewIncludes(plans.plans.value, 'podcast')
  && (quota.value?.remaining ?? 1) > 0)
const paywall = computed(() => !!auth.user && auth.user.plan !== 'pro' && !previewPodcast.value)
const previewSeconds = computed(() => (previewPodcast.value ? plans.plans.value?.preview?.podcast_seconds ?? 30 : null))
const proName = useProName()
const podcastBenefit = computed(() => plans.feature('podcast')?.pro_benefit ?? null)
const generating = computed(() => podcastStore.generating)

const selectedTopicId = ref(props.topicId ?? '')
watch(() => [model.value, props.topicId] as const, ([open, id]) => { if (open && id) selectedTopicId.value = id }, { immediate: true })
const topicOptions = computed(() => topicTreeOptions(topicStore.tree))
watch(model, async (val) => {
  if (!val) return
  // The catalog says whether the Free has the preview's podcast; /usage whether it is spent
  await plans.fetchPlans()
  if (previewPodcast.value) await usage.fetchUsage()
  if (paywall.value) {
    useAnalytics().track('paywall_viewed', { feature: 'podcast', source: 'podcast_demo', plan_required: 'pro' })
    return
  }
  if (!topicStore.tree.length) void topicStore.fetchTree()
  if (!usage.usage.value) void usage.fetchUsage()
}, { immediate: true }) // lazy-mounted already open

function toPlans() {
  useAnalytics().track('upgrade_clicked', { feature: 'podcast', billing: null, source: 'podcast_demo' })
  model.value = false
}

// can_podcast of /details (subtree), read when the sheet opens or the scope changes (never on the paywall)
const scopeId = computed(() => (model.value && !paywall.value ? selectedTopicId.value || null : null))
const { gate, blocked, fromError } = useTopicGate(() => scopeId.value, 'can_podcast')

const quotaText = computed(() => {
  const q = quota.value
  // The preview says its own line (LazyPlansUsageNotice)
  if (!q || q.limit === null || usage.preview.value) return null
  return `${q.used} de ${q.limit} este mês`
})
const quotaSpent = computed(() => !!quota.value && quota.value.limit !== null && (quota.value.remaining ?? 1) <= 0)
const canGenerate = computed(() => !!selectedTopicId.value && !blocked.value && !generating.value && !quotaSpent.value)

// The length of the catalog (podcast_max_minutes: up to 8 min); the API makes every episode the short one
const maxMinutes = computed(() => plans.limitOf('pro')?.extras?.podcast_max_minutes ?? null)
const estimatedTime = computed(() => {
  if (previewSeconds.value) return `Prévia de ~${previewSeconds.value} s · pronta em ~2 min`
  return maxMinutes.value ? `Até ${maxMinutes.value} min · pronto em ~4 min` : 'Pronto em ~4 min'
})

const tone = ref<PodcastTone>('conversational')
const format = ref<PodcastFormat>('expository')
const contentMode = ref<PodcastContentMode>('weak_points')

const modes = [
  { value: 'weak_points' as const, label: 'Pontos fracos', description: 'Os cards que você mais erra' },
  { value: 'general_review' as const, label: 'Revisão geral', description: 'Reforço do que está vencendo' },
  { value: 'pre_exam' as const, label: 'Pré-prova', description: 'Os assuntos da prova mais próxima' },
]

function selectMode(mode: string) {
  tone.value = mode === 'pre_exam' ? 'motivational' : 'conversational'
  format.value = mode === 'pre_exam' ? 'debate' : 'expository'
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
      duration: 'short',
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
