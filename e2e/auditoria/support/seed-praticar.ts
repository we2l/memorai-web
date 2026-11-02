import type { Page } from '@playwright/test'
import { apiCall, doc, tinker, uid, USERS, type UserKey } from './fixtures'

/**
 * Data of the Praticar v3 specs (prd-4e-praticar-v3), created through the API and tinker, no AI:
 * - a caderno "TRF" with the matérias Constitucional (assunto Controle) and Português, each with a note of 150
 *   words (word_count set in the database: the note itself stays under 50 characters, so no embedding job) and
 *   cards (POST /ai/accept-cards, the real persistence route);
 * - a finished bateria of Controle with 12 questions (5 right: 42% of accuracy, the weak assunto), and a newer
 *   one with 4 questions (1 right, 3 wrong, each wrong one in its assunto), previous = the first;
 * - three ready episodes over the cards: one of the morning (origin daily), one heard 40% and one heard to the
 *   end; each with a debate script of 3 sections and their marks (the transcript comes from the API).
 */
export interface PraticarSeed {
  rootId: string
  constId: string
  ctrlId: string
  ptId: string
  cardIds: string[]
  oldQuizId: string
  quizId: string
  dailyId: string
  halfId: string
  doneId: string
}

export const SILENCE = 'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA=='
/** 3 sections ([CARD_BREAK]) of 2 lines of the same length: each line takes half of its section */
export const SCRIPT = [
  'Mentor: Ontem você errou o controle difuso duas vezes.\nEstudante: Então vamos começar por ele hoje mesmo.',
  'Mentor: No controle difuso qualquer juiz decide o caso.\nEstudante: E a decisão vale só entre as partes então.',
  'Mentor: Para valer para todos entra o Senado Federal.\nEstudante: Pelo artigo cinquenta e dois inciso dez claro.',
].join('\n[CARD_BREAK]\n')
export const MARKS = [{ type: 'intro', start_ms: 0, end_ms: 100_000 }, { type: 'card', start_ms: 100_000, end_ms: 200_000 }, { type: 'outro', start_ms: 200_000, end_ms: 300_000 }]

export function php(key: UserKey, code: string): string {
  return tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS[key].email}')->firstOrFail(); ${code}`)
}

const ids = (list: string[]) => `[${list.map(i => `'${i}'`).join(',')}]`

async function noteWithWords(page: Page, key: UserKey, topicId: string, title: string) {
  const note = (await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title })).data
  await apiCall(page, 'PUT', `/notes/${note.id}`, { content: doc('Resumo curto.') })
  php(key, `Illuminate\\Support\\Facades\\DB::table('notes')->where('id', '${note.id}')->update(['word_count' => 150]); echo 'ok';`)
  return note.id as string
}

async function cards(page: Page, topicId: string, n: number, prefix: string): Promise<string[]> {
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topicId, cards: Array.from({ length: n }, (_, i) => ({ front: `${prefix} ${i + 1}?`, back: `${prefix} resposta ${i + 1}` })) })
  const list = (await apiCall(page, 'GET', `/topics/${topicId}/flashcards?page=1&per_page=50`)).data as any[]
  return list.filter(c => String(c.front).startsWith(`${prefix} `)).map(c => c.id)
}

/**
 * A finished quiz straight in the database (learning mode, multiple choice "a) … d)"): `answers` = [topicId,
 * right?] per question, in order.
 */
export function seedQuiz(key: UserKey, topicId: string, title: string, answers: [string, boolean][], opts: { status?: string; minutesAgo?: number } = {}): string {
  const status = opts.status ?? 'completed'
  const right = answers.filter(a => a[1]).length
  const rows = answers.map(([t, ok], i) => `['${t}', ${i + 1}, ${ok ? 'true' : 'false'}]`).join(',')
  const done = status === 'completed'
  const out = php(key, `
    $at = now()->subMinutes(${opts.minutesAgo ?? 0});
    $q = App\\Domain\\Quiz\\Models\\Quiz::create(['user_id' => $u->id, 'topic_id' => '${topicId}', 'title' => '${title}', 'status' => '${status}', 'mode' => 'learning', 'config' => ['quantity' => ${answers.length}, 'types' => ['multiple_choice'], 'difficulty' => 'mixed'], 'total_questions' => ${answers.length}, 'correct_count' => ${done ? right : 'null'}, 'score_percent' => ${done ? Math.round((right * 100) / answers.length) : 'null'}, 'time_spent_seconds' => ${done ? 600 : 0}, 'started_at' => ${done ? '$at->copy()->subMinutes(10)' : 'null'}, 'completed_at' => ${done ? '$at' : 'null'}]);
    $q->forceFill(['created_at' => $at->copy()->subMinutes(10)])->save();
    foreach ([${rows}] as [$t, $pos, $ok]) {
      App\\Domain\\Quiz\\Models\\QuizQuestion::create(['quiz_id' => $q->id, 'topic_id' => $t, 'position' => $pos, 'type' => 'multiple_choice', 'difficulty' => 'medium', 'stem' => "Questão $pos do teste", 'options' => ['a) Primeira', 'b) Segunda', 'c) Terceira', 'd) Quarta'], 'correct_answer' => 'b', 'explanation' => 'A correta é a segunda.', 'user_answer' => ${done ? "$ok ? 'b) Segunda' : 'a) Primeira'" : 'null'}, 'is_correct' => ${done ? '$ok' : 'null'}, 'answered_at' => ${done ? '$at' : 'null'}]);
    }
    echo 'QUIZ_ID=' . $q->id;
  `)
  const id = out.match(/QUIZ_ID=([0-9a-f-]{36})/)?.[1]
  if (!id) throw new Error(`simulado não criado:\n${out}`)
  return id
}

