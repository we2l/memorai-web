<template>
  <UiModal v-model="open" size="sm" aria-label="Upgrade de plano">
    <div class="text-center py-4">
      <div class="w-12 h-12 rounded-full bg-accent-primary-subtle flex items-center justify-center mx-auto mb-4">
        <Zap :size="24" class="text-accent-primary" />
      </div>
      <h2 class="text-headline mb-2">Você aproveitou bem!</h2>
      <p class="text-base-secondary text-small mb-4">{{ valueMessage }}</p>
      <p class="text-base-muted text-micro mb-6">{{ upgradeMessage }}</p>
      <div class="flex gap-3 justify-center">
        <button class="btn-secondary" @click="open = false">Depois</button>
        <button class="btn-primary" @click="goToPlans">
          Ver planos
        </button>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { Zap } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  feature?: string
  planRequired?: string
}>(), {
  feature: '',
  planRequired: 'pro',
})

const open = defineModel<boolean>({ required: true })

async function goToPlans() {
  open.value = false
  await navigateTo('/plans')
}

const featureLabels: Record<string, string> = {
  cards_ai: 'cards com IA',
  pdf_upload: 'PDFs',
  agent_chat: 'dúvidas com IA',
  podcast: 'podcasts',
}

const planLabels: Record<string, string> = {
  pro: 'Pro',
  premium: 'Premium',
}

const valueMessage = computed(() => {
  const label = featureLabels[props.feature] || 'esta feature'
  if (props.feature === 'cards_ai') {
    return `Você gerou todos os seus ${label} deste mês. Quer gerar mais?`
  }
  return `Seus ${label} do mês acabaram. Quer continuar?`
})

const upgradeMessage = computed(() => {
  const plan = planLabels[props.planRequired] || 'Pro'
  return `O plano ${plan} libera mais. Sem compromisso.`
})
</script>
