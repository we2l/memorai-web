import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { Page } from '@playwright/test'
import { test, expect, apiCall, gotoApp, tinker, USERS } from '../auditoria/support/fixtures'
import { seedQuiz } from '../auditoria/support/seed-praticar'

/**
 * Real screens of the landing (prd-landing-v4 RF-L12): the app itself, with a demo account, never a drawn screen.
 *
 * Seeds `e2e-landing-shots@audit.test` (recreated on every run) through the API and tinker, with NO AI: cards go
 * through POST /ai/accept-cards (the persistence route), the notes get their content straight in the database (the
 * API would queue the embedding job), and the PDF, its parts, the quiz and the card states are rows written by
 * tinker. Then captures 390 px screens (DPR 2) in light and dark and writes AVIF + WebP to public/landing/.
 *
 * Needs the local API (http://localhost:8037) and the web build on :3000:
 *   NUXT_PUBLIC_API_BASE=http://localhost:8037/api npm run build && PORT=3000 node .output/server/index.mjs
 *   npx playwright test -c e2e/landing/shots.config.ts
 */
const OUT = path.join(__dirname, '..', '..', 'public', 'landing')
const DEMO = path.join(__dirname, '..', '..', 'app', 'assets', 'landing', 'demo.json')
const WIDTH = 390
const HEIGHT = 640

type Card = [front: string, back: string]

const php = (code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS.landingShots.email}')->firstOrFail(); ${code}`)
const sqlList = (ids: string[]) => `[${ids.map(i => `'${i}'`).join(',')}]`
const heading = (level: number, text: string) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] })
const para = (text: string, page?: string) => ({ type: 'paragraph', content: [{ type: 'text', text: page ? `${text} ` : text }, ...(page ? [{ type: 'text', marks: [{ type: 'italic' }], text: page }] : [])] })

/** Content straight in the database: PUT /notes would queue the embedding job (an AI call). */
function setContent(noteId: string, content: object[], words: number) {
  const json = JSON.stringify({ type: 'doc', content }).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  php(`Illuminate\\Support\\Facades\\DB::table('notes')->where('id', '${noteId}')->update(['content' => '${json}', 'word_count' => ${words}]); echo 'ok';`)
}

async function topic(page: Page, name: string, extra: Record<string, unknown> = {}) {
  return (await apiCall(page, 'POST', '/topics', { name, ...extra })).data as { id: string }
}

async function addCards(page: Page, rootId: string, topicId: string, cards: Card[], noteId?: string): Promise<string[]> {
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topicId, ...(noteId ? { note_id: noteId } : {}), cards: cards.map(([front, back]) => ({ front, back })) })
  const list = (await apiCall(page, 'GET', `/topics/${rootId}/flashcards?limit=100&sort=created`)).data as { id: string, front: string }[]
  const fronts = new Set(cards.map(c => c[0]))
  // The order of `cards`, so the caller knows which id is which
  return cards.map(([front]) => list.find(c => c.front === front && fronts.has(c.front))?.id).filter((id): id is string => !!id)
}

