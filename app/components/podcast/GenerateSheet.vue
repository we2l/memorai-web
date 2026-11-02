<template>
  <UiSheet v-model="model" title="Gerar podcast" description="Áudio dos seus pontos fracos: ouça no ônibus e reforce sem esforço.">
    <div class="flex flex-col gap-5">
      <!-- Caderno (library mode, no topicId prop): every caderno, with its requirement said before (RF-F5) -->
      <UiSelect
        v-if="!topicId"
        v-model="selectedTopicId"
        label="Caderno"
        :options="topicOptions"
        placeholder="Selecione um caderno"
        :hint="topicOptions.length ? undefined : 'Crie um caderno e revise alguns cards para gerar um podcast.'"
      />
      <TopicRequirementNotice :gate="gate" />

      <UiRadioGroup v-model="contentMode" label="Modo de revisão" :options="modes" variant="cards" :columns="3" @update:model-value="selectMode" />

      <UiRadioGroup v-if="!isFree" v-model="duration" label="Duração" :options="durationOptions" variant="cards" :columns="2" />
      <div v-else class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p class="text-meta text-fg-muted">No plano Grátis você ouve uma prévia curta do podcast.</p>
        <UiButton size="sm" variant="ghost" :icon-left="Lock" @click="openUpgrade">Durações do Pro</UiButton>
      </div>
    </div>

    <template #footer>
      <p class="mr-auto text-label text-fg-muted">
        {{ estimatedTime }}<span v-if="usageText"> · {{ usageText }}</span>
      </p>
      <UiButton variant="primary" :icon-left="Mic" :loading="generating" :disabled="!canGenerate" @click="handleGenerate">
        {{ generating ? 'Gerando...' : 'Gerar podcast' }}
      </UiButton>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
import { Lock, Mic } from 'lucide-vue-next'
import type { PodcastContentMode, PodcastDuration, PodcastTone, PodcastFormat } from '~/types'

const props = defineProps<{
  topicId?: string
  topicName?: string
  weakCardsCount?: number
  usage?: { used: number; limit: number } | null
}>()

const emit = defineEmits<{
  generated: []
}>()

const model = defineModel<boolean>()
const auth = useAuthStore()
const podcastStore = usePodcastStore()
const toast = useToast()
const topicStore = useTopicStore()

const isFree = computed(() => auth.user?.plan === 'free')
const generating = computed(() => podcastStore.generating)
const usageText = computed(() => props.usage ? `${props.usage.used}/${props.usage.limit} este mês` : null)

const estimatedTime = computed(() => {
  if (isFree.value) return '~1 min para gerar'
  const isDebate = format.value === 'debate'
  if (duration.value === 'short') return isDebate ? '~4-5 min para gerar' : '~3-4 min para gerar'
  return isDebate ? '~7-9 min para gerar' : '~5-6 min para gerar'
})

function openUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', {
    detail: { feature: 'podcast', planRequired: 'pro' },
  }))
}

// Topic selector for library mode: the root cadernos (the podcast covers the subtree)
const selectedTopicId = ref('')
const topicOptions = computed(() => topicStore.tree.map(t => ({ value: t.id, label: t.name })))
watch(model, (val) => {
  if (val && !props.topicId && !topicStore.tree.length) void topicStore.fetchTree()
}, { immediate: true }) // lazy-mounted already open

// can_podcast of /details (subtree), read when the sheet opens or the caderno changes: the requirement
// shows before the action, and the 422 {code} of POST /podcasts becomes the same text (RF-F5)
const scopeId = computed(() => (model.value ? (props.topicId || selectedTopicId.value || null) : null))
const { gate, details, blocked, fromError } = useTopicGate(() => scopeId.value, 'can_podcast')
const canGenerate = computed(() => !!(props.topicId || selectedTopicId.value) && !blocked.value && !generating.value)

const duration = ref<PodcastDuration>('medium')
const tone = ref<PodcastTone>('conversational')
const format = ref<PodcastFormat>('expository')
const contentMode = ref<PodcastContentMode>('weak_points')
const host1Name = ref('Ana')
const host1Voice = ref('Achird')
const host2Name = ref(auth.user?.name?.split(' ')[0] || 'Lucas')
const host2Voice = ref('Charon')
// weak_count comes aggregated by the API (/details carries no cards)
const fetchedWeakCount = computed(() => details.value?.weak_count ?? 0)

const recommended = computed<PodcastDuration>(() => {
  const count = props.weakCardsCount ?? fetchedWeakCount.value
  if (count <= 5) return 'short'
  return 'medium'
})

watchEffect(() => { if (!isFree.value) duration.value = recommended.value })
watchEffect(() => { if (isFree.value) duration.value = 'short' }) // the API turns Free into the teaser

const durations = [
  { value: 'short' as const, label: 'Curto', time: '3-5 min' },
  { value: 'medium' as const, label: 'Médio', time: '8-15 min' },
]
const durationOptions = computed(() => durations.map(d => ({
  value: d.value,
  label: d.label,
  description: d.value === recommended.value ? `${d.time} · ${durationHint(d.value)}` : d.time,
})))

const modes = [
  { value: 'weak_points' as const, label: 'Pontos fracos', description: 'Foca nos cards que você mais erra' },
  { value: 'general_review' as const, label: 'Revisão geral', description: 'Reforço, revisão e um pouco do que você já domina' },
  { value: 'pre_exam' as const, label: 'Pré-prova', description: 'Concentra nos tópicos da prova mais próxima' },
]

function selectMode(mode: string) {
  if (mode === 'pre_exam') {
    tone.value = 'motivational'
    format.value = 'debate'
  } else {
    tone.value = 'conversational'
    format.value = 'expository'
  }
}

/** Why the recommended duration is recommended (by the weak cards of the caderno) */
function durationHint(value: PodcastDuration): string {
  const count = props.weakCardsCount ?? fetchedWeakCount.value
  if (value === 'short') return count ? `recomendado para ${count} ponto${count !== 1 ? 's' : ''} fraco${count !== 1 ? 's' : ''}` : 'recomendado'
  return `recomendado: ${count} pontos fracos pedem mais tempo`
}

async function handleGenerate() {
  const topicIdToUse = props.topicId || selectedTopicId.value
  if (!topicIdToUse) {
    toast.show('Selecione um caderno.', 'error')
    return
  }
  try {
    await podcastStore.generate({
      topic_id: topicIdToUse,
      content_mode: contentMode.value,
      duration: duration.value,
      tone: tone.value,
      format: format.value,
      speaker_config: {
        host1: { name: host1Name.value, voice: host1Voice.value },
        ...(format.value === 'debate' ? { host2: { name: host2Name.value, voice: host2Voice.value } } : {}),
      },
    })
    toast.show('Podcast sendo gerado! Aguarde...', 'success')
    model.value = false
    emit('generated')
  } catch (e) {
    // A requirement (422 with code) becomes the notice above the options; anything else, a toast
    if (!fromError(e)) reportApiError(e)
  }
}
</script>
