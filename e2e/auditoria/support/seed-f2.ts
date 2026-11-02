import type { Page } from '@playwright/test'
import { apiCall, doc, tinker, USERS } from './fixtures'

/**
 * Data of the Caderno F2 spec (e2e-recorte@audit.test), created once per run through the API and tinker
 * (no AI): a subject with a "PDF" (a document whose note holds 3 cards), a manual note with 2 cards, 2 loose
 * cards, a finished quiz with 2 wrong answers and an episode whose card_ids point to 5 cards, 1 of them
 * deleted afterwards. The PDF is a document row with its note (source_document_id) and no file.
 */
export interface F2Seed {
  rootId: string
  subjectId: string
  docId: string
  docNoteId: string
  docCardIds: string[]
  /** A 2nd PDF whose 2 cards are all scheduled for later (nothing due, "Praticar adiantado") */
  aheadDocId: string
  noteId: string
  noteCardIds: string[]
  quizId: string
  podcastId: string
}

export const F2 = { root: 'Concurso F2', subject: 'Constitucional F2', pdf: 'Apostila F2.pdf', aheadPdf: 'Revisado F2.pdf', quiz: 'Simulado F2', episode: 'Episódio F2' }

const php = (code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS.recorte.email}')->firstOrFail(); ${code}`)

async function cards(page: Page, topicId: string, n: number, prefix: string, noteId?: string): Promise<string[]> {
  await apiCall(page, 'POST', '/ai/accept-cards', {
    topic_id: topicId,
    ...(noteId ? { note_id: noteId } : {}),
    cards: Array.from({ length: n }, (_, i) => ({ front: `${prefix} ${i + 1}?`, back: `${prefix} resposta ${i + 1}` })),
  })
  const list = (await apiCall(page, 'GET', `/topics/${topicId}/flashcards?page=1&per_page=50`)).data as any[]
  return list.filter(c => String(c.front).includes(`${prefix} `)).map(c => c.id)
}

