import type { Page } from '@playwright/test'
import { apiCall, tinker, USERS, type UserKey } from './fixtures'

/**
 * Data of the material and library specs (prd-4c-material-v3), created once per run through the API and
 * tinker (no AI, no file): a caderno with a subject, a "PDF" (a document row whose note has headings, the
 * job's "(pág. X-Y)" markers and 3 cards with origin), a manual note without cards and, for the library,
 * 320 cards in several states. Cached per user id (the users are recreated each run).
 */
export const PDF_TEXT = 'O controle de constitucionalidade é a verificação da compatibilidade de leis e atos normativos com a Constituição.'
const php = (key: UserKey, code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS[key].email}')->firstOrFail(); ${code}`)

function cached<T>(key: UserKey, name: string): T | null {
  const out = php(key, `echo 'SEED=' . json_encode(Illuminate\\Support\\Facades\\Cache::get('e2e-${name}-' . $u->id));`)
  const raw = out.match(/SEED=(.*)/)?.[1]
  return raw && raw !== 'null' ? JSON.parse(raw) as T : null
}
function keep(key: UserKey, name: string, seed: object) {
  php(key, `Illuminate\\Support\\Facades\\Cache::put('e2e-${name}-' . $u->id, json_decode('${JSON.stringify(seed)}', true), 3600); echo 'ok';`)
}

const heading = (level: number, text: string) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] })
// A text node that is only spaces reaches the API as null (ConvertEmptyStringsToNull): the space stays in the text
const para = (text: string, page?: string) => ({ type: 'paragraph', content: [{ type: 'text', text: page ? `${text} ` : text }, ...(page ? [{ type: 'text', marks: [{ type: 'italic' }], text: page }] : [])] })
const filler = (n: number) => Array.from({ length: n }, (_, i) => para(`Parágrafo ${i + 1} sobre o tema, com texto suficiente para rolar a leitura e testar o sumário do material de estudo.`))

export interface MaterialSeed { rootId: string; subjectId: string; docId: string; pdfNoteId: string; pdfCardIds: string[]; manualNoteId: string }

export async function ensureMaterialSeed(page: Page): Promise<MaterialSeed> {
  const hit = cached<MaterialSeed>('material', 'material-seed')
  if (hit) return hit
  const root = (await apiCall(page, 'POST', '/topics', { name: 'Concurso Material', learning_mode: 'exam' })).data
  const subject = (await apiCall(page, 'POST', '/topics', { name: 'Constitucional M', parent_id: root.id })).data

  const pdfNote = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title: 'Apostila M (resumo)' })).data
  await apiCall(page, 'PUT', `/notes/${pdfNote.id}`, {
    content: { type: 'doc', content: [
      heading(2, '1. Conceito'), para(PDF_TEXT, '(pág. 3-5)'), ...filler(14),
      heading(2, '2. Espécies quanto ao momento'), para('Preventivo: antes de a norma entrar no ordenamento.', '(pág. 6-8)'), ...filler(14),
      heading(3, '2.1 Controle difuso'), para('Realizado por qualquer juiz ou tribunal no caso concreto.', '(pág. 12)'), ...filler(10),
    ] },
  })
  const out = php('material', `
    $d = App\\Domain\\Agent\\Models\\Document::create(['user_id' => $u->id, 'topic_id' => '${subject.id}', 'filename' => 'm.pdf', 'original_name' => 'Apostila M.pdf', 'file_path' => 'e2e/sem-arquivo.pdf', 'file_size' => 1024, 'pages_count' => 24, 'processed_pages' => 24, 'status' => 'completed', 'note_generation_status' => 'completed', 'auto_cards' => false]);
    Illuminate\\Support\\Facades\\DB::table('notes')->where('id', '${pdfNote.id}')->update(['source_document_id' => $d->id]);
    echo 'DOC_ID=' . $d->id;
  `)
  const docId = out.match(/DOC_ID=([0-9a-f-]{36})/)?.[1]
  if (!docId) throw new Error(`documento não criado:\n${out}`)
  await apiCall(page, 'POST', '/ai/accept-cards', {
    topic_id: subject.id, note_id: pdfNote.id,
    cards: Array.from({ length: 3 }, (_, i) => ({ front: `Material pergunta ${i + 1}?`, back: `Material resposta ${i + 1}` })),
  })
  const pdfCardIds = ((await apiCall(page, 'GET', `/topics/${root.id}/flashcards?origin=note:${pdfNote.id}&limit=10`)).data as any[]).map(c => c.id)

  const manual = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title: 'Minhas anotações M' })).data
  await apiCall(page, 'PUT', `/notes/${manual.id}`, { content: { type: 'doc', content: [heading(2, 'Remédios'), para('O habeas corpus protege a liberdade de locomoção contra ilegalidade ou abuso de poder.')] } })

  const seed: MaterialSeed = { rootId: root.id, subjectId: subject.id, docId, pdfNoteId: pdfNote.id, pdfCardIds, manualNoteId: manual.id }
  keep('material', 'material-seed', seed)
  return seed
}

export interface LibrarySeed { rootId: string; noteId: string; total: number }

/** 320 cards: 40 overdue with errors, 40 learning, 30 from a note, the rest new. */
export async function ensureLibrarySeed(page: Page): Promise<LibrarySeed> {
  const hit = cached<LibrarySeed>('library', 'library-seed')
  if (hit) return hit
  const root = (await apiCall(page, 'POST', '/topics', { name: 'Biblioteca B', learning_mode: 'exam' })).data
  const note = (await apiCall(page, 'POST', `/topics/${root.id}/notes`, { title: 'Resumo B' })).data
  for (let batch = 0; batch < 3; batch++) {
    await apiCall(page, 'POST', '/ai/accept-cards', {
      topic_id: root.id,
      cards: Array.from({ length: 100 }, (_, i) => ({ front: `Card ${batch * 100 + i + 1} sobre controle`, back: `Resposta ${batch * 100 + i + 1}` })),
    })
  }
  await apiCall(page, 'POST', '/ai/accept-cards', {
    topic_id: root.id, note_id: note.id,
    cards: Array.from({ length: 20 }, (_, i) => ({ front: `Da nota ${i + 1} sobre mandado de segurança`, back: `Resposta da nota ${i + 1}` })),
  })
  php('library', `
    $ids = App\\Domain\\Flashcard\\Models\\Flashcard::where('user_id', $u->id)->where('source_note_id', null)->orderBy('created_at')->orderBy('id')->pluck('id');
    Illuminate\\Support\\Facades\\DB::table('flashcards')->whereIn('id', $ids->slice(0, 40)->all())->update(['state' => 'review', 'due' => now()->subDays(2), 'last_review' => now()->subDays(9), 'reps' => 4, 'lapses' => 2, 'stability' => 3, 'difficulty' => 6, 'scheduled_days' => 7]);
    Illuminate\\Support\\Facades\\DB::table('flashcards')->whereIn('id', $ids->slice(40, 40)->all())->update(['state' => 'learning', 'due' => now()->addMinutes(10), 'last_review' => now()->subMinutes(5), 'reps' => 1, 'stability' => 1, 'difficulty' => 5]);
    echo 'ok';
  `)
  const seed: LibrarySeed = { rootId: root.id, noteId: note.id, total: 320 }
  keep('library', 'library-seed', seed)
  return seed
}
