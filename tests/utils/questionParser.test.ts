import { describe, expect, it } from 'vitest'
import { parseQuestion, parseQuestions, questionSummary } from '~/utils/questionParser'

// Formats as they come when copied from the question sites and from exam PDFs (prd-questao-errada RF-F1).

describe('questionParser · Cebraspe (Certo/Errado)', () => {
  it('Qconcursos copy: header, item, Certo/Errado lines and "Você errou! Resposta: Errado"', () => {
    const q = parseQuestion(`Q2077829
Ano: 2022 Banca: CESPE / CEBRASPE Órgão: PF Prova: CESPE / CEBRASPE - 2022 - PF - Agente de Polícia
Julgue o item a seguir, relativo aos direitos e garantias fundamentais.

O habeas data é o remédio constitucional adequado para proteger a liberdade de locomoção.
Certo
Errado
Responder
Você errou! Resposta: Errado
Comentários (12)
Estatísticas`)
    expect(q.kind).toBe('true_false')
    expect(q.answer).toBe('errado')
    expect(q.source).toBe('CESPE / CEBRASPE · 2022 · PF')
    expect(q.stem).toBe('Julgue o item a seguir, relativo aos direitos e garantias fundamentais.\n\nO habeas data é o remédio constitucional adequado para proteger a liberdade de locomoção.')
    expect(q.alternatives).toEqual([])
    expect(q.warnings).toEqual([])
  })

  it('"( ) Certo ( ) Errado" and "Gabarito: C" mean Certo', () => {
    const q = parseQuestion(`Julgue o item. A União pode legislar sobre direito penal.
( ) Certo ( ) Errado
Gabarito: C`)
    expect(q.kind).toBe('true_false')
    expect(q.answer).toBe('certo')
    expect(q.stem).toBe('Julgue o item. A União pode legislar sobre direito penal.')
  })

  it('without markers, a Certo/Errado answer key makes it true_false', () => {
    const q = parseQuestion('Compete aos municípios legislar sobre assuntos de interesse local.\nGABARITO: CERTO')
    expect(q.kind).toBe('true_false')
    expect(q.answer).toBe('certo')
  })
})