/** Studied cards: graduated (stability > 0), due `dueDays` from now (negative = overdue). */
function study(ids: string[], dueDays: number, stability: number, lapses = 0) {
  if (!ids.length) return
  php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->whereIn('id', ${sqlList(ids)})->update(['state' => 'review', 'stability' => ${stability}, 'difficulty' => 5, 'reps' => ${3 + lapses}, 'lapses' => ${lapses}, 'last_review' => now()->subDays(${Math.max(1, Math.round(stability))}), 'due' => now()->addDays(${dueDays})->subHour(), 'scheduled_days' => ${Math.max(1, Math.round(stability))}]); echo 'ok';`)
}

// ── Content: true statements only (the landing shows them as the product, not as a promise) ──

const PARTS: { title: string, pages: [number, number], body: [string, string][], cards: Card[] }[] = [
  {
    title: 'Princípios fundamentais', pages: [1, 28],
    body: [
      ['A República Federativa do Brasil tem como fundamentos a soberania, a cidadania, a dignidade da pessoa humana, os valores sociais do trabalho e da livre iniciativa e o pluralismo político.', '(pág. 3-5)'],
      ['Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos da Constituição.', '(pág. 6)'],
    ],
    cards: [
      ['Quais são os fundamentos da República (art. 1º da CF)?', 'Soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa e pluralismo político.'],
      ['Quais são os Poderes da União?', 'Legislativo, Executivo e Judiciário, independentes e harmônicos entre si (art. 2º).'],
      ['O que é cláusula pétrea?', 'Matéria que não pode ser abolida por emenda constitucional (art. 60, § 4º).'],
      ['Quais são as cláusulas pétreas?', 'Forma federativa, voto direto, secreto, universal e periódico, separação dos Poderes e direitos e garantias individuais.'],
      ['De quem emana todo o poder, segundo o art. 1º, parágrafo único?', 'Do povo, que o exerce por representantes eleitos ou diretamente.'],
      ['Qual é o sistema de governo do Brasil?', 'Presidencialismo.'],
    ],
  },
  {
    title: 'Direitos e garantias fundamentais', pages: [29, 61],
    body: [
      ['As normas definidoras dos direitos e garantias fundamentais têm aplicação imediata.', '(pág. 31)'],
      ['A casa é asilo inviolável do indivíduo; ninguém nela pode penetrar sem consentimento do morador, salvo em flagrante delito, desastre, para prestar socorro ou, durante o dia, por determinação judicial.', '(pág. 38-39)'],
    ],
    cards: [
      ['Em que casos se pode entrar numa casa sem o consentimento do morador?', 'Flagrante delito, desastre, para prestar socorro ou, durante o dia, por determinação judicial.'],
      ['Tratado de direitos humanos aprovado com o rito de emenda tem que status?', 'Equivalente a emenda constitucional (3/5 dos votos, em dois turnos, nas duas Casas).'],
      ['Quais crimes são inafiançáveis e imprescritíveis?', 'O racismo e a ação de grupos armados contra a ordem constitucional e o Estado Democrático.'],
      ['O brasileiro nato pode ser extraditado?', 'Não. O naturalizado pode, por crime comum anterior à naturalização ou por tráfico de drogas.'],
      ['Qual prisão civil por dívida é admitida hoje?', 'Só a do devedor de pensão alimentícia (Súmula Vinculante 25).'],
      ['A lei penal pode retroagir?', 'Só para beneficiar o réu.'],
      ['A manifestação do pensamento é livre?', 'Sim, vedado o anonimato.'],
      ['As normas de direitos fundamentais dependem de lei para valer?', 'Não: têm aplicação imediata (art. 5º, § 1º).'],
    ],
  },
  {
    title: 'Remédios constitucionais', pages: [62, 90],
    body: [
      ['Conceder-se-á habeas corpus sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua liberdade de locomoção.', '(pág. 63)'],
      ['O mandado de segurança protege direito líquido e certo não amparado por habeas corpus ou habeas data.', '(pág. 70-72)'],
    ],
    cards: [
      ['Qual remédio protege a liberdade de locomoção?', 'O habeas corpus.'],
      ['Qual remédio garante acesso a informações pessoais em bancos de dados públicos?', 'O habeas data.'],
      ['Quando cabe mandado de segurança?', 'Para proteger direito líquido e certo não amparado por habeas corpus ou habeas data.'],
      ['Quem pode propor ação popular?', 'Qualquer cidadão.'],
      ['Qual o prazo para impetrar mandado de segurança?', '120 dias da ciência do ato (Lei 12.016/2009).'],
      ['Para que serve o mandado de injunção?', 'Para quando a falta de norma regulamentadora torna inviável o exercício de direitos e liberdades constitucionais.'],
      ['O autor da ação popular paga custas?', 'Não, salvo comprovada má-fé.'],
    ],
  },
  {
    title: 'Organização do Estado', pages: [91, 120],
    body: [
      ['A organização político-administrativa compreende a União, os Estados, o Distrito Federal e os Municípios, todos autônomos.', '(pág. 92)'],
    ],
    cards: [
      ['Quais são os entes da Federação?', 'União, estados, Distrito Federal e municípios.'],
      ['O Distrito Federal pode ser dividido em municípios?', 'Não (art. 32).'],
      ['Quem legisla privativamente sobre direito penal?', 'A União (art. 22, I).'],
      ['A competência comum do art. 23 é de quem?', 'De todos os entes: União, estados, Distrito Federal e municípios.'],
      ['Os territórios federais integram qual ente?', 'A União (art. 18, § 2º).'],
    ],
  },
  {
    title: 'Controle de constitucionalidade', pages: [121, 152],
    body: [
      ['O controle de constitucionalidade verifica se leis e atos normativos são compatíveis com a Constituição.', '(pág. 121-123)'],
      ['No controle difuso, qualquer juiz ou tribunal pode declarar a inconstitucionalidade no caso concreto, com efeito entre as partes.', '(pág. 128-131)'],
      ['No controle concentrado, o STF julga a lei em tese, por ADI, ADC, ADO ou ADPF, com eficácia contra todos e efeito vinculante.', '(pág. 137-140)'],
      ['Os tribunais só declaram a inconstitucionalidade pelo voto da maioria absoluta dos membros ou do órgão especial: é a cláusula de reserva de plenário.', '(pág. 133)'],
    ],
    cards: [
      ['Quem pode fazer o controle difuso de constitucionalidade?', 'Qualquer juiz ou tribunal, no caso concreto.'],
      ['O que é a cláusula de reserva de plenário?', 'Tribunal só declara inconstitucionalidade pela maioria absoluta dos membros ou do órgão especial (art. 97).'],
      ['Quem julga ADI de lei estadual em face da Constituição Federal?', 'O STF.'],
      ['Lei municipal contra a CF pode ser objeto de ADI no STF?', 'Não. Cabe ADPF.'],
      ['Qual o efeito da decisão em ADI?', 'Eficácia contra todos e efeito vinculante.'],
      ['No controle difuso, quem pode suspender a lei declarada inconstitucional pelo STF?', 'O Senado Federal (art. 52, X).'],
      ['O que a ADO combate?', 'A omissão inconstitucional: a falta de norma que torne efetiva uma norma da Constituição.'],
      ['Quando acontece o controle preventivo?', 'Antes de a norma entrar no ordenamento, como na CCJ ou no veto jurídico.'],
      ['A ADPF é subsidiária?', 'Sim: só cabe quando não houver outro meio eficaz.'],
    ],
  },
  {
    title: 'Poder Legislativo', pages: [153, 180],
    body: [
      ['O Senado Federal compõe-se de representantes dos Estados e do Distrito Federal, eleitos segundo o princípio majoritário.', '(pág. 154)'],
    ],
    cards: [
      ['Quantos senadores cada estado elege?', 'Três, com mandato de oito anos.'],
      ['Qual o quórum para aprovar emenda constitucional?', '3/5 dos votos, em dois turnos, em cada Casa.'],
      ['Quem julga o Presidente nos crimes de responsabilidade?', 'O Senado Federal.'],
      ['Quanto tempo vale uma medida provisória?', '60 dias, prorrogáveis uma vez por mais 60.'],
      ['Quem pode criar CPI?', 'Câmara e Senado, juntos ou separados, a requerimento de 1/3 dos membros.'],
    ],
  },
]

const ADMIN: Card[] = [
  ['Quais são os princípios do art. 37 da CF?', 'Legalidade, impessoalidade, moralidade, publicidade e eficiência.'],
  ['O ato administrativo tem presunção de legitimidade?', 'Sim, relativa: admite prova em contrário.'],
  ['Qual a diferença entre revogação e anulação?', 'Revoga-se ato válido por conveniência; anula-se ato ilegal.'],
  ['Qual lei rege as licitações hoje?', 'A Lei 14.133/2021.'],
  ['A responsabilidade civil do Estado é de que tipo?', 'Objetiva, na modalidade risco administrativo (art. 37, § 6º).'],
]
const PORTUGUES: Card[] = [
  ['"Mal" ou "mau"?', 'Mal é o oposto de bem; mau é o oposto de bom.'],
  ['"Onde" ou "aonde"?', 'Aonde com verbos de movimento: "Aonde você vai?".'],
  ['Qual o plural de "cidadão"?', 'Cidadãos.'],
]
const INGLES: Card[] = [
  ['I\'m looking forward to it.', 'Estou ansioso por isso; mal posso esperar.'],
  ['to figure out', 'Entender, descobrir. "I can\'t figure out this problem."'],
  ['It\'s up to you.', 'Você decide; depende de você.'],
  ['to run out of', 'Ficar sem. "We ran out of milk."'],
  ['actually', 'Na verdade (não é "atualmente").'],
  ['to get along with', 'Dar-se bem com.'],
  ['eventually', 'Por fim, mais cedo ou mais tarde (falso cognato).'],
  ['to take for granted', 'Não dar valor; considerar garantido.'],
]
const ANATOMIA: Card[] = [
  ['Qual é o principal músculo da inspiração?', 'O diafragma.'],
  ['Qual nervo inerva o diafragma?', 'O nervo frênico (C3, C4 e C5).'],
  ['Qual valva separa o átrio e o ventrículo esquerdos?', 'A valva mitral (bicúspide).'],
  ['Qual é o maior osso do corpo humano?', 'O fêmur.'],
  ['Onde fica o nó sinoatrial?', 'Na parede do átrio direito, perto da desembocadura da veia cava superior.'],
  ['Quais ramos saem do arco da aorta?', 'Tronco braquiocefálico, carótida comum esquerda e subclávia esquerda.'],
  ['A "mão em garra" indica lesão de qual nervo?', 'Do nervo ulnar.'],
]
const OAB: Card[] = [
  ['Qual o prazo da contestação no procedimento comum (CPC)?', '15 dias úteis (art. 335).'],
  ['Qual o prazo da apelação no CPC?', '15 dias úteis (art. 1.003, § 5º).'],
  ['Quem é o titular da ação penal pública?', 'O Ministério Público (art. 129, I, da CF).'],
]
const ENEM: Card[] = [
  ['O que diz a 1ª Lei de Mendel?', 'Cada característica é determinada por um par de fatores que se separam na formação dos gametas.'],
  ['Qual organela faz a respiração celular?', 'A mitocôndria.'],
  ['Qual a função do ribossomo?', 'A síntese de proteínas.'],
]


// A quiz with real questions (the result page shows the wrong ones as cards): [topic, stem, options, correct, answer]
type Question = [topic: 'ctrl' | 'df', stem: string, options: [string, string, string, string], correct: number, answered: number, explanation: string]
const QUIZ: Question[] = [
  ['ctrl', 'Quem pode exercer o controle difuso de constitucionalidade?', ['Só o STF', 'Qualquer juiz ou tribunal', 'Só os tribunais superiores', 'Só o Senado Federal'], 1, 1, 'No controle difuso, qualquer juiz ou tribunal decide a questão no caso concreto.'],
  ['ctrl', 'A cláusula de reserva de plenário exige o voto de:', ['Maioria simples dos presentes', 'Maioria absoluta dos membros ou do órgão especial', 'Unanimidade', 'Dois terços dos membros'], 1, 1, 'Art. 97 da CF: maioria absoluta dos membros do tribunal ou do órgão especial.'],
  ['ctrl', 'Lei municipal contrária à Constituição Federal pode ser questionada no STF por meio de:', ['ADI', 'ADC', 'ADPF', 'ADO'], 2, 0, 'Lei municipal não é objeto de ADI no STF frente à CF; cabe ADPF.'],
  ['ctrl', 'A decisão de mérito em ADI tem:', ['Efeito só entre as partes', 'Eficácia contra todos e efeito vinculante', 'Efeito só para o Legislativo', 'Efeito apenas para o futuro, sempre'], 1, 1, 'Art. 102, § 2º: eficácia contra todos e efeito vinculante.'],
  ['ctrl', 'No controle difuso, quem pode suspender a execução de lei declarada inconstitucional pelo STF?', ['A Câmara dos Deputados', 'O Presidente da República', 'O Senado Federal', 'O Procurador-Geral da República'], 2, 0, 'Art. 52, X: compete ao Senado suspender a execução da lei.'],
  ['ctrl', 'A ADPF é cabível:', ['Sempre, como ação principal', 'Só quando não houver outro meio eficaz', 'Apenas contra leis federais', 'Apenas por iniciativa de municípios'], 1, 1, 'A ADPF é subsidiária (Lei 9.882/1999, art. 4º, § 1º).'],
  ['df', 'Durante a noite, sem consentimento do morador, pode-se entrar numa casa:', ['Com ordem judicial', 'Em flagrante delito', 'Para cumprir mandado de busca', 'Em nenhum caso'], 1, 1, 'À noite, só em flagrante delito, desastre ou para prestar socorro; a ordem judicial vale só durante o dia.'],
  ['df', 'Hoje, a prisão civil por dívida só é admitida para:', ['O depositário infiel', 'O devedor de pensão alimentícia', 'Os dois casos', 'Nenhum caso'], 1, 0, 'Súmula Vinculante 25: é ilícita a prisão do depositário infiel.'],
  ['df', 'O brasileiro nato pode ser extraditado?', ['Sim, por crime comum', 'Sim, por tráfico de drogas', 'Não', 'Só se houver tratado'], 2, 2, 'Art. 5º, LI: o brasileiro nato nunca é extraditado.'],
  ['df', 'A lei penal pode retroagir:', ['Sempre', 'Nunca', 'Para beneficiar o réu', 'Só em crimes hediondos'], 2, 2, 'Art. 5º, XL: a lei penal não retroage, salvo para beneficiar o réu.'],
]

function seedRealQuiz(topics: { ctrl: string, df: string }, rootId: string): string {
  const letter = (i: number) => 'abcd'[i]
  const rows = QUIZ.map(([t, stem, opts, correct, answered, expl], i) => {
    const options = opts.map((o, j) => `${letter(j)}) ${o}`)
    return { topic_id: topics[t], position: i + 1, stem, options, correct_answer: letter(correct), user_answer: options[answered], is_correct: correct === answered, explanation: expl }
  })
  const right = rows.filter(r => r.is_correct).length
  const json = JSON.stringify(rows).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const out = php(`
    $at = now()->subMinutes(20);
    $q = App\\Domain\\Quiz\\Models\\Quiz::create(['user_id' => $u->id, 'topic_id' => '${rootId}', 'title' => 'Constitucional: controle e direitos', 'status' => 'completed', 'mode' => 'learning', 'config' => ['quantity' => ${rows.length}, 'types' => ['multiple_choice'], 'difficulty' => 'mixed'], 'total_questions' => ${rows.length}, 'correct_count' => ${right}, 'score_percent' => ${Math.round(right * 100 / rows.length)}, 'time_spent_seconds' => 840, 'started_at' => $at->copy()->subMinutes(14), 'completed_at' => $at]);
    foreach (json_decode('${json}', true) as $r) {
      App\\Domain\\Quiz\\Models\\QuizQuestion::create($r + ['quiz_id' => $q->id, 'type' => 'multiple_choice', 'difficulty' => 'medium', 'answered_at' => $at]);
    }
    echo 'QUIZ_ID=' . $q->id;
  `)
  const id = out.match(/QUIZ_ID=([0-9a-f-]{36})/)?.[1]
  if (!id) throw new Error(`simulado não criado:\n${out}`)
  return id
}

interface Seed { rootId: string, docId: string, part5: string, inglesId: string, anatomiaId: string, quizId: string, oabId: string, enemId: string }

async function seed(page: Page): Promise<Seed> {
  const root = await topic(page, 'Concurso TRF', { learning_mode: 'exam' })
  const cnst = await topic(page, 'Direito Constitucional', { parent_id: root.id })
  const df = await topic(page, 'Direitos fundamentais', { parent_id: cnst.id })
  const ctrl = await topic(page, 'Controle de constitucionalidade', { parent_id: cnst.id })
  const adm = await topic(page, 'Direito Administrativo', { parent_id: root.id })
  const pt = await topic(page, 'Português', { parent_id: root.id })

  // The PDF in 6 parts: a note per part (part_index, pages, batches) under one document row
  const noteIds: string[] = []
  for (const part of PARTS) {
    const note = (await apiCall(page, 'POST', `/topics/${cnst.id}/notes`, { title: part.title })).data
    const words = part.body.reduce((n, [t]) => n + t.split(/\s+/).length, 0) * 40
    setContent(note.id, [heading(2, part.title), ...part.body.flatMap(([text, pg]) => [para(text, pg)])], words)
    noteIds.push(note.id)
  }
  const out = php(`
    $d = App\\Domain\\Agent\\Models\\Document::create(['user_id' => $u->id, 'topic_id' => '${cnst.id}', 'filename' => 'apostila.pdf', 'original_name' => 'Apostila de Direito Constitucional.pdf', 'file_path' => 'e2e/sem-arquivo.pdf', 'file_size' => 4200000, 'pages_count' => 180, 'processed_pages' => 180, 'status' => 'completed', 'note_generation_status' => 'completed', 'note_generation_progress' => 18, 'note_total_batches' => 18, 'auto_cards' => false]);
    foreach (${sqlList(noteIds)} as $i => $id) {
      $pages = ${JSON.stringify(PARTS.map(p => p.pages))}[$i];
      Illuminate\\Support\\Facades\\DB::table('notes')->where('id', $id)->update(['source_document_id' => $d->id, 'part_index' => $i + 1, 'page_start' => $pages[0], 'page_end' => $pages[1], 'part_batches' => 3]);
    }
    echo 'DOC_ID=' . $d->id;
  `)
  const docId = out.match(/DOC_ID=([0-9a-f-]{36})/)?.[1]
  if (!docId) throw new Error(`documento não criado:\n${out}`)

  // Cards per part, in the assunto of the part; studied, most of them due today (3 batches in the PDF session)
  const cardTopic = [cnst.id, df.id, cnst.id, cnst.id, ctrl.id, cnst.id]
  // Parts 1-2 studied and "em dia" (the domínio), parts 3-6 due today: 2 batches in the PDF session
  for (const [i, part] of PARTS.entries()) {
    const ids = await addCards(page, root.id, cardTopic[i]!, part.cards, noteIds[i])
    if (i < 2) study(ids, 4 + i * 3, 12)
    else study(ids, -1, 9)
  }
  // The card on screen: the most overdue of the session, with errors
  const difuso = await addCards(page, root.id, ctrl.id, [['O controle difuso de constitucionalidade gera efeito para quem?', 'Só entre as partes do processo, salvo resolução do Senado (art. 52, X).']], noteIds[4])
  study(difuso, -6, 4, 2)

  const admIds = await addCards(page, root.id, adm.id, ADMIN)
  study(admIds.slice(0, 2), -1, 6)
  study(admIds.slice(2), 5, 10)
  const ptIds = await addCards(page, root.id, pt.id, PORTUGUES)
  study(ptIds, 3, 12)

  // Questions answered by assunto (the accuracy of Progresso: >= 10 answered each)
  const answers = (id: string, total: number, right: number) => Array.from({ length: total }, (_, i) => [id, i < right] as [string, boolean])
  seedQuiz('landingShots', root.id, 'Simulado TRF', [...answers(ctrl.id, 12, 7), ...answers(df.id, 12, 10), ...answers(adm.id, 10, 5), ...answers(pt.id, 10, 8)], { minutesAgo: 60 * 26 })

  const quizId = seedRealQuiz({ ctrl: ctrl.id, df: df.id }, root.id)

  const examDate = new Date(Date.now() + 45 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  await apiCall(page, 'POST', '/exams', { title: 'TRF 4ª Região', exam_date: examDate, topic_ids: [root.id] })

  // The other areas: new cards, plus a few studied ones
  const ingles = await topic(page, 'Inglês B2', { learning_mode: 'language', target_language: 'en' })
  await addCards(page, ingles.id, ingles.id, INGLES)
  const anatomia = await topic(page, 'Anatomia', { learning_mode: 'academic' })
  await addCards(page, anatomia.id, anatomia.id, ANATOMIA)
  const oab = await topic(page, 'OAB 1ª fase', { learning_mode: 'exam' })
  study(await addCards(page, oab.id, oab.id, OAB), -1, 5)
  // New cards: the ENEM session opens on the Mendel card
  const enem = await topic(page, 'ENEM: Biologia', { learning_mode: 'exam' })
  await addCards(page, enem.id, enem.id, ENEM)

  // A study streak, as an account in use would have
  php(`$u->forceFill(['current_streak' => 12, 'longest_streak' => 12, 'last_review_date' => now('America/Sao_Paulo')->subDay()->toDateString()])->save(); echo 'ok';`)

  return { rootId: root.id, docId, part5: noteIds[4]!, inglesId: ingles.id, anatomiaId: anatomia.id, quizId, oabId: oab.id, enemId: enem.id }
}

/**
 * Captures a 390 px wide region of the screen: the page scrolled to `scrollY`, `top` px down the viewport, `height`
 * tall. Only the part the landing talks about, so it can be shown big enough to read on a phone.
 */
async function save(page: Page, name: string, theme: string, { scrollY = 0 as number | null, top = 0, height = HEIGHT } = {}) {
  if (scrollY !== null) await page.evaluate(y => window.scrollTo(0, y), scrollY)
  await page.waitForTimeout(300)
  const png = await page.screenshot({ clip: { x: 0, y: top, width: WIDTH, height }, animations: 'disabled' })
  const img = sharp(png).resize({ width: WIDTH * 2 })
  fs.mkdirSync(OUT, { recursive: true })
  await img.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(OUT, `${name}-${theme}.avif`))
  await img.clone().webp({ quality: 74, effort: 6 }).toFile(path.join(OUT, `${name}-${theme}.webp`))
}

/** Viewport y of an element (the page as it is), minus an offset. */
async function viewportTop(page: Page, selector: string, offset = 12) {
  const y = await page.locator(selector).first().evaluate(el => el.getBoundingClientRect().top)
  return Math.max(0, Math.round(y - offset))
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
}

/** Page y of an element, minus an offset: where to scroll so it sits near the top of the capture. */
async function topOf(page: Page, selector: string, offset = 16) {
  const y = await page.locator(selector).first().evaluate(el => el.getBoundingClientRect().top + window.scrollY)
  return Math.max(0, y - offset)
}

/**
 * The numbers the hero repeats in large type come from the same demo account, read from the API at capture time,
 * so the text and the screen never disagree (app/assets/landing/demo.json).
 */
async function saveDemoNumbers(page: Page) {
  const exam = ((await apiCall(page, 'GET', '/exams?status=upcoming')).data as { title: string, days_remaining: number, projection: { keep_pace: number, stop_today: number } | null }[])[0]
  if (!exam?.projection) throw new Error('prova de demonstração sem projeção')
  const demo = { exam: exam.title, days: exam.days_remaining, keep_pace: exam.projection.keep_pace, stop_today: exam.projection.stop_today }
  fs.writeFileSync(DEMO, `${JSON.stringify(demo, null, 2)}\n`)
}

test.use({ auditUser: 'landingShots', viewport: { width: WIDTH, height: 844 }, deviceScaleFactor: 2 })

test('telas reais da landing', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const s = await seed(page)

  for (const theme of ['light', 'dark'] as const) {
    await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* only the capture */ } }, theme)

    await gotoApp(page, '/hoje')
    await settle(page)
    await save(page, 'hoje', theme)
    if (theme === 'light') await saveDemoNumbers(page)

    await gotoApp(page, `/cadernos/${s.rootId}/material/${s.part5}`)
    await settle(page)
    // From the title of the part: the PDF, its pages and the "(pág. X-Y)" links of the text
    await save(page, 'material', theme, { top: await viewportTop(page, 'h1', 24), height: 392 })

    // The short cards end higher: their capture stops under the answer
    for (const [name, url, height] of [['revisao', `/revisar?scope=document:${s.docId}`, 472], ['ingles', `/revisar?scope=topic:${s.inglesId}`, 320], ['anatomia', `/revisar?scope=topic:${s.anatomiaId}`, 320], ['oab', `/revisar?scope=topic:${s.oabId}`, 320], ['enem', `/revisar?scope=topic:${s.enemId}`, 340]] as const) {
      await gotoApp(page, url)
      await page.getByTestId('review-show').click()
      await expect(page.getByTestId('review-show')).toHaveCount(0)
      await settle(page)
      await save(page, name, theme, { height })
    }

    await gotoApp(page, `/simulados/${s.quizId}/resultado`)
    await settle(page)
    // Score and accuracy by assunto, without the app header above them
    await save(page, 'simulado', theme, { top: await viewportTop(page, 'h1', 56), height: 430 })

    await gotoApp(page, `/progresso?caderno=${s.rootId}`)
    await settle(page)
    // The exam with the two numbers of the promise (the hero), and the domínio rows without the order picker
    await save(page, 'projecao', theme, { scrollY: await topOf(page, '#provas', 4), height: 268 })
    // The end of the page cannot scroll to the top of the rows: measure where they are once scrolled
    const rows = '[data-testid=progress-performance] [role=row][data-testid]'
    await page.locator(rows).first().evaluate(el => el.scrollIntoView({ block: 'start' }))
    await page.waitForTimeout(300)
    await save(page, 'dominio', theme, { scrollY: null, top: await viewportTop(page, rows, 12), height: 176 })
  }
})
