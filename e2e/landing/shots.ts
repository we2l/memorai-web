import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import type { Browser, Page } from '@playwright/test'
import { test, expect, apiCall, gotoApp, tinker, USERS } from '../auditoria/support/fixtures'
import { seedQuiz } from '../auditoria/support/seed-praticar'

/**
 * Real screens of the landing (prd-landing-v4 RF-L12): the app itself, with a demo account, never a drawn screen.
 *
 * Seeds `e2e-landing-shots@audit.test` (recreated on every run) through the API and tinker, with NO AI: cards go
 * through POST /ai/accept-cards (the persistence route), the notes get their content straight in the database (the
 * API would queue the embedding job), and the PDF, its parts, the quiz and the card states are rows written by
 * tinker. Then captures 390 px screens (DPR 2) in light and dark and writes AVIF + WebP to public/landing/.
 * Landing D (prd-landing-d RF-D14): the Hoje and the review screens of each area, then the clips of the review, the
 * material and the quiz (public/landing/video/): real recordings of the same account (Playwright recordVideo at
 * 390 × 844), cut and encoded to MP4 H.264 and WebM VP9 by the ffmpeg of the API container, with the first frame as
 * the poster. The personas of each section: docs/research/landing-personas-2026-11.md (INSS in the hero, the
 * Como funciona and the projection; medicine in the simulado).
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
    title: 'Seguridade social na Constituição', pages: [1, 24],
    body: [
      ['A seguridade social compreende um conjunto integrado de ações de iniciativa dos Poderes Públicos e da sociedade, destinadas a assegurar os direitos relativos à saúde, à previdência e à assistência social (art. 194 da CF).', '(pág. 3)'],
      ['A saúde é direito de todos e dever do Estado (art. 196). A assistência social será prestada a quem dela necessitar, independentemente de contribuição (art. 203).', '(pág. 9-12)'],
    ],
    cards: [
      ['O que a seguridade social compreende (art. 194 da CF)?', 'Saúde, previdência social e assistência social.'],
      ['Qual das três áreas da seguridade exige contribuição?', 'Só a previdência social, que tem caráter contributivo e filiação obrigatória (art. 201 da CF).'],
      ['A assistência social depende de contribuição?', 'Não: é prestada a quem dela necessitar (art. 203 da CF).'],
      ['Como é a gestão da seguridade social?', 'Democrática e descentralizada, quadripartite: trabalhadores, empregadores, aposentados e Governo (art. 194, parágrafo único, VII).'],
      ['Qual princípio impede reduzir o valor dos benefícios?', 'A irredutibilidade do valor dos benefícios (art. 194, parágrafo único, IV).'],
      ['Um benefício pode ser criado sem fonte de custeio?', 'Não: nenhum benefício ou serviço pode ser criado, majorado ou estendido sem a fonte de custeio total (art. 195, § 5º).'],
    ],
  },
  {
    title: 'Segurados do Regime Geral', pages: [25, 56],
    body: [
      ['São segurados obrigatórios da Previdência Social o empregado, o empregado doméstico, o contribuinte individual, o trabalhador avulso e o segurado especial (art. 11 da Lei 8.213/1991).', '(pág. 26)'],
    ],
    cards: [
      ['Quem são os segurados obrigatórios do RGPS?', 'Empregado, empregado doméstico, contribuinte individual, trabalhador avulso e segurado especial (art. 11 da Lei 8.213/1991).'],
      ['O pescador artesanal que faz da pesca o principal meio de vida é que tipo de segurado?', 'Segurado especial (art. 11, VII, b, da Lei 8.213/1991).'],
      ['Quem pode ser segurado facultativo?', 'Quem não exerce atividade que o torne segurado obrigatório e contribui por conta própria, como a dona de casa e o estudante (Decreto 3.048/1999, art. 11).'],
      ['O servidor com regime próprio é segurado do RGPS?', 'Não, salvo se exercer outra atividade abrangida pelo RGPS (art. 12 da Lei 8.213/1991).'],
    ],
  },
  {
    title: 'Qualidade de segurado', pages: [57, 80],
    body: [
      ['Mantém a qualidade de segurado, independentemente de contribuições, até 12 meses após a cessação das contribuições, o segurado que deixar de exercer atividade remunerada (art. 15, II, da Lei 8.213/1991).', '(pág. 60)'],
    ],
    cards: [
      ['Por quanto tempo o empregado que parou de contribuir mantém a qualidade de segurado?', 'Até 12 meses após a cessação das contribuições (art. 15, II, da Lei 8.213/1991).'],
      ['Quando esse prazo de 12 meses vai para 24?', 'Quando o segurado já pagou mais de 120 contribuições mensais sem perder a qualidade de segurado (art. 15, § 1º).'],
      ['E o segurado desempregado?', 'Os prazos ganham mais 12 meses se ele comprovar o desemprego pelo registro no órgão próprio do Ministério do Trabalho (art. 15, § 2º).'],
      ['Por quanto tempo o segurado facultativo mantém a qualidade de segurado?', 'Até 6 meses após a cessação das contribuições (art. 15, VI).'],
      ['Quem recebe benefício perde a qualidade de segurado?', 'Não: mantém sem limite de prazo, exceto quem recebe só o auxílio-acidente (art. 15, I).'],
    ],
  },
  {
    title: 'Carência', pages: [81, 104],
    body: [
      ['Período de carência é o número mínimo de contribuições mensais indispensáveis para que o beneficiário faça jus ao benefício (art. 24 da Lei 8.213/1991).', '(pág. 82)'],
    ],
    cards: [
      ['Qual é a carência do auxílio por incapacidade temporária?', '12 contribuições mensais (art. 25, I, da Lei 8.213/1991).'],
      ['Qual é a carência da aposentadoria por idade?', '180 contribuições mensais (art. 25, II, da Lei 8.213/1991).'],
      ['Qual é a carência do auxílio-reclusão?', '24 contribuições mensais (art. 25, IV, da Lei 8.213/1991).'],
      ['Quais benefícios independem de carência?', 'Pensão por morte, salário-família e auxílio-acidente, entre outros (art. 26, I, da Lei 8.213/1991).'],
      ['A pensão por morte exige carência?', 'Não (art. 26, I, da Lei 8.213/1991).'],
    ],
  },
  {
    title: 'Benefícios', pages: [105, 140],
    body: [
      ['O auxílio-acidente será concedido, como indenização, ao segurado quando, após a consolidação das lesões decorrentes de acidente de qualquer natureza, resultarem sequelas que impliquem redução da capacidade para o trabalho que habitualmente exercia (art. 86 da Lei 8.213/1991).', '(pág. 121)'],
      ['O salário-maternidade é devido à segurada durante 120 dias (art. 71).', '(pág. 128)'],
    ],
    cards: [
      ['O auxílio-acidente é pago junto com o salário?', 'Sim: o salário não impede o recebimento, que termina na véspera de qualquer aposentadoria (art. 86, §§ 1º e 3º, da Lei 8.213/1991).'],
      ['Por quanto tempo é pago o salário-maternidade?', '120 dias (art. 71 da Lei 8.213/1991).'],
      ['Quem recebe o auxílio-reclusão?', 'Os dependentes do segurado de baixa renda recolhido à prisão em regime fechado (art. 80 da Lei 8.213/1991).'],
      ['Até que idade do filho o segurado de baixa renda recebe o salário-família?', 'Até 14 anos, ou de qualquer idade se o filho for inválido (art. 65 da Lei 8.213/1991).'],
      ['O auxílio-acidente exige carência?', 'Não (art. 26, I, da Lei 8.213/1991).'],
    ],
  },
  {
    title: 'Assistência social e BPC', pages: [141, 160],
    body: [
      ['O benefício de prestação continuada é a garantia de um salário mínimo mensal à pessoa com deficiência e ao idoso com 65 anos ou mais que comprovem não possuir meios de prover a própria manutenção nem de tê-la provida por sua família (art. 20 da Lei 8.742/1993).', '(pág. 143)'],
    ],
    cards: [
      ['Qual é o valor do BPC?', 'Um salário mínimo por mês (art. 20 da Lei 8.742/1993).'],
      ['A partir de que idade o idoso pode receber o BPC?', '65 anos (art. 20 da Lei 8.742/1993).'],
      ['O BPC exige contribuição ao INSS?', 'Não: é assistência social, prestada a quem dela necessitar (art. 203 da CF).'],
      ['O BPC deixa pensão por morte?', 'Não: é intransferível e não gera pensão aos herdeiros (Decreto 6.214/2007, art. 23).'],
      ['O BPC paga 13º?', 'Não gera abono anual (Decreto 6.214/2007, art. 22).'],
      ['Quem operacionaliza o BPC?', 'O INSS (Decreto 6.214/2007, art. 3º).'],
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
// Medicine (owner, 07/11: the simulado section speaks to medicina): Fisiologia, from Guyton & Hall, Tratado de
// Fisiologia Médica. Wrong: Q3, Q5 and Q8, as the dolphin says on the landing.
type Question = [topic: 'cardio' | 'resp', stem: string, options: [string, string, string, string], correct: number, answered: number, explanation: string]
const QUIZ: Question[] = [
  ['cardio', 'Onde se origina normalmente o impulso elétrico do coração?', ['No nó atrioventricular', 'No nó sinoatrial', 'No feixe de His', 'Nas fibras de Purkinje'], 1, 1, 'O nó sinoatrial, na parede do átrio direito, é o marca-passo normal do coração.'],
  ['cardio', 'Qual câmara bombeia o sangue para a circulação sistêmica?', ['Átrio direito', 'Ventrículo direito', 'Átrio esquerdo', 'Ventrículo esquerdo'], 3, 3, 'O ventrículo esquerdo ejeta o sangue na aorta.'],
  ['cardio', 'A onda P do eletrocardiograma representa a:', ['Despolarização ventricular', 'Repolarização ventricular', 'Despolarização atrial', 'Repolarização atrial'], 2, 0, 'A onda P é a despolarização dos átrios; o QRS, a dos ventrículos; a onda T, a repolarização ventricular.'],
  ['cardio', 'O débito cardíaco é o produto de:', ['Frequência cardíaca e volume sistólico', 'Pressão arterial e frequência cardíaca', 'Volume sistólico e resistência periférica', 'Frequência cardíaca e resistência periférica'], 0, 0, 'Débito cardíaco = frequência cardíaca × volume sistólico.'],
  ['cardio', 'A artéria pulmonar leva sangue:', ['Rico em oxigênio, do ventrículo esquerdo à aorta', 'Pobre em oxigênio, do ventrículo direito aos pulmões', 'Rico em oxigênio, dos pulmões ao átrio esquerdo', 'Pobre em oxigênio, do átrio direito ao ventrículo direito'], 1, 2, 'A artéria pulmonar sai do ventrículo direito e leva sangue pobre em oxigênio aos pulmões.'],
  ['cardio', 'Qual valva separa o átrio e o ventrículo esquerdos?', ['Tricúspide', 'Pulmonar', 'Aórtica', 'Mitral'], 3, 3, 'A valva mitral (bicúspide).'],
  ['resp', 'Qual é o principal músculo da inspiração?', ['Diafragma', 'Intercostais internos', 'Reto do abdome', 'Esternocleidomastóideo'], 0, 0, 'O diafragma: ao contrair, aumenta o volume do tórax.'],
  ['resp', 'O surfactante pulmonar é produzido pelos:', ['Pneumócitos tipo I', 'Pneumócitos tipo II', 'Macrófagos alveolares', 'Células caliciformes'], 1, 0, 'Os pneumócitos tipo II produzem o surfactante, que reduz a tensão superficial nos alvéolos.'],
  ['resp', 'Onde acontece a troca gasosa?', ['Na traqueia', 'Nos brônquios', 'Nos alvéolos', 'Nos bronquíolos terminais'], 2, 2, 'Nos alvéolos, pela membrana alveolocapilar.'],
  ['resp', 'Qual nervo inerva o diafragma?', ['Vago', 'Frênico', 'Intercostal', 'Laríngeo recorrente'], 1, 1, 'O nervo frênico (raízes C3, C4 e C5).'],
]

function seedRealQuiz(topics: { cardio: string, resp: string }, rootId: string): string {
  const letter = (i: number) => 'abcd'[i]
  const rows = QUIZ.map(([t, stem, opts, correct, answered, expl], i) => {
    const options = opts.map((o, j) => `${letter(j)}) ${o}`)
    return { topic_id: topics[t], position: i + 1, stem, options, correct_answer: letter(correct), user_answer: options[answered], is_correct: correct === answered, explanation: expl }
  })
  const right = rows.filter(r => r.is_correct).length
  const json = JSON.stringify(rows).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const out = php(`
    $at = now()->subMinutes(20);
    $q = App\\Domain\\Quiz\\Models\\Quiz::create(['user_id' => $u->id, 'topic_id' => '${rootId}', 'title' => 'Fisiologia: cardiovascular e respiratório', 'status' => 'completed', 'mode' => 'learning', 'config' => ['quantity' => ${rows.length}, 'types' => ['multiple_choice'], 'difficulty' => 'mixed'], 'total_questions' => ${rows.length}, 'correct_count' => ${right}, 'score_percent' => ${Math.round(right * 100 / rows.length)}, 'time_spent_seconds' => 840, 'started_at' => $at->copy()->subMinutes(14), 'completed_at' => $at]);
    foreach (json_decode('${json}', true) as $r) {
      App\\Domain\\Quiz\\Models\\QuizQuestion::create($r + ['quiz_id' => $q->id, 'type' => 'multiple_choice', 'difficulty' => 'medium', 'answered_at' => $at]);
    }
    echo 'QUIZ_ID=' . $q->id;
  `)
  const id = out.match(/QUIZ_ID=([0-9a-f-]{36})/)?.[1]
  if (!id) throw new Error(`simulado não criado:\n${out}`)
  return id
}

interface Seed { rootId: string, docId: string, part5: string, inglesId: string, anatomiaId: string, quizId: string, oabId: string, enemId: string, due: string[], weak: string[] }

async function seed(page: Page): Promise<Seed> {
  // The concurso of the landing (docs/research/landing-personas-2026-11.md): INSS, técnico do seguro social. The
  // matérias are of the last edital (2022): Seguridade Social, Direito Administrativo, Português.
  const root = await topic(page, 'Concurso INSS', { learning_mode: 'exam' })
  const seg = await topic(page, 'Seguridade Social', { parent_id: root.id })
  const qual = await topic(page, 'Qualidade de segurado', { parent_id: seg.id })
  const ben = await topic(page, 'Benefícios', { parent_id: seg.id })
  const adm = await topic(page, 'Direito Administrativo', { parent_id: root.id })
  const pt = await topic(page, 'Português', { parent_id: root.id })

  // The PDF in 6 parts: a note per part (part_index, pages, batches) under one document row
  const noteIds: string[] = []
  for (const part of PARTS) {
    const note = (await apiCall(page, 'POST', `/topics/${seg.id}/notes`, { title: part.title })).data
    const words = part.body.reduce((n, [t]) => n + t.split(/\s+/).length, 0) * 40
    setContent(note.id, [heading(2, part.title), ...part.body.flatMap(([text, pg]) => [para(text, pg)])], words)
    noteIds.push(note.id)
  }
  const out = php(`
    $d = App\\Domain\\Agent\\Models\\Document::create(['user_id' => $u->id, 'topic_id' => '${seg.id}', 'filename' => 'apostila.pdf', 'original_name' => 'Apostila de Seguridade Social.pdf', 'file_path' => 'e2e/sem-arquivo.pdf', 'file_size' => 3800000, 'pages_count' => 160, 'processed_pages' => 160, 'status' => 'completed', 'note_generation_status' => 'completed', 'note_generation_progress' => 18, 'note_total_batches' => 18, 'auto_cards' => false]);
    foreach (${sqlList(noteIds)} as $i => $id) {
      $pages = ${JSON.stringify(PARTS.map(p => p.pages))}[$i];
      Illuminate\\Support\\Facades\\DB::table('notes')->where('id', $id)->update(['source_document_id' => $d->id, 'part_index' => $i + 1, 'page_start' => $pages[0], 'page_end' => $pages[1], 'part_batches' => 3]);
    }
    echo 'DOC_ID=' . $d->id;
  `)
  const docId = out.match(/DOC_ID=([0-9a-f-]{36})/)?.[1]
  if (!docId) throw new Error(`documento não criado:\n${out}`)

  // Cards per part, in the assunto of the part
  const cardTopic = [seg.id, seg.id, qual.id, seg.id, ben.id, seg.id]
  // Parts 1-2 studied and "em dia" (the domínio), parts 3-6 due today: 2 batches in the PDF session
  const due: string[] = []
  for (const [i, part] of PARTS.entries()) {
    const ids = await addCards(page, root.id, cardTopic[i]!, part.cards, noteIds[i])
    if (i < 2) study(ids, 4 + i * 3, 12)
    else {
      study(ids, -1, 9)
      due.push(...ids)
    }
  }
  // The card on screen: the most overdue of the session, with errors
  const acidente = await addCards(page, root.id, ben.id, [['Quanto vale o auxílio-acidente?', '50% do salário de benefício, pago como indenização (art. 86, § 1º, da Lei 8.213/1991).']], noteIds[4])
  study(acidente, -6, 4, 2)

  const admIds = await addCards(page, root.id, adm.id, ADMIN)
  study(admIds.slice(0, 2), -1, 6)
  study(admIds.slice(2), 5, 10)
  const ptIds = await addCards(page, root.id, pt.id, PORTUGUES)
  study(ptIds, 3, 12)

  // Questions answered by assunto (the accuracy of Progresso: >= 10 answered each)
  const answers = (id: string, total: number, right: number) => Array.from({ length: total }, (_, i) => [id, i < right] as [string, boolean])
  seedQuiz('landingShots', root.id, 'Simulado INSS', [...answers(qual.id, 12, 7), ...answers(ben.id, 12, 10), ...answers(adm.id, 10, 5), ...answers(pt.id, 10, 8)], { minutesAgo: 60 * 26 })

  const examDate = new Date(Date.now() + 45 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  await apiCall(page, 'POST', '/exams', { title: 'Técnico do INSS', exam_date: examDate, topic_ids: [root.id] })

  // Medicine: the simulado of the landing, with the history of each assunto (>= 10 answered) and a previous one
  const fisio = await topic(page, 'Fisiologia', { learning_mode: 'academic' })
  const cardio = await topic(page, 'Sistema cardiovascular', { parent_id: fisio.id })
  const resp = await topic(page, 'Sistema respiratório', { parent_id: fisio.id })
  seedQuiz('landingShots', fisio.id, 'Fisiologia: revisão', [...answers(cardio.id, 12, 6), ...answers(resp.id, 12, 10)], { minutesAgo: 60 * 50 })
  const quizId = seedRealQuiz({ cardio: cardio.id, resp: resp.id }, fisio.id)

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
  // The default of the review (revisão v5 Fase A): "Lembrei / Não lembrei", not the 4 buttons of the Anki
  php(`$u->forceFill(['review_buttons' => 'two'])->save(); echo 'ok';`)
  php(`$u->forceFill(['current_streak' => 12, 'longest_streak' => 12, 'last_review_date' => now('America/Sao_Paulo')->subDay()->toDateString()])->save(); echo 'ok';`)

  return { rootId: root.id, docId, part5: noteIds[4]!, inglesId: ingles.id, anatomiaId: anatomia.id, quizId, oabId: oab.id, enemId: enem.id, due, weak: acidente }
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


async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
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

// ── The clips ──

const VIDEO = path.join(OUT, 'video')
const FFMPEG_CONTAINER = process.env.FFMPEG_CONTAINER ?? 'baigi-app'

function ffmpeg(args: string[]) {
  execFileSync('docker', ['exec', FFMPEG_CONTAINER, 'ffmpeg', '-v', 'error', '-y', ...args], { stdio: 'inherit', timeout: 180_000 })
}

/** Cuts [from, from + seconds] of the raw recording and writes the MP4, the WebM and the poster (its first frame). */
async function encode(raw: string, name: string, from: number, seconds: number) {
  const tmp = `/tmp/landing-clip-${name}`
  execFileSync('docker', ['exec', FFMPEG_CONTAINER, 'mkdir', '-p', tmp])
  execFileSync('docker', ['cp', raw, `${FFMPEG_CONTAINER}:${tmp}/raw.webm`])
  const cut = ['-ss', from.toFixed(2), '-t', seconds.toFixed(2), '-i', `${tmp}/raw.webm`, '-an', '-vf', 'scale=390:844']
  ffmpeg([...cut, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', `${tmp}/out.mp4`])
  ffmpeg([...cut, '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', `${tmp}/out.webm`])
  ffmpeg(['-i', `${tmp}/out.mp4`, '-frames:v', '1', `${tmp}/poster.png`])
  fs.mkdirSync(VIDEO, { recursive: true })
  for (const [from_, to] of [['out.mp4', `${name}.mp4`], ['out.webm', `${name}.webm`], ['poster.png', `${name}-poster.png`]]) {
    execFileSync('docker', ['cp', `${FFMPEG_CONTAINER}:${tmp}/${from_}`, path.join(VIDEO, to)])
  }
  execFileSync('docker', ['exec', FFMPEG_CONTAINER, 'rm', '-rf', tmp])
  const poster = path.join(VIDEO, `${name}-poster.png`)
  const img = sharp(fs.readFileSync(poster))
  await img.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(VIDEO, `${name}-poster.avif`))
  await img.clone().webp({ quality: 74, effort: 6 }).toFile(path.join(VIDEO, `${name}-poster.webp`))
  fs.rmSync(poster)
}

/**
 * Records one clip in a fresh context with the same login: opens `url`, waits for it, then `act` plays the scene.
 * Only the scene is kept (the loading before it is cut).
 */
async function record(browser: Browser, state: Awaited<ReturnType<Page['context']>['storageState']>, theme: 'light' | 'dark', name: string, url: string, ready: (page: Page) => Promise<void>, act: (page: Page) => Promise<void>) {
  const base = path.join(__dirname, '..', '..', 'test-results')
  fs.mkdirSync(base, { recursive: true })
  const dir = fs.mkdtempSync(path.join(base, 'clip-'))
  const context = await browser.newContext({ baseURL: 'http://localhost:3000', storageState: state, viewport: { width: WIDTH, height: 844 }, deviceScaleFactor: 1, colorScheme: theme, recordVideo: { dir, size: { width: WIDTH, height: 844 } } })
  await context.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* only the capture */ } }, theme)
  const page = await context.newPage()
  const born = Date.now()
  await page.goto(url)
  await ready(page)
  await settle(page)
  const from = (Date.now() - born) / 1000
  await act(page)
  const seconds = (Date.now() - born) / 1000 - from
  const video = page.video()
  await context.close()
  await encode(await video!.path(), `${name}-${theme}`, from, seconds)
  fs.rmSync(dir, { recursive: true, force: true })
}

