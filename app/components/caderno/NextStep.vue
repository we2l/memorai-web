<template>
  <UiSection variant="tinted" label="Próximo passo" class="flex flex-col items-start gap-3" data-testid="scope-next-step">
    <div class="min-w-0">
      <p class="text-title text-fg-strong">{{ step.title }}</p>
      <p v-if="step.detail" class="mt-1 text-meta text-fg-muted">{{ step.detail }}</p>
    </div>
    <UiButton variant="outline" size="sm" :to="action.to" :icon-left="action.icon" :icon-tone="action.tone" @click="$emit('go', step.kind)">{{ action.label }}</UiButton>
  </UiSection>
</template>

<script setup lang="ts">
// "Próximo passo" (prd-4b-caderno-v3 RF-F4; E2 RF-4.2): the only lilac block of the hub, in its side column. One rule of the server
// (RF-B4): material without cards → its workshop; errors → "Só erros"; worst subject in questions → a quiz
// of it; else continue the material opened last. The block is not rendered without a step.
import type { Component } from 'vue'
import { BookOpen, CircleHelp, RotateCcw, Sparkles } from 'lucide-vue-next'
import type { IconTone } from '~/components/ui/Button.vue'
import type { NextStepKind, ScopeNextStep } from '~/types'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{ step: ScopeNextStep }>()
defineEmits<{ (e: 'go', kind: NextStepKind): void }>()

const action = computed<{ label: string; to: string; icon: Component; tone?: IconTone }>(() => {
  const { kind, target } = props.step
  switch (kind) {
    case 'generate_cards':
      return { label: 'Gerar cards', to: `${cadernoPath(target.topic_id, { note: target.id })}?workshop=1`, icon: Sparkles, tone: 'action' }
    case 'review_errors':
      return { label: 'Reforçar erros', to: reviewPath(target.id, { errorsOnly: true }), icon: RotateCcw, tone: 'action' }
    case 'quiz':
      return { label: 'Fazer questões', to: `/simulados?topic_id=${target.id}`, icon: CircleHelp, tone: 'quiz' }
    default:
      return { label: 'Continuar leitura', to: cadernoPath(target.topic_id, { note: target.id }), icon: BookOpen }
  }
})
</script>
