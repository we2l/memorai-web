<template>
  <UiActivationChecklist
    v-if="visible"
    data-testid="home-checklist"
    :has-material="state.hasMaterial"
    :has-cards="state.hasCards"
    :has-reviewed="state.hasOwnBatch"
    :streak="state.streak"
    :topic-id="ownRoot?.id ?? null"
    :primary="primary"
    :material-hint="trialHint"
    @select="track"
  />
</template>

<script setup lang="ts">
// First steps of a new account on Hoje (prd-4a-hoje-v3 RF-F5): shown during the first 7 days (or while the
// account has no own card) and while a step is missing. Only what is not the onboarding sample counts
// (prd-ativacao-material-proprio H2), from GET /stats → own and /me.first_own_batch_at. An older API without `own`:
// "tem material" comes from the notes of the roots, and only a caderno without notes asks GET /documents.
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
const state = computed(() => checklistState(props.stats, auth.user, notesInRoots.value || hasDocuments.value))
// "Gerar seus cards" opens the first own caderno (never the sample)
const ownRoot = computed(() => props.roots.find(t => !t.is_sample) ?? null)

// The trial opens on the first material (prd-planos-lancamento RF-F2): days from the catalog, never by hand.
// Without a verified e-mail the banner of the layout says the trial asks for it.
const trialHint = useTrialInvite()

function track(item: ChecklistItem) {
  useAnalytics().track('home_checklist_click', { item })
}

// An older account that still has no card sees it too: Hoje is never an empty screen
const visible = computed(() => !!props.stats && (isNewAccount.value || ownCards(props.stats) === 0))

watch(() => visible.value && !props.stats?.own && props.roots.length > 0 && !notesInRoots.value, async (ask) => {
  if (!ask || hasDocuments.value) return
  try {
    hasDocuments.value = (await $api<{ data: unknown[] }>('/documents')).data.length > 0
  } catch (e) {
    // Decorative step: silent on failure
    reportApiError(e, { silent: true })
  }
}, { immediate: true })
</script>
