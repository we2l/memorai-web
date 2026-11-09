<template>
  <div v-if="!dismissed" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-control bg-soft px-3 py-2" data-testid="exam-move-offer">
    <p class="min-w-0 text-meta text-fg">
      “{{ examTitle }}” está no caderno de exemplo. Mover para <strong class="font-semibold text-fg-strong">{{ target.name }}</strong>?
    </p>
    <div class="flex flex-wrap gap-2">
      <UiButton size="sm" variant="ghost" data-testid="exam-move-dismiss" @click="dismiss">Agora não</UiButton>
      <UiButton size="sm" :loading="pending" data-testid="exam-move" @click="move">Mover a prova</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// The exam of the onboarding lives on the sample caderno (prd-revisao-v5-fase-b RF-F12, B-D13): once the person has a
// caderno of their own, one tap moves its coverage to that caderno (PUT /exams/{id} with the caderno: the whole caderno
// is covered). "Agora não" hides it on this device. Neutral block: the screen's primary stays where it is.
const props = defineProps<{
  examId: string
  examTitle: string
  target: { topic_id: string; name: string }
  origin: 'home' | 'caderno'
}>()
const emit = defineEmits<{ (e: 'moved'): void }>()

const key = computed(() => `baigi-exam-move-dismissed-${props.examId}`)
const dismissed = ref(false)
onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(key.value) === '1'
  } catch { /* intencional: sem localStorage, a oferta aparece de novo */ }
})

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(key.value, '1')
  } catch { /* intencional: sem localStorage, só some nesta tela */ }
  useAnalytics().track('exam_move_offer', { action: 'dismissed', origin: props.origin })
}

const { $api } = useNuxtApp()
const { run, pending } = useApiAction()
async function move() {
  const res = await run(() => $api(`/exams/${props.examId}`, { method: 'PUT', body: { topic_ids: [props.target.topic_id] } }), {
    success: `Prova movida para ${props.target.name}`,
    error: 'Não foi possível mover a prova.',
  })
  if (res === undefined) return
  useAnalytics().track('exam_move_offer', { action: 'moved', origin: props.origin })
  emit('moved')
}
</script>
