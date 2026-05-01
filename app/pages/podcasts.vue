<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-display">Podcasts</h1>
      <button
        v-if="canGenerate"
        class="btn-primary"
        :disabled="store.generating || store.hasPending"
        @click="handleGenerate"
      >
        <Loader2 v-if="store.generating" :size="16" class="animate-spin" />
        <Headphones v-else :size="16" />
        {{ store.generating ? 'Gerando...' : '🎙️ Gerar podcast' }}
      </button>
      <button v-else class="btn-primary" @click="showUpgrade = true">
        🎙️ Gerar podcast
      </button>
    </div>

    <!-- Usage counter -->
    <p v-if="usage" class="text-micro text-base-muted -mt-4 mb-6">
      {{ usage.used }}/{{ usage.limit }} este mês
    </p>

    <!-- Loading -->
    <div v-if="store.loading && !store.podcasts.length" class="text-center py-12">
      <Loader2 :size="24" class="animate-spin text-base-muted mx-auto" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!store.podcasts.length" class="text-center py-16">
      <p class="text-4xl mb-4">🎧</p>
      <p class="text-title text-base-secondary">Nenhum podcast ainda</p>
      <p class="text-small text-base-muted mt-1">Gere seu primeiro podcast e ouça seus pontos fracos!</p>
    </div>

    <!-- Podcast list -->
    <div v-else class="space-y-4">
      <div v-for="podcast in store.podcasts" :key="podcast.id" class="card">
        <!-- Generating states -->
        <div v-if="podcast.status === 'pending' || podcast.status === 'generating_script' || podcast.status === 'generating_audio'" class="flex items-center gap-3">
          <Loader2 :size="20" class="animate-spin text-accent-primary shrink-0" />
          <div>
            <p class="text-small text-base-primary">{{ podcast.title }}</p>
            <p class="text-micro text-base-muted">{{ statusLabel(podcast.status) }}</p>
          </div>
        </div>

        <!-- Ready -->
        <div v-else-if="podcast.status === 'ready'">
          <div class="flex items-center justify-between mb-2">
            <p class="text-small text-base-primary font-medium">{{ podcast.title }}</p>
            <span class="text-micro text-base-muted">{{ timeAgo(podcast.created_at) }}</span>
          </div>
          <PodcastPlayer
            v-if="podcast.audio_url"
            :audio-url="podcast.audio_url"
            :title="podcast.title"
            :duration="podcast.duration_seconds ?? 0"
          />
        </div>

        <!-- Failed -->
        <div v-else-if="podcast.status === 'failed'" class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-micro bg-danger/15 text-danger">Falhou</span>
            <p class="text-small text-base-muted">{{ podcast.title }}</p>
          </div>
          <button class="btn-secondary !py-1.5 !px-3 !min-h-[2.75rem] text-small" @click="handleGenerate">
            Tentar novamente
          </button>
        </div>
      </div>
    </div>

    <UiUpgradeModal v-model="showUpgrade" feature="podcast" />
  </div>
</template>

<script setup lang="ts">
import { Headphones, Loader2 } from 'lucide-vue-next'

const store = usePodcastStore()
const auth = useAuthStore()
const toast = useToast()
const showUpgrade = ref(false)

const canGenerate = computed(() => auth.user?.plan !== 'free')

const usage = ref<{ used: number; limit: number } | null>(null)

async function loadUsage() {
  try {
    const { $api } = useNuxtApp()
    const res = await $api<any>('/usage')
    const podcast = res.data.features?.podcast
    if (podcast && podcast.limit !== null) {
      usage.value = { used: podcast.used, limit: podcast.limit }
    }
  } catch {}
}

async function handleGenerate() {
  try {
    await store.generate()
    toast.show('Podcast sendo gerado! Aguarde...', 'success')
    pollInterval = store.startPolling()
    await loadUsage()
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || 'Erro ao gerar podcast.'
    toast.show(msg, 'error')
  }
}

function statusLabel(status: string): string {
  if (status === 'pending') return 'Na fila...'
  if (status === 'generating_script') return 'Gerando roteiro...'
  if (status === 'generating_audio') return 'Gerando áudio...'
  return status
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await store.fetchPodcasts()
  await loadUsage()
  if (store.hasPending) {
    pollInterval = store.startPolling()
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>