/** Scrolls the page by `by` px in small steps over `ms`, as a thumb would. */
async function glide(page: Page, by: number, ms: number) {
  const steps = Math.round(ms / 40)
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, by / steps)
    await page.waitForTimeout(40)
  }
}

/** Every take starts from the same cards: the review rates 4 of them. */
function restore(s: Seed) {
  study(s.due, -1, 9)
  study(s.weak, -6, 4, 2)
}

async function clips(page: Page, browser: Browser, s: Seed) {
  const state = await page.context().storageState()
  for (const theme of ['light', 'dark'] as const) {
    restore(s)
    await record(browser, state, theme, 'revisao', `/revisar?scope=document:${s.docId}`, p => expect(p.getByTestId('review-show')).toBeVisible(), async (p) => {
      // Revisão v5 + E2: "Lembrei" holds the card under the green banner (1,2 s) and the next one slides in
      for (let i = 0; i < 4; i++) {
        await expect(p.getByTestId('review-show')).toBeVisible()
        await p.waitForTimeout(900)
        await p.getByTestId('review-show').click()
        await p.waitForTimeout(1100)
        await p.getByTestId('rate-3').click()
        await p.waitForTimeout(1500)
      }
    })
    await record(browser, state, theme, 'simulado', `/simulados/${s.quizId}/resultado`, p => expect(p.getByText('Você acertou 7 de 10')).toBeVisible(), async (p) => {
      await p.waitForTimeout(1200)
      await glide(p, 1150, 7400)
      await p.waitForTimeout(1200)
    })
  }
  // The material has a light take only (prd-landing-d: the dark one falls back to it)
  restore(s)
  await record(browser, state, 'light', 'material', `/cadernos/${s.rootId}/material/${s.part5}`, p => expect(p.getByTestId('material-bar-cards')).toBeVisible(), async (p) => {
    await p.waitForTimeout(1200)
    await glide(p, 700, 2800)
    await p.waitForTimeout(900)
    await p.getByTestId('material-bar-cards').click()
    await p.waitForTimeout(3000)
  })
}

