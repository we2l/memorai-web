<template>
  <Teleport to="body">
    <div class="schedule-print" data-testid="schedule-print">
      <h1 class="text-page-title text-fg-strong">Cronograma · {{ title }}</h1>
      <p class="mt-1 text-body text-fg">{{ subtitle }}</p>

      <section v-for="w in weeks" :key="w.monday" class="schedule-print-week mt-5">
        <h2 class="text-title font-semibold text-fg-strong">{{ w.label }}</h2>
        <table class="mt-2 w-full text-left">
          <tbody>
            <tr v-for="row in w.rows" :key="row.key">
              <td class="schedule-print-box" aria-hidden="true"><span v-if="row.session" /></td>
              <td class="schedule-print-day text-meta text-fg-muted">{{ row.day }}</td>
              <td class="text-body text-fg-strong">{{ row.text }}</td>
              <td class="text-right text-meta text-fg-muted">{{ row.length }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p v-if="finalLine" class="mt-5 text-body text-fg">{{ finalLine }}</p>

      <template v-if="invite">
        <!-- Every printed page: the fixed footer repeats in Chrome, Edge, Firefox and Safari -->
        <p class="schedule-print-footer text-label text-fg-muted">Siga este cronograma no Baigi, grátis: {{ invite }}</p>
        <section class="schedule-print-last">
          <h2 class="text-section text-fg-strong">Siga o cronograma no Baigi e lembre do que estudou</h2>
          <p class="mt-3 text-body text-fg">O Hoje diz o que estudar, os cards de cada assunto já vêm prontos e a revisão cuida da memória até a prova.</p>
          <p class="mt-3 text-body font-semibold text-fg-strong">Crie a conta grátis: {{ invite }}</p>
        </section>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// "Baixar PDF" of the cronograma (prd-cronograma RF-W2, RF-W5): the browser's print of this block alone (the page
// is hidden by html.print-schedule), week by week with a box to tick by hand. Rendered only while printing (a year
// of sessions is a thousand rows). In the free tool, the footer of each page and the last page carry the invite.
import { addDays, dayMonth, durationLabel, sessionTopicLabel, weekStart, weekdayShort, type StudySchedule } from '~/utils/studySchedule'

const props = defineProps<{
  schedule: StudySchedule
  title: string
  subtitle: string
  /** The link of the invite (free tool): footer and last page */
  invite?: string
}>()

interface Row { key: string, day: string, text: string, length: string, session: boolean }

const weeks = computed(() => {
  const out: { monday: string, label: string, rows: Row[] }[] = []
  const source = props.schedule.summary.calendar
    ? props.schedule.days.filter(d => d.phase === 'study' && d.sessions.length)
    : []
  for (const d of source) {
    const monday = weekStart(d.date)
    let week = out.at(-1)
    if (!week || week.monday !== monday) {
      week = { monday, label: `Semana de ${dayMonth(monday)} a ${dayMonth(addDays(monday, 6))}`, rows: [] }
      out.push(week)
    }
    d.sessions.forEach((s, i) => {
      week!.rows.push({
        key: s.id,
        day: i === 0 ? `${weekdayShort(d.date)} ${dayMonth(d.date)}` : '',
        text: `${s.subjectName} · ${sessionTopicLabel(s)}${s.pass === 2 && !s.unit ? ' (reforço)' : ''}`,
        length: [s.start, durationLabel(s.minutes)].filter(Boolean).join(' · '),
        session: true,
      })
    })
  }
  if (!props.schedule.summary.calendar) {
    out.push({
      monday: 'queue',
      label: 'Na ordem',
      rows: props.schedule.sessions.map(s => ({ key: s.id, day: '', text: `${s.subjectName} · ${sessionTopicLabel(s)}`, length: durationLabel(s.minutes), session: true })),
    })
  }
  return out
})

const finalLine = computed(() => {
  const start = props.schedule.summary.finalStart
  return start ? `Reta final de ${dayMonth(start)} até a véspera da prova: revisão e simulados.` : ''
})
</script>

<style>
/* Out of the screen; on paper, only this block (the free tool's list and the app's page stay out) */
.schedule-print { display: none; }
@media print {
  html.print-schedule body > :not(.schedule-print) { display: none; }
  html.print-schedule .schedule-print { display: block; color: CanvasText; background: Canvas; }
  .schedule-print table { border-collapse: collapse; }
  .schedule-print td { padding: 0.35rem 0.5rem 0.35rem 0; border-bottom: 1px solid var(--hairline); vertical-align: top; }
  .schedule-print-box { width: 1.5rem; }
  .schedule-print-box span { display: inline-block; width: 0.9rem; height: 0.9rem; border: 1px solid CanvasText; border-radius: 3px; }
  .schedule-print-day { width: 5.5rem; white-space: nowrap; }
  .schedule-print-week { break-inside: avoid; }
  .schedule-print-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; }
  .schedule-print-last { break-before: page; padding-top: 2rem; }
  html.print-schedule .schedule-print { padding-bottom: 1.5rem; }
}
</style>
