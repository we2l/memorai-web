<template>
  <p
    v-if="line"
    role="status"
    class="text-label"
    :class="line.kind === 'limit' ? 'text-fg' : 'text-fg-muted'"
    data-testid="usage-notice"
    :data-kind="line.kind"
  >
    {{ line.text }}
  </p>
</template>

<script setup lang="ts">
// Uso justo (prd-uso-justo RF-F3): one quiet line where the AI action happens, for the paid plan only.
// From 80% of the month's quota, "Restam N de M <rótulo> este mês."; at the limit, the sentence with the day the
// count starts again (the action next to it is disabled by the screen, through `usage.atLimit`). Free and trial:
// nothing here. The screen passes its own usePaidQuota(), so /usage is read once per screen; a screen tight on
// budget passes none and listens to `at-limit` (the notice reads /usage itself, once). Used as
// <LazyPlansUsageNotice>: the texts stay out of the screens' chunks.
import { usageNotice } from '~/utils/usageNotice'

const props = defineProps<{
  feature: string
  usage?: ReturnType<typeof usePaidQuota>
}>()
const emit = defineEmits<{ 'at-limit': [boolean] }>()

const own = props.usage ? null : usePaidQuota()
const quota = props.usage ?? own!
onMounted(() => { if (own) void own.fetchUsageIfPaid() })
watch(() => quota.atLimit(props.feature), at => emit('at-limit', at), { immediate: true })

const { plans } = usePlans()

const line = computed(() => {
  const data = quota.usage.value
  if (!quota.paid.value || !data) return null
  const label = plans.value?.features?.[props.feature]?.label ?? 'usos com IA'
  return usageNotice(data.features?.[props.feature], label, data.resets_at ?? null)
})
</script>
