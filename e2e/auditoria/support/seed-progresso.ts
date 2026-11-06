import type { Page } from '@playwright/test'
import { apiCall, tinker, uid, USERS, type UserKey } from './fixtures'
import { seedQuiz } from './seed-praticar'

/**
 * Data of the Progresso v3 spec (prd-4f-progresso-v3), through the API and tinker, no AI:
 * - a concurso caderno with the matérias Constitucional (25 cards, 12 reviewed today through POST /review, the
 *   real route: reviews of the study day and stability for the projection) and Português (3 cards, never
 *   reviewed) and a finished bateria of Constitucional with 12 questions and 4 right (33%: "Treinar");
 * - an exam in 42 days covering the caderno (projection with data), one in 30 days covering Português (too few
 *   cards: projection null) and a past one without an answer ("Passei / Não passei").
 */
export interface ProgressoSeed {
  rootId: string
  rootName: string
  constId: string
  ptId: string
  examId: string
  smallExamId: string
  pastExamId: string
}

const php = (key: UserKey, code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS[key].email}')->firstOrFail(); ${code}`)

export const isoDays = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

export async function ensureProgressoSeed(page: Page, key: UserKey = 'progresso'): Promise<ProgressoSeed> {
  const cached = php(key, `echo 'SEED=' . json_encode(Illuminate\\Support\\Facades\\Cache::get('e2e-progresso-seed-' . $u->id));`).match(/SEED=(.*)/)?.[1]
  if (cached && cached !== 'null') return JSON.parse(cached) as ProgressoSeed

  const rootName = `TRF Progresso ${uid()}`
  const root = (await apiCall(page, 'POST', '/topics', { name: rootName, learning_mode: 'exam' })).data
  const cnst = (await apiCall(page, 'POST', '/topics', { name: 'Constitucional', parent_id: root.id })).data
  const pt = (await apiCall(page, 'POST', '/topics', { name: 'Português', parent_id: root.id })).data
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: cnst.id, cards: Array.from({ length: 25 }, (_, i) => ({ front: `Constitucional ${i + 1}?`, back: `Resposta ${i + 1}` })) })
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: pt.id, cards: Array.from({ length: 3 }, (_, i) => ({ front: `Português ${i + 1}?`, back: `Resposta ${i + 1}` })) })
  const cards = (await apiCall(page, 'GET', `/topics/${cnst.id}/flashcards?page=1&per_page=50`)).data as any[]
  for (const c of cards.slice(0, 12)) await apiCall(page, 'POST', '/review', { flashcard_id: c.id, rating: 3 })
  // One review leaves a card in learning (stability 0): these 12 become studied cards, the ones the projection reads
  php(key, `Illuminate\\Support\\Facades\\DB::table('flashcards')->whereIn('id', [${cards.slice(0, 12).map(c => `'${c.id}'`).join(',')}])->update(['state' => 'review', 'stability' => 8, 'difficulty' => 5, 'reps' => 2, 'last_review' => now()->subDays(2), 'due' => now()->addDays(4), 'scheduled_days' => 6]); echo 'ok';`)

  seedQuiz(key, cnst.id, 'Questões de Constitucional', Array.from({ length: 12 }, (_, i) => [cnst.id, i < 4] as [string, boolean]), { minutesAgo: 30 })

  const exam = (await apiCall(page, 'POST', '/exams', { title: 'TRF 4ª Região', exam_date: isoDays(42), topic_ids: [root.id] })).data
  const small = (await apiCall(page, 'POST', '/exams', { title: 'Prova de Português', exam_date: isoDays(30), topic_ids: [pt.id] })).data
  const out = php(key, `
    $e = App\\Domain\\Topic\\Models\\Exam::create(['user_id' => $u->id, 'title' => 'TJ antiga', 'exam_date' => now('America/Sao_Paulo')->subDays(20)->toDateString(), 'reta_final_enabled' => true]);
    $e->topics()->attach('${root.id}');
    echo 'EXAM_ID=' . $e->id;
  `)
  const pastExamId = out.match(/EXAM_ID=([0-9a-f-]{36})/)?.[1]
  if (!pastExamId) throw new Error(`prova passada não criada:\n${out}`)

  const seed: ProgressoSeed = { rootId: root.id, rootName, constId: cnst.id, ptId: pt.id, examId: exam.id, smallExamId: small.id, pastExamId }
  php(key, `Illuminate\\Support\\Facades\\Cache::put('e2e-progresso-seed-' . $u->id, json_decode('${JSON.stringify(seed)}', true), 3600); echo 'ok';`)
  return seed
}