test.use({ auditUser: 'landingShots', viewport: { width: WIDTH, height: 844 }, deviceScaleFactor: 2 })

test('telas e vídeos reais da landing', async ({ page, browser }) => {
  await gotoApp(page, '/hoje')
  const s = await seed(page)
  const heights: Record<string, number> = {}

  for (const theme of ['light', 'dark'] as const) {
    await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* only the capture */ } }, theme)

    await gotoApp(page, '/hoje')
    await settle(page)
    // The whole first screen of the Hoje: the phone of the projection (landing D) and of `?m=prova`
    // Visual E2: the exam with the projection (the lilac block the landing talks about) comes after the goal and the
    // plan, so the page scrolls until it sits whole above the bottom nav
    const hojeY = await page.evaluate(() => {
      const exam = document.querySelector('[data-testid="home-exam"]')!.getBoundingClientRect()
      const nav = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64
      return Math.max(0, Math.ceil(window.scrollY + exam.bottom - (window.innerHeight - nav - 16)))
    })
    await save(page, 'hoje-tela', theme, { scrollY: hojeY, height: 844 })
    if (theme === 'light') await saveDemoNumbers(page)

    // The short cards end higher: their capture stops under the answer
    // Each capture ends 24 px under the card (the height goes to SCREENS in app/utils/landing.ts)
    for (const [name, url] of [['revisao', `/revisar?scope=document:${s.docId}`], ['ingles', `/revisar?scope=topic:${s.inglesId}`], ['anatomia', `/revisar?scope=topic:${s.anatomiaId}`], ['oab', `/revisar?scope=topic:${s.oabId}`], ['enem', `/revisar?scope=topic:${s.enemId}`]] as const) {
      await gotoApp(page, url)
      await page.getByTestId('review-show').click()
      await expect(page.getByTestId('review-show')).toHaveCount(0)
      await settle(page)
      const box = (await page.getByTestId('review-card').boundingBox())!
      const height = Math.min(844, Math.ceil(box.y + box.height + 24))
      heights[name] = Math.max(heights[name] ?? 0, height)
      await save(page, name, theme, { height })
    }
  }

  console.log(`SCREENS heights: ${JSON.stringify(heights)}`)
  // The clips rate cards: after the screens and the numbers of demo.json
  await clips(page, browser, s)
})
