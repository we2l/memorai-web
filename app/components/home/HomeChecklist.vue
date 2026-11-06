<template>
  <UiActivationChecklist
    v-if="visible"
    data-testid="home-checklist"
    :has-topics="roots.length > 0"
    :has-material="hasMaterial"
    :has-cards="(stats?.total_cards ?? 0) > 0"
    :has-reviewed="(stats?.cards_reviewed_today ?? 0) > 0 || (stats?.streak ?? 0) > 0"
    :streak="stats?.streak ?? 0"
    :topic-id="roots[0]?.id ?? null"
    :primary="primary"
    :material-hint="trialHint"
    @select="track"
  />
</template>

<script setup lang="ts">
// First steps of a new account on Hoje (prd-4a-hoje-v3 RF-F5): shown during the first 7 days (or while the
// account has no card) and while a step is missing. "Tem material" comes from the notes of the roots; only a caderno without notes asks
// GET /documents (a PDF still being read has no note yet).
import type { Stats, TopicProgress } from '~/types'
import type { ChecklistItem } from '~/components/ui/ActivationChecklist.vue'

const props = defineProps<{
  stats: Stats | null
  /** Cadernos (roots of /topics/progress) */
  roots: TopicProgress[]
  primary?: boolean
}>()

const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000
const auth = useAuthStore()
const { $api } = useNuxtApp()

const isNewAccount = computed(() => {
  const created = auth.user?.created_at
  return !!created && Date.now() - new Date(created).getTime() < NEW_ACCOUNT_MS
})

const notesInRoots = computed(() => props.roots.some(t => (t.notes_count ?? 0) > 0))
const hasDocuments = ref(false)
const hasMaterial = computed(() => notesInRoots.value || hasDocuments.value)

// The trial opens on the first material (prd-planos-lancamento RF-F2): days from the catalog, never by hand.
// Without a verified e-mail the banner of the layout says the trial asks for it.
const trialHint = useTrialInvite()

function track(item: ChecklistItem) {
  useAnalytics().track('home_checklist_click', { item })
}

// An older account that still has no card sees it too: Hoje is never an empty screen
const visible = computed(() => !!props.stats && (isNewAccount.value || (props.stats.total_cards ?? 0) === 0))

watch(() => visible.value && props.roots.length > 0 && !notesInRoots.value, async (ask) => {
  if (!ask || hasDocuments.value) return
  try {
    hasDocuments.value = (await $api<{ data: unknown[] }>('/documents')).data.length > 0
  } catch (e) {
    // Decorative step: silent on failure
    reportApiError(e, { silent: true })
  }
}, { immediate: true })
</script>