describe('questionParser · FGV, FCC, Vunesp (A–E)', () => {
  it('FGV with the banca in parentheses, (A) alternatives, answer and comment', () => {
    const q = parseQuestion(`(FGV - 2023 - TJ-RJ - Analista Judiciário) Sobre o controle concentrado de constitucionalidade, assinale a afirmativa correta.
(A) A ADI pode ter por objeto lei municipal em face da Constituição Federal.
(B) A ADC dispensa a demonstração de controvérsia judicial relevante.
(C) A ADPF tem caráter subsidiário.
(D) O amicus curiae pode recorrer da decisão de mérito.
(E) A medida cautelar em ADI tem sempre efeitos ex tunc.
Gabarito: C
Comentário: A ADPF só cabe quando não houver outro meio eficaz (art. 4º, § 1º, da Lei 9.882/99).`)
    expect(q.kind).toBe('multiple_choice')
    expect(q.source).toBe('FGV - 2023 - TJ-RJ - Analista Judiciário')
    expect(q.stem).toBe('Sobre o controle concentrado de constitucionalidade, assinale a afirmativa correta.')
    expect(q.alternatives.map(a => a.letter)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(q.alternatives[2]!.text).toBe('A ADPF tem caráter subsidiário.')
    expect(q.answer).toBe('C')
    expect(q.explanation).toBe('A ADPF só cabe quando não houver outro meio eficaz (art. 4º, § 1º, da Lei 9.882/99).')
    expect(q.warnings).toEqual([])
  })

  it('FCC from TEC: header line, a) alternatives, "Gabarito: Letra B"', () => {
    const q = parseQuestion(`FCC - Técnico Judiciário (TRT 2ª Região)/Administrativa/2014
De acordo com a Lei nº 8.112/1990, a posse ocorrerá no prazo de
a) quinze dias contados da publicação do ato de provimento.
b) trinta dias contados da publicação do ato de provimento.
c) dez dias contados da nomeação.
d) quarenta e cinco dias contados da publicação.
e) sessenta dias contados da nomeação.
Gabarito: Letra B`)
    expect(q.source).toBe('FCC - Técnico Judiciário (TRT 2ª Região)/Administrativa/2014')
    expect(q.stem).toBe('De acordo com a Lei nº 8.112/1990, a posse ocorrerá no prazo de')
    expect(q.alternatives).toHaveLength(5)
    expect(q.answer).toBe('B')
  })

  it('Qconcursos: the letter alone on a line, text on the next, and "Resposta: D"', () => {
    const q = parseQuestion(`Ano: 2024 Banca: VUNESP Órgão: TJ-SP Prova: VUNESP - 2024 - TJ-SP - Escrevente
Assinale a alternativa em que a concordância verbal está correta.
A
Fazem dois anos que ele saiu.
B
Houveram muitos problemas.
C
Devem existir soluções melhores.
D
Haviam pessoas na sala.
E
Precisa-se de funcionários.
Resposta: E`)
    expect(q.source).toBe('VUNESP · 2024 · TJ-SP')
    expect(q.alternatives.map(a => a.text)).toEqual(['Fazem dois anos que ele saiu.', 'Houveram muitos problemas.', 'Devem existir soluções melhores.', 'Haviam pessoas na sala.', 'Precisa-se de funcionários.'])
    expect(q.answer).toBe('E')
  })

  it('Vunesp with multi-line alternatives and "Alternativa correta: (A)"', () => {
    const q = parseQuestion(`Segundo o texto, o autor defende que
(A) a leitura deve ser incentivada desde a infância,
pois forma o hábito.
(B) a escola não tem papel na formação do leitor.
Alternativa correta: (A)`)
    expect(q.alternatives[0]!.text).toBe('a leitura deve ser incentivada desde a infância, pois forma o hábito.')
    expect(q.answer).toBe('A')
  })

  it('a stem that starts with the article "A" is not an alternative', () => {
    const q = parseQuestion(`A Constituição de 1988 prevê que
A) a saúde é direito de todos.
B) a saúde é dever só dos municípios.
Gab.: A`)
    expect(q.stem).toBe('A Constituição de 1988 prevê que')
    expect(q.alternatives).toHaveLength(2)
    expect(q.answer).toBe('A')
  })
})

describe('questionParser · ENEM and OAB', () => {
  it('ENEM from the PDF: "QUESTÃO 45" header and "A texto" alternatives without punctuation', () => {
    const q = parseQuestion(`QUESTÃO 45
A crescente urbanização brasileira trouxe desafios.
Nesse contexto, a principal consequência apontada é o(a)
A aumento da mobilidade urbana.
B redução das desigualdades.
C expansão das periferias.
D queda da poluição.
E fim do êxodo rural.`)
    expect(q.stem).toBe('A crescente urbanização brasileira trouxe desafios.\nNesse contexto, a principal consequência apontada é o(a)')
    expect(q.alternatives.map(a => a.letter)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(q.alternatives[2]!.text).toBe('expansão das periferias.')
    expect(q.answer).toBe('')
    expect(q.warnings).toEqual(['no_answer'])
  })

  it('a two-line sentence starting with "A" and "B" is not an ENEM alternative run', () => {
    const q = parseQuestion('A lei é clara.\nB foi citado no acórdão.\nGabarito: C')
    expect(q.alternatives).toEqual([])
    expect(q.kind).toBe('multiple_choice')
    expect(q.warnings).toContain('no_alternatives')
  })

  it('OAB 1ª fase: A) to D) and "Resposta correta: letra D"', () => {
    const q = parseQuestion(`Ano: 2023 Banca: FGV Órgão: OAB Prova: FGV - 2023 - OAB - Exame de Ordem Unificado XXXVIII
O advogado João recebeu procuração para atuar em causa própria. Sobre o caso, assinale a afirmativa correta.
A) João não pode substabelecer.
B) A procuração é nula.
C) O mandato extingue-se com a morte do mandatário apenas.
D) A procuração em causa própria é irrevogável.
Resposta correta: letra D`)
    expect(q.source).toBe('FGV · 2023 · OAB')
    expect(q.alternatives).toHaveLength(4)
    expect(q.answer).toBe('D')
  })

  it('OAB 2ª fase: discursive, the "Padrão de resposta" is the answer', () => {
    const q = parseQuestion(`Maria foi condenada em primeira instância e quer recorrer. Qual a peça cabível e o prazo?
Padrão de resposta: Apelação, no prazo de 15 dias (art. 1.003, § 5º, do CPC).`)
    expect(q.kind).toBe('open')
    expect(q.answer).toBe('Apelação, no prazo de 15 dias (art. 1.003, § 5º, do CPC)')
  })
})

describe('questionParser · several questions', () => {
  it('numbered list with a final answer key', () => {
    const r = parseQuestions(`1. Qual o prazo da posse?
a) 15 dias
b) 30 dias
2. Qual o prazo do exercício?
a) 15 dias
b) 30 dias
Gabarito: 1-B, 2-A`)
    expect(r.questions).toHaveLength(2)
    expect(r.questions[0]!.stem).toBe('Qual o prazo da posse?')
    expect(r.questions.map(q => q.answer)).toEqual(['B', 'A'])
  })

  it('two Qconcursos copies one after the other split on the header', () => {
    const r = parseQuestions(`Q100001
Ano: 2022 Banca: FCC Órgão: TRF
Primeira pergunta?
A) um
B) dois
Gabarito: A
Q100002
Ano: 2023 Banca: FGV Órgão: TJ
Segunda pergunta?
A) três
B) quatro
Gabarito: B`)
    expect(r.questions).toHaveLength(2)
    expect(r.questions[1]!.source).toBe('FGV · 2023 · TJ')
    expect(r.questions[1]!.answer).toBe('B')
  })

  it('"---" separates questions; an item list inside a stem does not split', () => {
    const r = parseQuestions(`Considere:
1. a lei é geral;
2. a lei é abstrata.
Está correto o que se afirma em
A) 1 apenas.
B) 1 e 2.
Gabarito: B
---
O STF é o guardião da Constituição.
Gabarito: Certo`)
    expect(r.questions).toHaveLength(2)
    expect(r.questions[0]!.stem).toBe('Considere:\n1. a lei é geral;\n2. a lei é abstrata.\nEstá correto o que se afirma em')
    expect(r.questions[1]!.kind).toBe('true_false')
  })

  it('a numbered item list inside one question stays one question', () => {
    const r = parseQuestions(`Analise as assertivas:
1. A posse é ato pessoal.
2. O exercício pode ser por procuração.
Está correto o que se afirma em
(A) 1, apenas.
(B) 2, apenas.
Gabarito: A`)
    expect(r.questions).toHaveLength(1)
    expect(r.questions[0]!.alternatives).toHaveLength(2)
  })

  it('keeps the first 20 and says so', () => {
    const text = Array.from({ length: 22 }, (_, i) => `Questão ${i + 1}\nPergunta ${i + 1}?\nGabarito: Certo`).join('\n')
    const r = parseQuestions(text)
    expect(r.questions).toHaveLength(20)
    expect(r.truncated).toBe(true)
    expect(r.questions[19]!.stem).toBe('Pergunta 20?')
  })
})

describe('questionParser · edges', () => {
  it('an answer letter outside the alternatives is a warning, not an answer', () => {
    const q = parseQuestion('Pergunta?\nA) x\nB) y\nGabarito: E')
    expect(q.answer).toBe('')
    expect(q.warnings).toContain('answer_not_in_alternatives')
  })

  it('the answer key may come inside the comment', () => {
    const q = parseQuestion('Pergunta?\nA) x\nB) y\nComentário: a B está certa porque sim.\nGabarito: B')
    expect(q.answer).toBe('B')
    expect(q.explanation).toBe('a B está certa porque sim.')
  })

  it('HTML is kept as plain text (the server escapes it)', () => {
    const q = parseQuestion('<b>Pergunta</b>?\nA) <script>x</script>\nB) y\nGabarito: A')
    expect(q.stem).toBe('<b>Pergunta</b>?')
    expect(q.alternatives[0]!.text).toBe('<script>x</script>')
  })

  it('empty text gives no question', () => {
    expect(parseQuestions('   \n  ').questions).toEqual([])
  })

  it('summary line of a collapsed question', () => {
    const q = parseQuestion('O STF é guardião.\nGabarito: Errado')
    expect(questionSummary(q, 1)).toBe('2. Certo ou errado · Gabarito: Errado')
  })
})
