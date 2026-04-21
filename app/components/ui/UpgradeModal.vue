<template>
  <UiModal v-model="open" size="sm" aria-label="Upgrade de plano">
    <div class="text-center py-4">
      <div class="w-12 h-12 rounded-full bg-accent-primary-subtle flex items-center justify-center mx-auto mb-4">
        <Zap :size="24" class="text-accent-primary" />
      </div>
      <h2 class="text-headline mb-2">Limite atingido</h2>
      <p class="text-base-secondary text-small mb-6">{{ message }}</p>
      <div class="flex gap-3 justify-center">
        <button class="btn-secondary" @click="open = false">Depois</button>
        <button class="btn-primary" @click="open = false">
          Em breve
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

const featureLabels: Record<string, string> = {
  cards_ai: 'cards IA',
  pdf_upload: 'uploads de PDF',
  agent_chat: 'dúvidas',
  podcast: 'podcasts',
}

const planLabels: Record<string, string> = {
  pro: 'Pro',
  premium: 'Premium',
}

const message = computed(() => {
  const label = featureLabels[props.feature] || 'esta feature'
  const plan = planLabels[props.planRequired] || 'Pro'
  return `Seus ${label} do mês acabaram. Faça upgrade pro plano ${plan} pra continuar.`
})
</script>
