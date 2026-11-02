<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <UiPageHeader title="Cadernos" :meta="meta">
      <template v-if="roots.length" #actions>
        <UiButton variant="primary" :icon-left="Plus" data-tour="create-notebook" @click="openCreate">Novo caderno</UiButton>
      </template>
    </UiPageHeader>

    <UiSection v-if="loading" aria-busy="true">
      <UiSkeleton v-for="i in 4" :key="i" variant="row" />
    </UiSection>
    <UiErrorState v-else-if="error" title="Não foi possível carregar seus cadernos" @retry="load" />

    <!-- One empty state only (RF-F2) -->
    <UiSection v-else-if="!roots.length">
      <UiEmptyState title="Crie seu primeiro caderno" description="Um caderno junta o que você estuda para uma prova, matéria ou idioma: materiais, cards e revisão." mascot>
        <template #action>
          <div class="flex flex-wrap justify-center gap-2">
            <UiButton variant="primary" :icon-left="Plus" data-tour="create-notebook" @click="openCreate">Criar caderno</UiButton>
            <UiButton variant="ghost" :icon-left="Download" to="/importar">Importar do Anki</UiButton>
          </div>
        </template>
      </UiEmptyState>
    </UiSection>

    <UiSection v-else flush class="px-3 py-2">
      <ul class="divide-y divide-line" aria-label="Seus cadernos" data-testid="notebook-list">
        <li v-for="t in roots" :key="t.id">
          <CadernoNotebookRow :topic="t" />
        </li>
      </ul>
    </UiSection>

    <p v-if="roots.length" class="text-meta text-fg-muted">
      Vindo do Anki? <UiLink to="/importar">Importe seus baralhos</UiLink>.
    </p>

    <LazyCadernoTopicDialog v-if="createLoaded" v-model="createOpen" mode="create" :target="null" @saved="onCreated" />
  </div>
</template>

<script setup lang="ts">
// Cadernos (prd-4b-caderno-v3 RF-F2): the list of cadernos (roots), the same rows as Hoje (dot, name,
// "N hoje", mastery bar) and "+ Novo caderno". Each caderno opens its hub, /cadernos/{id}. Old URLs
// (/cadernos?topic=…&note=…&tab=…) are sent to the new routes (RF-F1): API pending actions, e-mails and
// favorites still carry them.
import { Download, Plus } from 'lucide-vue-next'
import type { Topic, TopicProgress } from '~/types'
import { legacyCadernoRedirect } from '~/utils/scope'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

const legacy = legacyCadernoRedirect(route.query)
if (legacy) await navigateTo(legacy, { replace: true })

const progress = ref<TopicProgress[]>([])
const loading = ref(true)
const error = ref(false)
const createOpen = ref(false)
const createLoaded = useLoadedOnce(() => createOpen.value)

const roots = computed(() => progress.value.filter(t => !t.parent_id))
// Never a sum of the cadernos' sessions: each one has its own limits (Hoje has the day's number)
const meta = computed(() => (roots.value.length ? `${roots.value.length} ${roots.value.length === 1 ? 'caderno' : 'cadernos'}` : undefined))

async function load() {
  loading.value = true
  error.value = false
  try {
    const res = await $api<{ data: TopicProgress[] }>('/topics/progress')
    progress.value = res.data
  } catch (e) {
    error.value = true
    reportApiError(e, { silent: true })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createOpen.value = true
}

function onCreated(topic: Topic) {
  void navigateTo(cadernoPath(topic.id))
}

onMounted(() => {
  if (legacy) return
  void load()
  // Old graph link and "Novo caderno" from the search / Hoje (/cadernos?action=new-notebook): once
  if (route.query.view || route.query.action === 'new-notebook') {
    if (route.query.action === 'new-notebook') openCreate()
    const { view: _view, action: _action, ...query } = route.query
    void router.replace({ query })
  }
})
</script>
