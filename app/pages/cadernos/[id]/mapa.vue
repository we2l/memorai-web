<template>
  <div class="mx-auto flex max-w-page flex-col gap-2 pt-2 pb-6 md:pt-8">
    <div class="px-gutter">
      <UiPageHeader :title="title" meta="Seus materiais organizados por assunto" :back="{ to: hubPath, label: scopeName || 'Caderno' }" />
    </div>
    <TopicMindMapView :topic-id="id" @create-note="createNote" />
  </div>
</template>

<script setup lang="ts">
// Map of a scope (prd-4b-caderno-v3 §3.2, tasks 7.4): the old Map tab moved to its own route, without
// redesign. Automatic map of the materials; the AI map stays Pro (UpgradeModal on 402).
const route = useRoute()
const topicStore = useTopicStore()
const scopeStore = useScopeStore()

const id = computed(() => String(route.params.id))
const hubPath = computed(() => cadernoPath(id.value))
const scopeTopic = computed(() => topicStore.findById(id.value))
const scopeName = computed(() => (scopeStore.topicId === id.value ? scopeStore.summary?.topic.name : null) ?? scopeTopic.value?.name ?? '')
const title = computed(() => (scopeTopic.value && !scopeTopic.value.parent_id ? 'Mapa do caderno' : 'Mapa'))

onMounted(() => { if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree() })
useHead(() => ({ title: `Mapa de ${scopeName.value || 'caderno'} · Baigi` }))

async function createNote() {
  try {
    const note = await useNoteStore().create(id.value, { title: 'Novo material' })
    await navigateTo(cadernoPath(id.value, { note: note.id }))
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível criar a nota. Tente de novo.' })
  }
}
</script>