export function seedEpisode(key: UserKey, topicId: string, title: string, cardIds: string[], opts: { origin?: 'daily' | 'manual'; listened?: number; completed?: boolean; hoursAgo?: number } = {}): string {
  const script = SCRIPT.replace(/'/g, "\\'")
  const out = php(key, `
    $p = new App\\Domain\\Podcast\\Models\\Podcast();
    $p->forceFill(['user_id' => $u->id, 'topic_id' => '${topicId}', 'title' => '${title}', 'status' => 'ready', 'audio_url' => '${SILENCE}', 'duration_seconds' => 300, 'content_mode' => 'weak_points', 'card_ids' => ${ids(cardIds)}, 'script' => '${script}', 'segment_timestamps' => json_decode('${JSON.stringify(MARKS)}', true), 'origin' => '${opts.origin ?? 'manual'}', 'listened_seconds' => ${opts.listened ?? 0}, 'completed_at' => ${opts.completed ? 'now()' : 'null'}])->save();
    $p->forceFill(['created_at' => now()->subHours(${opts.hoursAgo ?? 1})])->save();
    echo 'PODCAST_ID=' . $p->id;
  `)
  const id = out.match(/PODCAST_ID=([0-9a-f-]{36})/)?.[1]
  if (!id) throw new Error(`episódio não criado:\n${out}`)
  return id
}

export async function ensurePraticarSeed(page: Page, key: UserKey = 'praticar'): Promise<PraticarSeed> {
  const cached = php(key, `echo 'SEED=' . json_encode(Illuminate\\Support\\Facades\\Cache::get('e2e-praticar-seed-' . $u->id));`).match(/SEED=(.*)/)?.[1]
  if (cached && cached !== 'null') return JSON.parse(cached) as PraticarSeed

  const root = (await apiCall(page, 'POST', '/topics', { name: `TRF Praticar ${uid()}` })).data
  const cnst = (await apiCall(page, 'POST', '/topics', { name: 'Constitucional', parent_id: root.id })).data
  const ctrl = (await apiCall(page, 'POST', '/topics', { name: 'Controle', parent_id: cnst.id })).data
  const pt = (await apiCall(page, 'POST', '/topics', { name: 'Português', parent_id: root.id })).data
  await noteWithWords(page, key, ctrl.id, 'Resumo Controle')
  await noteWithWords(page, key, pt.id, 'Resumo Português')
  const ctrlCards = await cards(page, ctrl.id, 6, 'Controle')
  await cards(page, pt.id, 4, 'Português')

  const oldQuizId = seedQuiz(key, ctrl.id, 'Questões antigas', Array.from({ length: 12 }, (_, i) => [ctrl.id, i < 5] as [string, boolean]), { minutesAgo: 120 })
  const quizId = seedQuiz(key, ctrl.id, 'Questões de Controle', [[ctrl.id, true], [ctrl.id, false], [cnst.id, false], [pt.id, false]], { minutesAgo: 5 })

  const dailyId = seedEpisode(key, root.id, 'Seus erros de ontem', ctrlCards.slice(0, 3), { origin: 'daily', hoursAgo: 3 })
  const halfId = seedEpisode(key, cnst.id, 'Controle pela metade', ctrlCards.slice(0, 2), { listened: 120, hoursAgo: 30 })
  const doneId = seedEpisode(key, pt.id, 'Português ouvido', ctrlCards.slice(2, 4), { listened: 300, completed: true, hoursAgo: 50 })

  const seed: PraticarSeed = { rootId: root.id, constId: cnst.id, ctrlId: ctrl.id, ptId: pt.id, cardIds: ctrlCards, oldQuizId, quizId, dailyId, halfId, doneId }
  php(key, `Illuminate\\Support\\Facades\\Cache::put('e2e-praticar-seed-' . $u->id, json_decode('${JSON.stringify(seed)}', true), 3600); echo 'ok';`)
  return seed
}

/**
 * The audio element without audio (tests): currentTime/duration/paused are the test's, play()/load() resolve
 * at once and `window.__audio` moves the clock (timeupdate) or ends the episode (ended).
 */
export async function fakeAudio(page: Page, durationSeconds = 300) {
  await page.addInitScript((duration) => {
    const st = new WeakMap<HTMLMediaElement, { t: number; d: number; paused: boolean }>()
    const s = (el: HTMLMediaElement) => { let v = st.get(el); if (!v) { v = { t: 0, d: Number.NaN, paused: true }; st.set(el, v) } return v }
    const proto = HTMLMediaElement.prototype
    Object.defineProperty(proto, 'currentTime', { configurable: true, get() { return s(this).t }, set(v: number) { const x = s(this); x.t = Math.max(0, Number.isNaN(x.d) ? v : Math.min(v, x.d)); this.dispatchEvent(new Event('timeupdate')) } })
    Object.defineProperty(proto, 'duration', { configurable: true, get() { return s(this).d } })
    Object.defineProperty(proto, 'paused', { configurable: true, get() { return s(this).paused } })
    proto.play = function () { s(this).paused = false; return Promise.resolve() }
    proto.pause = function () { s(this).paused = true }
    proto.load = function () { const x = s(this); x.d = duration; x.t = 0; setTimeout(() => this.dispatchEvent(new Event('loadedmetadata')), 0) }
    const el = () => document.getElementById('global-audio') as HTMLMediaElement
    ;(window as any).__audio = {
      seek: (t: number) => { el().currentTime = t },
      end: () => { const a = el(); a.currentTime = duration; s(a).paused = true; a.dispatchEvent(new Event('ended')) },
      time: () => el()?.currentTime ?? 0,
    }
  }, durationSeconds)
}
