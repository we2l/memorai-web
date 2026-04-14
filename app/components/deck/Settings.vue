<template>
  <div class="card overflow-hidden">
    <!-- Header (always visible) -->
    <button
      class="w-full flex items-center justify-between p-5 text-left hover:bg-surface-secondary/50 transition-colors"
      :aria-expanded="open"
      aria-controls="deck-settings-panel"
      @click="open = !open"
    >
      <div class="flex items-center gap-2">
        <Settings :size="18" class="text-base-muted" />
        <span class="text-label">Configurações de Estudo</span>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="!open" class="text-micro text-base-muted hidden sm:inline">
          {{ Math.round(retention * 100) }}% retenção · passos: {{ learningInput || 'nenhum' }} · reaprendizado: {{ relearningInput || 'nenhum' }}
        </span>
        <ChevronDown :size="16" class="text-base-muted transition-transform" :class="{ 'rotate-180': open }" />
      </div>
    </button>

    <!-- Panel (collapsible) -->
    <Transition name="collapse">
      <div v-if="open" id="deck-settings-panel" class="px-5 pb-5 space-y-5 border-t border-base">
        <!-- Learning steps -->
        <div class="pt-4">
          <label for="learning-steps" class="text-label mb-1 block">Passos de aprendizado</label>
          <input
            id="learning-steps"
            v-model="learningInput"
            type="text"
            class="input-base w-full"
            placeholder="1m 10m"
            aria-describedby="learning-help"
          />
          <p id="learning-help" class="text-micro text-base-muted mt-1">
            Quando você vê um card pela primeira vez e erra, ele aparece de novo após esses intervalos antes de ser agendado pro dia seguinte. Ex: <strong>1m 10m</strong> = aparece em 1 minuto, depois em 10 minutos. Deixe vazio para o FSRS calcular automaticamente.
          </p>
        </div>

        <!-- Relearning steps -->
        <div>
          <label for="relearning-steps" class="text-label mb-1 block">Passos de reaprendizado</label>
          <input
            id="relearning-steps"
            v-model="relearningInput"
            type="text"
            class="input-base w-full"
            placeholder="10m"
            aria-describedby="relearning-help"
          />
          <p id="relearning-help" class="text-micro text-base-muted mt-1">
            Quando você erra um card que já conhecia, ele passa por esses intervalos antes de voltar pra fila normal. Ex: <strong>10m</strong> = reaparece em 10 minutos.
          </p>
        </div>

        <!-- Desired retention -->
        <div>
          <label for="retention" class="text-label mb-1 block">
            Retenção desejada: <strong class="text-primary-400">{{ Math.round(retention * 100) }}%</strong>
          </label>
          <input
            id="retention"
            v-model.number="retention"
            type="range"
            min="0.70"
            max="0.97"
            step="0.01"
            class="w-full accent-primary-500"
            aria-describedby="retention-help"
          />
          <div class="flex justify-between text-micro text-base-muted">
            <span>70%</span>
            <span>97%</span>
          </div>
          <p id="retention-help" class="text-micro text-base-muted mt-1">
            Probabilidade de lembrar o card na próxima revisão. <strong>90% é o padrão.</strong> Mais alto = mais revisões, menos esquecimento. Mais baixo = menos revisões, mais esquecimento.
          </p>
        </div>

        <!-- Save -->
        <div class="flex justify-end">
          <button class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Settings, ChevronDown } from 'lucide-vue-next'
import type { Deck } from '~/types'

const props = defineProps<{ deck: Deck }>()
const toast = useToast()
const deckStore = useDeckStore()
const saving = ref(false)
const open = ref(false)

const learningInput = ref(formatSteps(props.deck.learning_steps))
const relearningInput = ref(formatSteps(props.deck.relearning_steps))
const retention = ref(props.deck.desired_retention ?? 0.9)

function formatSteps(steps: number[]): string {
  return steps.map(s => `${s}m`).join(' ')
}

function parseSteps(input: string): number[] {
  if (!input.trim()) return []
  return input
    .trim()
    .split(/[\s,]+/)
    .map(s => parseInt(s.replace(/m$/i, ''), 10))
    .filter(n => !isNaN(n) && n >= 1 && n <= 1439)
}

async function save() {
  saving.value = true
  try {
    await deckStore.updateSettings(props.deck.id, {
      learning_steps: parseSteps(learningInput.value),
      relearning_steps: parseSteps(relearningInput.value),
      desired_retention: retention.value,
    })
    toast.show('Configurações salvas!', 'success')
  } catch {
    toast.show('Erro ao salvar configurações.', 'error')
  } finally {
    saving.value = false
  }
}

watch(() => props.deck, (d) => {
  learningInput.value = formatSteps(d.learning_steps)
  relearningInput.value = formatSteps(d.relearning_steps)
  retention.value = d.desired_retention ?? 0.9
})
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 200ms ease-in-out;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
