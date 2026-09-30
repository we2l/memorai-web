<template>
  <UiModal v-model="open" size="sm" aria-label="Limite do plano">
    <div class="text-center py-4">
      <div class="w-12 h-12 rounded-full bg-accent-primary-subtle flex items-center justify-center mx-auto mb-4">
        <Zap :size="24" class="text-accent-primary" />
      </div>
      <h2 class="text-headline mb-2">{{ title }}</h2>
      <p class="text-base-secondary text-small mb-6">{{ body }}</p>
      <div class="flex gap-3 justify-center">
        <template v-if="canUpgrade">
          <button class="btn-secondary" @click="open = false">Depois</button>
          <button class="btn-primary" @click="goToPlans">Ver planos</button>
        </template>
        <button v-else class="btn-primary" @click="open = false">Entendi</button>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { Zap } from 'lucide-vue-next'
import type { PlanKey } from '~/types'

// Contextual to the 402 payload (PRD §4.1 / RF-56): `feature` is always a key, never a label.
const props = withDefaults(defineProps<{
  feature?: string
  used?: number | null
  limit?: number | null
  planRequired?: PlanKey | null
  resetsAt?: string | null
}>(), {
  feature: '',
  used: null,
  limit: null,
  planRequired: 'pro',
  resetsAt: null,
})

const open = defineModel<boolean>({ required: true })

const plans = usePlans()

watch(open, (value) => {
  if (value) plans.fetchPlans()
}, { immediate: true })

const catalogFeature = computed(() => plans.feature(props.feature))
const label = computed(() => catalogFeature.value?.label ?? 'usos com IA')
const canUpgrade = computed(() => props.planRequired === 'pro')

const title = computed(() => {
  if (props.limit === 0) return `${capitalize(label.value)} fazem parte do Pro`
  if (props.used != null && props.limit != null) {
    return `Você usou ${props.used} de ${props.limit} ${label.value} deste mês`
  }
  return 'Desbloqueie mais com o Pro'
})

const body = computed(() => {
  if (!canUpgrade.value) {
    const date = formatResetDate(props.resetsAt)
    return date ? `Renova em ${date}.` : 'Seu limite renova no início do próximo mês.'
  }
  const benefit = catalogFeature.value?.pro_benefit
  return benefit ? `No Pro: ${benefit}.` : 'O Pro libera mais IA. Sem compromisso.'
})

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatResetDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
}

async function goToPlans() {
  useAnalytics().track('upgrade_clicked', { feature: props.feature || null, billing: null, source: 'upgrade_modal' })
  open.value = false
  await navigateTo('/planos')
}
</script>
