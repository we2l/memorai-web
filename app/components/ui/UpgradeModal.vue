<template>
  <UiDialog v-model="open" size="sm" :title="title" :description="body">
    <!-- The podcast is not in the trial nor in the Free: the demo of the episode (prd-planos-lancamento RF-F3) -->
    <LazyPodcastDemo v-if="feature === 'podcast' && canUpgrade" class="pt-1" />
    <template #footer>
      <template v-if="canUpgrade">
        <UiButton variant="ghost" @click="open = false">Depois</UiButton>
        <UiButton variant="primary" @click="goToPlans">Ver planos</UiButton>
      </template>
      <UiButton v-else variant="primary" @click="open = false">Entendi</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
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
const auth = useAuthStore()
const proName = useProName()

watch(open, (value) => {
  if (value) plans.fetchPlans()
}, { immediate: true })

const catalogFeature = computed(() => plans.feature(props.feature))
const label = computed(() => catalogFeature.value?.label ?? 'usos com IA')
const canUpgrade = computed(() => props.planRequired === 'pro')

// After the trial the Free has no AI (limit 0): "Seu teste do Intensivo acabou" (prd-planos-lancamento RF-F5).
// In the trial the counts are of its 7 days, not of the month.
const trialOver = computed(() => props.limit === 0 && props.feature !== 'podcast' && auth.trialEnded)

const title = computed(() => {
  if (trialOver.value) return `Seu teste do ${proName.value} acabou`
  if (props.limit === 0) return `${capitalize(label.value)} fazem parte do ${proName.value}`
  if (props.used != null && props.limit != null) {
    return `Você usou ${props.used} de ${props.limit} ${label.value} ${auth.onTrial ? 'do teste' : 'deste mês'}`
  }
  return `Desbloqueie mais com o ${proName.value}`
})

const body = computed(() => {
  if (!canUpgrade.value) {
    const date = formatResetDate(props.resetsAt)
    return date ? `Renova em ${date}.` : 'Seu limite renova no início do próximo mês.'
  }
  const benefit = catalogFeature.value?.pro_benefit
  const offer = benefit ? `No ${proName.value}: ${benefit}.` : `O ${proName.value} libera mais IA. Sem compromisso.`
  if (trialOver.value) return `Seus cadernos, notas e cards continuam com você. ${offer}`
  if (auth.onTrial && props.feature === 'podcast') return `O podcast não entra no teste grátis. ${offer}`
  return offer
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
  useToast().clear()
  await navigateTo('/planos')
}
</script>
