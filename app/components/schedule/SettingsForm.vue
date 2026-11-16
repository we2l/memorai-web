<template>
  <div class="flex flex-col gap-6">
    <fieldset class="min-w-0">
      <legend class="mb-1 text-body font-semibold text-fg-strong">Quantas horas por dia?</legend>
      <p class="mb-3 text-meta text-fg-muted">{{ reviewMinutes ? `A revisão dos cards (${reviewMinutes} min por dia) sai dessas horas.` : 'Conte só o tempo de estudo do dia.' }}</p>
      <ul class="flex flex-col divide-y divide-hairline">
        <li v-for="wd in ORDER" :key="wd" class="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-x-3 py-2" :class="withStart && 'sm:grid-cols-[minmax(0,1fr)_7.5rem_8rem]'">
          <span :id="`${uid}-d${wd}`" class="text-body text-fg-strong">{{ WEEKDAY_NAMES[wd] }}</span>
          <UiSelect
            :model-value="String(model.hours[wd] ?? 0)"
            :options="HOUR_OPTIONS"
            :aria-labelledby="`${uid}-d${wd}`"
            :data-testid="`schedule-hours-${wd}`"
            @update:model-value="v => setHours(wd, Number(v))"
          />
          <UiInput
            v-if="withStart"
            :model-value="model.startTimes?.[wd] ?? ''"
            type="time"
            label="Começa às"
            hide-label
            :aria-label="`${WEEKDAY_NAMES[wd]}: começa às`"
            :disabled="!model.hours[wd]"
            class="col-span-2 mt-2 sm:col-span-1 sm:mt-0"
            @update:model-value="v => setStart(wd, v)"
          />
        </li>
      </ul>
      <UiButton v-if="!withStart" variant="ghost" size="sm" class="mt-1" data-testid="schedule-start-open" @click="withStart = true">Pôr o horário de início (para a agenda)</UiButton>
    </fieldset>

    <div>
      <p :id="`${uid}-len`" class="mb-2 text-body font-semibold text-fg-strong">Tamanho da sessão</p>
      <UiSegmented :model-value="model.sessionMinutes" :options="SESSION_LABELS" label="Tamanho da sessão" data-testid="schedule-session" @update:model-value="v => update({ sessionMinutes: Number(v) })" />
    </div>

    <fieldset v-if="subjects.length" class="min-w-0">
      <legend class="mb-1 text-body font-semibold text-fg-strong">Peso das matérias</legend>
      <p class="mb-3 text-meta text-fg-muted">Quem pesa mais aparece mais vezes. Mude o peso se o edital diz outra coisa{{ withLevels ? ', e diga de onde você parte em cada matéria' : '' }}.</p>
      <ul class="flex flex-col divide-y divide-hairline">
        <li v-for="s in subjects" :key="s.id" class="grid gap-x-3 gap-y-2 py-3" :class="withLevels ? 'grid-cols-[minmax(0,1fr)_6rem] sm:grid-cols-[minmax(0,1fr)_6rem_10rem]' : 'grid-cols-[minmax(0,1fr)_6rem]'">
          <div class="min-w-0">
            <p :id="`${uid}-s${s.id}`" class="break-words text-body text-fg-strong">{{ s.name }}</p>
            <p class="text-meta text-fg-muted">{{ originText(s) }}</p>
          </div>
          <UiInput
            :model-value="weightValue(s)"
            type="number"
            inputmode="decimal"
            min="0"
            max="1000"
            step="any"
            label="Peso"
            hide-label
            :aria-label="`Peso de ${s.name}`"
            :placeholder="String(s.topics)"
            :data-testid="`schedule-weight-${s.id}`"
            @update:model-value="v => setWeight(s, v)"
          />
          <UiSelect
            v-if="withLevels"
            :model-value="model.levels[s.id] ?? 'studied'"
            :options="LEVEL_OPTIONS"
            :aria-label="`De onde você parte em ${s.name}`"
            class="col-span-2 sm:col-span-1"
            @update:model-value="v => setLevel(s.id, v as ScheduleLevel)"
          />
        </li>
      </ul>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
