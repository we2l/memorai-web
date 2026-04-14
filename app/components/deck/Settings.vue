<template>
  <div class="card p-5 space-y-5">
    <h3 class="text-headline flex items-center gap-2">
      <Settings :size="18" /> Configurações de Estudo
    </h3>

    <!-- Learning steps -->
    <div>
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
        {{ saving ? 'Salvando...' : 'Salvar configurações' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import type { Deck } from '~/types'

const props = defineProps<{ deck: Deck }>()
const toast = useToast()
const deckStore = useDeckStore()
const saving = ref(false)

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
