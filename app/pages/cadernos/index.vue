<template>
  <div class="mx-auto flex max-w-page flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <UiPageHeader title="Cadernos" :meta="meta">
      <template v-if="roots.length" #actions>
        <UiButton variant="outline" :icon-left="FileText" to="/cadernos/edital" data-testid="edital-entry">Montar pelo edital</UiButton>
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
            <UiButton variant="outline" :icon-left="FileText" to="/cadernos/edital" data-testid="edital-entry">Montar pelo edital</UiButton>
            <UiButton variant="ghost" :icon-left="Download" to="/importar">Importar do Anki</UiButton>
          </div>
        </template>
      </UiEmptyState>
    </UiSection>

    <!-- E2 (prd-visual-e2 RF-4.1): cards in a grid, 1 column on the phone and 2–3 on the desktop, plus "Novo caderno" -->
    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5" aria-label="Seus cadernos" data-testid="notebook-list">
      <li v-for="t in roots" :key="t.id" class="flex">
        <CadernoNotebookCard :topic="t" class="w-full" />
      </li>
      <li class="flex">
        <button type="button" class="flex min-h-40 w-full flex-col items-center justify-center gap-1.5 rounded-card bg-soft p-5 text-center transition-colors duration-fast hover:bg-sunk" data-testid="notebook-new" @click="openCreate">
          <Plus class="size-5 text-fg-muted" aria-hidden="true" />
          <span class="font-semibold text-fg-strong">Novo caderno</span>
          <span class="text-meta text-fg-muted">PDF, nota, Anki ou questões coladas</span>
        </button>
      </li>
    </ul>

    <p v-if="roots.length" class="text-meta text-fg-muted">
      Vindo do Anki? <UiLink to="/importar">Importe seus baralhos</UiLink>.
    </p>
    <p v-if="trashCount" class="text-meta text-fg-muted">
      <UiLink to="/cadernos/lixeira" variant="muted" standalone data-testid="trash-link">Lixeira ({{ trashCount }})</UiLink>
    </p>

    <LazyCadernoTopicDialog v-if="createLoaded" v-model="createOpen" mode="create" :target="null" @saved="onCreated" />
  </div>
</template>

<script setup lang="ts">
// Cadernos (prd-4b-caderno-v3 RF-F2; E2 RF-4.1): the cadernos (roots) as cards in a grid (initial and dot, name, mastery
// in the Fraunces, "N hoje") and "+ Novo caderno". Each caderno opens its hub, /cadernos/{id}. Old URLs
// (/cadernos?topic=…&note=…&tab=…) are sent to the new routes (RF-F1): API pending actions, e-mails and
// favorites still carry them.
import { Download, FileText, Plus } from 'lucide-vue-next'
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
// "Lixeira (N)" (prd-4b-caderno-v3 RF-F16): after the list, also when the last caderno is the one in the trash
const trashCount = ref(0)
// Never a sum of the cadernos' sessions: each one has its own limits (Hoje has the day's number)
const meta = computed(() => (roots.value.length ? `${roots.value.length} ${roots.value.length === 1 ? 'caderno' : 'cadernos'}` : undefined))

async function load(silent = false) {
  if (!silent) loading.value = true
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

async function loadTrash() {
  try {
    const res = await $api<{ data: unknown[] }>('/trash')
    trashCount.value = res.data.length
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

// "Desfazer" of a toast restored something while this list is open (composables/useTrashBatch.ts)
watch(useState<number>('trash-version', () => 0), () => { void load(true).then(loadTrash) })

onMounted(() => {
  if (legacy) return
  void load().then(loadTrash)
  // Old graph link and "Novo caderno" from the search / Hoje (/cadernos?action=new-notebook): once
  if (route.query.view || route.query.action === 'new-notebook') {
    if (route.query.action === 'new-notebook') openCreate()
    const { view: _view, action: _action, ...query } = route.query
    void router.replace({ query })
  }
})
</script>