// Hours, session and weight of the cronograma (prd-cronograma RF-W2; estudo §4.1): 7 rows of hours (0 to 8 h in
// half hours, Monday first), an optional start time per day (the .ics hour), the session of 30/60/90 min and, per
// matéria, the weight with its origin ("do edital: 20 pontos" or "pelo tamanho") and the optional level. The same
// form serves the sheet of the caderno and the free tool (without the level there).
import { WEEKDAY_NAMES, type ScheduleDraft, type ScheduleLevel } from '~/utils/studySchedule'

export interface ScheduleFormSubject {
  id: string
  name: string
  /** Assuntos (the size) */
  topics: number
  /** Points from the edital; null = by size */
  editalPoints: number | null
}

withDefaults(defineProps<{
  subjects: ScheduleFormSubject[]
  reviewMinutes?: number
  withLevels?: boolean
}>(), { reviewMinutes: 0, withLevels: true })

const model = defineModel<ScheduleDraft>({ required: true })

const uid = useId()
const ORDER = [1, 2, 3, 4, 5, 6, 0] as const
const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const h = i / 2
  const whole = Math.floor(h)
  return { value: String(h), label: h === 0 ? 'Folga' : `${whole ? `${whole} h` : ''}${h % 1 ? `${whole ? ' ' : ''}30${whole ? '' : ' min'}` : ''}` }
})
const SESSION_LABELS = [{ value: 30, label: '30 min' }, { value: 60, label: '1 h' }, { value: 90, label: '1 h 30' }]
const LEVEL_OPTIONS = [
  { value: 'studied', label: 'Já estudei' },
  { value: 'beginner', label: 'Começo do zero' },
  { value: 'mastered', label: 'Domino' },
]

const withStart = ref(!!model.value.startTimes?.some(Boolean))

function update(patch: Partial<ScheduleDraft>) {
  model.value = { ...model.value, ...patch }
}

function setHours(wd: number, h: number) {
  const hours = [...model.value.hours]
  hours[wd] = h
  update({ hours })
}

function setStart(wd: number, v: string) {
  const startTimes = model.value.startTimes ? [...model.value.startTimes] : Array.from({ length: 7 }, () => null as string | null)
  startTimes[wd] = /^\d{2}:\d{2}$/.test(v) ? v : null
  update({ startTimes: startTimes.some(Boolean) ? startTimes : null })
}

function weightValue(s: ScheduleFormSubject): string {
  const manual = model.value.weights[s.id]
  if (manual !== undefined) return String(manual)
  return s.editalPoints !== null ? String(s.editalPoints) : ''
}

function setWeight(s: ScheduleFormSubject, v: string) {
  const weights = { ...model.value.weights }
  const n = Number(v.replace(',', '.'))
  // Empty or the edital's own number: back to the origin
  if (v.trim() === '' || !Number.isFinite(n) || n < 0 || n === s.editalPoints) delete weights[s.id]
  else weights[s.id] = Math.min(1000, n)
  update({ weights })
}

function setLevel(id: string, level: ScheduleLevel) {
  const levels = { ...model.value.levels }
  if (level === 'studied') delete levels[id]
  else levels[id] = level
  update({ levels })
}

function originText(s: ScheduleFormSubject): string {
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const size = `pelo tamanho: ${s.topics} ${s.topics === 1 ? 'assunto' : 'assuntos'}`
  if (model.value.weights[s.id] !== undefined) return s.editalPoints !== null ? `Seu peso (do edital: ${fmt(s.editalPoints)} pontos)` : `Seu peso (${size})`
  return s.editalPoints !== null ? `Do edital: ${fmt(s.editalPoints)} pontos` : `Peso ${size.charAt(0).toLowerCase()}${size.slice(1)}`
}

</script>