export async function ensureF2Seed(page: Page): Promise<F2Seed> {
  const marker = php(`echo 'SEED=' . json_encode(Illuminate\\Support\\Facades\\Cache::get('e2e-f2-seed-' . $u->id));`)
  const cached = marker.match(/SEED=(.*)/)?.[1]
  if (cached && cached !== 'null') return JSON.parse(cached) as F2Seed

  const root = (await apiCall(page, 'POST', '/topics', { name: F2.root })).data
  const subject = (await apiCall(page, 'POST', '/topics', { name: F2.subject, parent_id: root.id })).data

  // The PDF: a completed document and its note, whose 3 cards carry source_note_id
  const docNote = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title: 'Apostila F2 (resumo)' })).data
  await apiCall(page, 'PUT', `/notes/${docNote.id}`, { content: doc('Controle de constitucionalidade.') })
  const pdf = async (title: string, name: string, n: number, prefix: string) => {
    const note = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title })).data
    await apiCall(page, 'PUT', `/notes/${note.id}`, { content: doc('Controle de constitucionalidade.') })
    const out = php(`
    $d = App\\Domain\\Agent\\Models\\Document::create(['user_id' => $u->id, 'topic_id' => '${subject.id}', 'filename' => 'f2.pdf', 'original_name' => '${name}', 'file_path' => 'e2e/sem-arquivo.pdf', 'file_size' => 1024, 'pages_count' => 3, 'processed_pages' => 3, 'status' => 'completed', 'note_generation_status' => 'completed', 'auto_cards' => true, 'auto_cards_status' => 'completed', 'auto_cards_count' => ${n}]);
    Illuminate\\Support\\Facades\\DB::table('notes')->where('id', '${note.id}')->update(['source_document_id' => $d->id]);
    echo 'DOC_ID=' . $d->id;
  `)
    const id = out.match(/DOC_ID=([0-9a-f-]{36})/)?.[1]
    if (!id) throw new Error(`documento não criado:\n${out}`)
    return { id, noteId: note.id, cardIds: await cards(page, subject.id, n, prefix, note.id) }
  }
  // Studied before: due in 5 days, never reviewed today (ahead leaves out what was reviewed today)
  const ahead = await pdf('Revisado F2 (resumo)', F2.aheadPdf, 2, 'Adiantado')
  php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->whereIn('id', ${JSON.stringify(ahead.cardIds).replace(/"/g, "'")})->update(['state' => 'review', 'due' => now()->addDays(5), 'last_review' => now()->subDays(3), 'reps' => 2, 'stability' => 8, 'difficulty' => 5, 'scheduled_days' => 8]); echo 'ok';`)

  const docOut = php(`
    $d = App\\Domain\\Agent\\Models\\Document::create(['user_id' => $u->id, 'topic_id' => '${subject.id}', 'filename' => 'apostila-f2.pdf', 'original_name' => '${F2.pdf}', 'file_path' => 'e2e/sem-arquivo.pdf', 'file_size' => 1024, 'pages_count' => 3, 'processed_pages' => 3, 'status' => 'completed', 'note_generation_status' => 'completed', 'auto_cards' => true, 'auto_cards_status' => 'completed', 'auto_cards_count' => 3]);
    Illuminate\\Support\\Facades\\DB::table('notes')->where('id', '${docNote.id}')->update(['source_document_id' => $d->id]);
    echo 'DOC_ID=' . $d->id;
  `)
  const docId = docOut.match(/DOC_ID=([0-9a-f-]{36})/)?.[1]
  if (!docId) throw new Error(`documento não criado:\n${docOut}`)
  const docCardIds = await cards(page, subject.id, 3, 'PDF', docNote.id)

  const note = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title: 'Nota F2' })).data
  await apiCall(page, 'PUT', `/notes/${note.id}`, { content: doc('Direitos fundamentais.') })
  const noteCardIds = await cards(page, subject.id, 2, 'Nota', note.id)
  const looseIds = await cards(page, subject.id, 2, 'Avulso')

  // A finished quiz with 2 wrong answers (the cards are created by the real route in the spec)
  const quizOut = php(`
    $q = App\\Domain\\Quiz\\Models\\Quiz::create(['user_id' => $u->id, 'topic_id' => '${subject.id}', 'title' => '${F2.quiz}', 'status' => 'completed', 'mode' => 'learning', 'config' => ['quantity' => 3, 'types' => ['true_false'], 'difficulty' => 'mixed'], 'total_questions' => 3, 'correct_count' => 1, 'score_percent' => 33, 'time_spent_seconds' => 60, 'started_at' => now()->subMinute(), 'completed_at' => now()]);
    foreach ([[1, 'true', true], [2, 'false', false], [3, 'false', false]] as [$pos, $answer, $ok]) {
      App\\Domain\\Quiz\\Models\\QuizQuestion::create(['quiz_id' => $q->id, 'position' => $pos, 'type' => 'true_false', 'difficulty' => 'easy', 'stem' => "Afirmação F2 $pos", 'explanation' => 'Gabarito do teste.', 'correct_answer' => 'true', 'user_answer' => $answer, 'is_correct' => $ok, 'answered_at' => now()]);
    }
    echo 'QUIZ_ID=' . $q->id;
  `)
  const quizId = quizOut.match(/QUIZ_ID=([0-9a-f-]{36})/)?.[1]
  if (!quizId) throw new Error(`simulado não criado:\n${quizOut}`)

  // An episode about 5 cards; one of them is deleted afterwards ("Revisar os 4 do episódio")
  const episodeCards = [...docCardIds, ...looseIds]
  const podOut = php(`
    $p = App\\Domain\\Podcast\\Models\\Podcast::create(['user_id' => $u->id, 'topic_id' => '${root.id}', 'title' => '${F2.episode}', 'status' => 'ready', 'audio_url' => 'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA==', 'duration_seconds' => 300, 'content_mode' => 'weak_points', 'card_ids' => ${JSON.stringify(episodeCards).replace(/"/g, "'")}]);
    echo 'PODCAST_ID=' . $p->id;
  `)
  const podcastId = podOut.match(/PODCAST_ID=([0-9a-f-]{36})/)?.[1]
  if (!podcastId) throw new Error(`episódio não criado:\n${podOut}`)
  await apiCall(page, 'DELETE', `/flashcards/${looseIds[1]}`)

  const seed: F2Seed = { rootId: root.id, subjectId: subject.id, docId, docNoteId: docNote.id, docCardIds, aheadDocId: ahead.id, noteId: note.id, noteCardIds, quizId, podcastId }
  php(`Illuminate\\Support\\Facades\\Cache::put('e2e-f2-seed-' . $u->id, json_decode('${JSON.stringify(seed)}', true), 3600); echo 'ok';`)
  return seed
}
