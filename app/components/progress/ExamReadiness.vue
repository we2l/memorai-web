<template>
  <div class="min-w-0" data-testid="exam-readiness">
    <template v-if="readiness?.score != null">
      <p class="text-meta text-fg">
        Prontidão: <span class="font-semibold tabular-nums text-fg-strong">{{ readiness.score }} de 100</span> · {{ readiness.band?.label }}
      </p>
      <p class="text-meta text-fg-muted" data-testid="exam-readiness-parts">{{ partsLine }}</p>

      <UiButton size="sm" variant="ghost" class="-ml-3" :aria-expanded="open" :aria-controls="explainId" @click="toggle">
        Como calculamos
      </UiButton>
      <div v-if="open" :id="explainId" class="mt-1 max-w-prose rounded-row bg-soft px-3 py-2 text-meta text-fg" data-testid="exam-readiness-explain">
        <p>O número junta as partes abaixo, cada uma de 0 a 100, pelo peso de cada uma:</p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="p in shownParts" :key="p.key">{{ readinessPartText(p) }}</li>
        </ul>
        <p v-if="readiness.capped" class="mt-1">Sem 10 questões respondidas, o número vai no máximo até 84.</p>
        <p class="mt-1">É uma estimativa do seu preparo, não da aprovação.</p>
      </div>

      <div v-if="links.length" class="mt-1">
        <p class="text-meta font-semibold text-fg-strong">Para subir</p>
        <ul class="flex flex-col">
          <li v-for="l in links" :key="l.kind">
            <UiLink :to="l.to" standalone @click="track(l.kind)">{{ l.label }}</UiLink>
          </li>
        </ul>
      </div>
    </template>
    <p v-else class="text-meta text-fg-muted" data-testid="exam-readiness-missing">{{ readinessMissingText(readiness) }}</p>
  </div>
</template>

<script setup lang="ts">
// Readiness of one future exam of the agenda (prd-prontidao-prova RF-F4), in place of the projection: number and band,
// the parts always in sight, "Como calculamos" in plain words (weights, the projection, the cap without questions,
// "não da aprovação") and up to 3 actions. Without enough data, what is left.
import type { ExamReadiness } from '~/types'
import { readinessActionLink, readinessMissingText, readinessPartsText } from '~/utils/readiness'
import { readinessPartText } from '~/utils/readinessExplain'

const props = defineProps<{ readiness: ExamReadiness | null | undefined }>()

const explainId = useId()
const open = ref(false)
const partsLine = computed(() => readinessPartsText(props.readiness?.parts ?? []))
const shownParts = computed(() => (props.readiness?.parts ?? []).filter(p => p.enabled))
const links = computed(() => (props.readiness?.actions ?? []).map(a => ({ kind: a.kind, ...readinessActionLink(a) })))

function toggle() {
  open.value = !open.value
  if (open.value) useAnalytics().track('readiness_explain_open', {})
}

function track(kind: string) {
  useAnalytics().track('readiness_action_clicked', { kind, origin: 'progress' })
}
</script>
