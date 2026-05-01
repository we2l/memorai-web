<template>
  <UiModal v-model="model" :size="'lg'" aria-label="Gerar Podcast">
    <h2 class="text-headline font-serif mb-1">Gerar Podcast</h2>
    <p class="text-small text-base-muted mb-5">Personalize sua revisão de áudio</p>

    <!-- Duration -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <button
        v-for="d in durations"
        :key="d.value"
        class="p-4 rounded-xl border text-left transition-all"
        :class="duration === d.value ? 'border-accent-primary bg-accent-primary-subtle' : 'border-base bg-surface-secondary hover:border-base-muted'"
        :disabled="isFree && d.value !== 'short'"
        @click="duration = d.value"
      >
        <p class="text-small font-medium text-base-primary">{{ d.label }}</p>
        <p class="text-micro text-base-muted">{{ d.time }}</p>
        <p v-if="d.value === recommended" class="text-micro text-accent-primary mt-1">✨ Recomendado</p>
        <span v-if="isFree && d.value !== 'short'" class="text-micro text-accent-primary">Pro</span>
      </button>
    </div>

    <!-- Customize toggle -->
    <button class="text-small text-accent-primary mb-4 flex items-center gap-1" @click="showAdvanced = !showAdvanced">
      Personalizar opções
      <ChevronDown :size="16" :class="showAdvanced ? 'rotate-180' : ''" class="transition-transform" />
    </button>

    <div v-if="showAdvanced" class="space-y-5">
      <!-- Tone -->
      <div>
        <p class="text-small font-medium text-base-primary mb-2">Tom</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="t in tones"
            :key="t.value"
            class="px-3 py-1.5 rounded-full text-small border transition-all"
            :class="tone === t.value ? 'border-accent-primary bg-accent-primary-subtle text-accent-primary' : 'border-base text-base-muted hover:border-base-muted'"
            :disabled="isFree && t.value !== 'conversational'"
            @click="tone = t.value"
          >
            {{ t.label }}
            <span v-if="isFree && t.value !== 'conversational'" class="text-micro ml-1">Pro</span>
          </button>
        </div>
      </div>

      <!-- Format -->
      <div>
        <p class="text-small font-medium text-base-primary mb-2">Formato</p>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="f in formats"
            :key="f.value"
            class="p-3 rounded-xl border text-center transition-all"
            :class="format === f.value ? 'border-accent-primary bg-accent-primary-subtle' : 'border-base bg-surface-secondary hover:border-base-muted'"
            :disabled="isFree && f.value !== 'expository'"
            @click="format = f.value"
          >
            <component :is="f.icon" :size="24" class="mx-auto mb-1" :class="format === f.value ? 'text-accent-primary' : 'text-base-muted'" />
            <p class="text-small" :class="format === f.value ? 'text-accent-primary' : 'text-base-muted'">{{ f.label }}</p>
            <span v-if="isFree && f.value !== 'expository'" class="text-micro text-accent-primary">Pro</span>
          </button>
        </div>
      </div>

      <!-- Speakers -->
      <div>
        <p class="text-small font-medium text-base-primary mb-2">{{ format === 'debate' ? 'Narradores' : 'Narrador' }}</p>
        <div class="space-y-3">
          <div class="flex gap-3 items-center">
            <input v-model="host1Name" type="text" class="input-base flex-1" placeholder="Nome" :disabled="isFree" />
            <select v-model="host1Voice" class="input-base w-32" :disabled="isFree">
              <option v-for="v in voices" :key="v.id" :value="v.id">{{ v.label }}</option>
            </select>
          </div>
          <div v-if="format === 'debate'" class="flex gap-3 items-center">
            <input v-model="host2Name" type="text" class="input-base flex-1" placeholder="Nome" :disabled="isFree" />
            <select v-model="host2Voice" class="input-base w-32" :disabled="isFree">
              <option v-for="v in voices" :key="v.id" :value="v.id">{{ v.label }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate button -->
    <button
      class="btn-primary w-full mt-6"
      :disabled="generating"
      @click="handleGenerate"
    >
      <Loader2 v-if="generating" :size="16" class="animate-spin" />
      🎙️ {{ generating ? 'Gerando...' : 'Gerar podcast' }}
    </button>
    <p v-if="usageText" class="text-micro text-base-muted text-center mt-2">{{ usageText }}</p>
  </UiModal>
</template>

<script setup lang="ts">
import { User, Users, ChevronDown, Loader2 } from 'lucide-vue-next'
import type { PodcastDuration, PodcastTone, PodcastFormat } from '~/types'

const props = defineProps<{
  topicId: string
  topicName: string
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

const isFree = computed(() => auth.user?.plan === 'free')
const generating = computed(() => podcastStore.generating)
const usageText = computed(() => props.usage ? `${props.usage.used}/${props.usage.limit} este mês` : null)

const duration = ref<PodcastDuration>('medium')
const tone = ref<PodcastTone>('conversational')
const format = ref<PodcastFormat>('expository')
const host1Name = ref('Ana')
const host1Voice = ref('Kore')
const host2Name = ref('Lucas')
const host2Voice = ref('Puck')
const showAdvanced = ref(false)

const recommended = computed<PodcastDuration>(() => {
  const count = props.weakCardsCount ?? 0
  if (count <= 5) return 'short'
  if (count <= 15) return 'medium'
  return 'long'
})

// Set default to recommended
watchEffect(() => { if (!isFree.value) duration.value = recommended.value })
// Free forced to short
watchEffect(() => { if (isFree.value) duration.value = 'short' })

const durations = [
  { value: 'short' as const, label: 'Curto', time: '2-3 min' },
  { value: 'medium' as const, label: 'Médio', time: '5-7 min' },
  { value: 'long' as const, label: 'Longo', time: '10-15 min' },
]

const tones = [
  { value: 'formal' as const, label: 'Formal' },
  { value: 'conversational' as const, label: 'Conversa' },
  { value: 'motivational' as const, label: 'Motivador' },
  { value: 'didactic' as const, label: 'Didático' },
]

const formats = [
  { value: 'expository' as const, label: 'Expositivo', icon: User },
  { value: 'debate' as const, label: 'Debate', icon: Users },
]

const voices = [
  { id: 'Kore', label: 'Kore · Firme' },
  { id: 'Aoede', label: 'Aoede · Leve' },
  { id: 'Leda', label: 'Leda · Jovem' },
  { id: 'Puck', label: 'Puck · Animado' },
  { id: 'Charon', label: 'Charon · Informativo' },
  { id: 'Orus', label: 'Orus · Firme' },
]

async function handleGenerate() {
  try {
    const config: any = {
      topic_id: props.topicId,
      duration: duration.value,
      tone: tone.value,
      format: format.value,
      speaker_config: {
        host1: { name: host1Name.value, voice: host1Voice.value },
        ...(format.value === 'debate' ? { host2: { name: host2Name.value, voice: host2Voice.value } } : {}),
      },
    }
    await podcastStore.generate(config)
    toast.show('Podcast sendo gerado! Aguarde...', 'success')
    model.value = false
    emit('generated')
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao gerar podcast.', 'error')
  }
}
</script>
