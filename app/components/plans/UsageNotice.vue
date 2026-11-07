<template>
  <p
    v-if="line"
    role="status"
    class="text-label"
    :class="line.kind === 'near' || line.kind === 'preview' ? 'text-fg-muted' : 'text-fg'"
    data-testid="usage-notice"
    :data-kind="line.kind"
  >
    {{ line.text }}
    <UiLink v-if="line.kind === 'spent'" to="/planos" data-testid="usage-notice-plans">Conhecer o {{ proName }}</UiLink>
  </p>
</template>

<script setup lang="ts">
// Uso justo (prd-uso-justo RF-F3, §9): one quiet line where the AI action happens.
// - Intensivo: from 80% of the month's quota, "Restam N de M <rótulo> este mês."; at the limit, the sentence with
//   the day the count starts again (the action next to it is disabled by the screen, through `usage.atLimit`).
// - Free on the preview (period lifetime): "Prévia grátis: 3 de 10 <rótulo>."; once spent, the invitation to the
//   paid plan (the click still reaches the server, whose 402 opens the UpgradeModal).
// The screen passes its own usePaidQuota(), so /usage is read once per screen; a screen tight on budget passes
// none and listens to `at-limit` (the notice reads /usage itself, once). Used as <LazyPlansUsageNotice>: the
// texts stay out of the screens' chunks.
import { usageNotice } from '~/utils/usageNotice'
import { checkoutAvailable } from '~/utils/checkout'
import { previewNotice } from '~/utils/preview'

const props = defineProps<{
  feature: string
  usage?: ReturnType<typeof usePaidQuota>
}>()
const emit = defineEmits<{ 'at-limit': [boolean] }>()

const own = props.usage ? null : usePaidQuota()
const quota = props.usage ?? own!
onMounted(() => { if (own) void own.fetchUsageForNotice() })
watch(() => quota.atLimit(props.feature), at => emit('at-limit', at), { immediate: true })

const { plans } = usePlans()
const proName = useProName()
const canSubscribe = computed(() => checkoutAvailable(plans.value))

const line = computed(() => {
  const data = quota.usage.value
  if (!data) return null
  const label = plans.value?.features?.[props.feature]?.label ?? 'usos com IA'
  const f = data.features?.[props.feature]
  if (quota.preview.value) return previewNotice(f, label, proName.value, canSubscribe.value)
  if (!quota.paid.value) return null
  return usageNotice(f, label, data.resets_at ?? null)
})
</script>
