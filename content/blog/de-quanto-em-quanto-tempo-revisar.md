---
title: "De quanto em quanto tempo revisar a matéria? Os intervalos em dias"
seoTitle: "De quanto em quanto tempo revisar a matéria: intervalos em dias"
description: A 1ª revisão vem 2 dias depois de estudar, a 2ª uns 11 dias depois e a 3ª em cerca de 46 dias. Os intervalos em dias, a regra 1-7-30 e o que muda com a prova perto.
summary: Revise pela primeira vez 2 dias depois de estudar. Se você lembrar, a próxima revisão vem uns 11 dias depois, a seguinte em cerca de 46 dias e a outra em uns 5 meses. Se esquecer, o intervalo volta a ser curto, e com a prova perto vale encurtar todos eles.
category: metodo
area: faculdade
author: baigi
published: 2026-11-17
updated: 2026-11-17
pillar: curva-do-esquecimento
related: curva-do-esquecimento, revisoes-acumuladas, caderno-de-erros-digital
context: Intervalos do FSRS-6
cover: {"value": "2 dias", "label": "até a 1ª revisão do que você estudou"}
facts: [{"value": "11 dias", "label": "da 1ª para a 2ª revisão", "icon": "calendar"}, {"value": "46 dias", "label": "da 2ª para a 3ª revisão", "icon": "calendar"}]
tags: revisão espaçada, intervalo de revisão, repetição espaçada, FSRS, como revisar
---

## De quanto em quanto tempo revisar a matéria?

Faça a primeira revisão 2 dias depois de estudar. Se você lembrar, a segunda vem 11 dias depois dela, a terceira 46 dias depois e a quarta uns 5 meses depois. Cada vez que você lembra, o intervalo seguinte fica maior; quando esquece, ele volta a ser de poucos dias.

| Revisão | Intervalo desde a anterior | Dias desde que você estudou |
|---|---|---|
| 1ª | 2 dias | 2 |
| 2ª | 11 dias | 13 |
| 3ª | 46 dias | 59 |
| 4ª | 163 dias (uns 5 meses) | 222 (uns 7 meses) |

São contas nossas, de quem faz o Baigi, com o FSRS-6 nos parâmetros padrão: o algoritmo de repetição espaçada de código aberto que o Anki traz desde a versão 25.07 e que o Baigi usa. A conta supõe que você quer lembrar 90% do que estudou e que acerta cada revisão, feita no dia marcado, com os dias arredondados.

"Revisar", aqui, quer dizer tentar lembrar sem olhar e só depois conferir a resposta, com flashcards ou questões. Reler o resumo ajuda pouco, como explicamos no [guia da curva do esquecimento](/blog/curva-do-esquecimento#por-que-se-testar-segura-mais-do-que-reler).

## Por que o intervalo aumenta a cada revisão?

Porque cada vez que você consegue lembrar, a memória passa a cair mais devagar. O FSRS chama isso de estabilidade: o número de dias até a chance de lembrar cair para 90%. O card volta quando chega nesse ponto, antes de você esquecer.

Logo depois do primeiro estudo, a estabilidade é de pouco mais de 2 dias. Depois de uma revisão certa, passa de 10 dias, e depois de outra, de 46. Por isso a tabela cresce tão rápido. O desenho da curva, de Ebbinghaus aos modelos de hoje, está no [guia da curva do esquecimento](/blog/curva-do-esquecimento).

```card
{"q": "Estudei um assunto hoje. Quando faço a primeira revisão?", "a": "Daqui a 2 dias. Se lembrar, a próxima vem 11 dias depois.", "source": "Contas com o FSRS-6, parâmetros padrão"}
```

Para ver a chance de lembrar um assunto dia a dia, conforme quantas vezes você já revisou, use a calculadora:

```tool
{"tool": "calculadora-do-esquecimento"}
```

## A regra de 24 horas, 7 dias e 30 dias funciona?

Funciona no primeiro mês. Fizemos a conta com o FSRS-6 para quem estuda e revisa 1, 7 e 30 dias depois, lembrando em todas:

| Revisão da regra | Chance de lembrar naquele dia |
|---|---|
| 24 horas depois | 94,7% |
| 7 dias depois | 91,3% |
| 30 dias depois | 91,5% |

As revisões dos dias 7 e 30 caem perto dos 90% em que o FSRS marcaria a revisão. A de 24 horas vem cedo: a chance ainda está alta, e uma revisão feita cedo demais aumenta pouco o intervalo seguinte. Revisar no segundo dia rende mais com o mesmo esforço.

A regra para no dia 30, e aí muita gente repete a matéria todo mês para sempre ou para de revisar. Pelo modelo, depois das três revisões da regra o próximo intervalo já seria de cerca de 96 dias. A regra também põe o assunto fácil e o difícil no mesmo dia, enquanto um algoritmo calcula o dia de cada pergunta pelas suas respostas.

## E quando a prova está perto?

Encurte os intervalos. O melhor espaçamento depende de quando você vai precisar lembrar.

Nicholas Cepeda e colegas testaram isso em 2008 com 1.354 pessoas. Elas aprenderam 32 fatos pouco conhecidos, fizeram uma única revisão depois de um intervalo que variou até 3,5 meses e fizeram uma prova final até um ano depois. Para a lembrança sem alternativas, o melhor intervalo entre o estudo e a revisão foi de cerca de:

| Prova daqui a | Melhor intervalo até a revisão |
|---|---|
| 7 dias | 3 dias |
| 35 dias | 8 dias |
| 70 dias | 12 dias |
| 350 dias | 27 dias |

No resumo do artigo, o intervalo ideal cresce com a distância até a prova, mas encolhe como proporção dela, de 20% a 40% de uma prova daqui a uma semana para 5% a 10% de uma prova daqui a um ano. Nesse estudo, revisar no intervalo certo em vez de no mesmo dia aumentou em 64% o que as pessoas lembravam na prova final.

Na prática, com o FSRS, a mudança é pedir para lembrar mais. Refizemos a tabela do começo com 95% e com 85%:

| Quanto você quer lembrar | 1ª | 2ª | 3ª | 4ª revisão |
|---|---|---|---|---|
| 95% (prova perto) | 1 dia | 3 dias | 8 dias | 19 dias |
| 90% (padrão) | 2 dias | 11 dias | 46 dias | 163 dias |
| 85% | 4 dias | 31 dias | 173 dias | 772 dias |

Com 95%, as quatro revisões cabem em 31 dias. O preço é ter mais cards para revisar por dia. Com 85%, você revisa bem menos e esquece mais.

## O que muda quando você esquece na revisão?

O assunto volta no mesmo dia e o intervalo encolhe. No FSRS, um erro derruba a estabilidade, mas não para o zero: um card que estava com intervalo de 11 dias e foi esquecido passa a voltar em uns 2 dias depois de você reaprender. Daí em diante, ele cresce de novo a cada acerto.

Por isso vale marcar o erro com honestidade. Se você esqueceu e marca que lembrou, o card só volta semanas depois, quando a chance de lembrar já é bem menor. Questão errada também conta: no [caderno de erros digital](/blog/caderno-de-erros-digital) explicamos como transformar cada uma numa pergunta que volta nesses intervalos.

E se você ficou dias sem revisar e a fila cresceu, não precisa recomeçar. Veja [o que fazer com as revisões acumuladas](/blog/revisoes-acumuladas).

## Como seguir esses intervalos sem planilha?

Com poucos assuntos, uma agenda resolve: anote a data de cada revisão ao lado do assunto e, depois de revisar, marque a próxima pela tabela. O trabalho aparece quando são centenas de perguntas, cada uma num ponto diferente da tabela, algumas esquecidas e outras não.

É essa conta que um programa de repetição espaçada faz. No Baigi, cada card volta no dia que o FSRS calcula pelas suas respostas:

- **Card novo:** se você lembrar, ele volta em 10 minutos e, lembrando de novo, em 2 dias. Daí em diante, segue a tabela do começo enquanto você acertar.
- **Não lembrei:** o card volta na mesma sessão, e o intervalo seguinte fica curto.
- **Prova perto:** em Configurações, na parte de estudo, a opção "Quanto você quer lembrar" muda o alvo de 90% para 95% (mais revisões) ou 85% (menos revisões), e as revisões se reajustam.

Revisar os cards é grátis.

```cta
{"area": "faculdade", "text": "Quer ver o card voltar no dia certo? Revise 6 cards prontos agora, sem criar conta."}
```

```quiz
{"area": "faculdade", "title": "Teste: o que ficou deste texto?", "cards": [
  {"q": "Estudei hoje e lembrei na 1ª revisão. Quando vem a 2ª?", "a": "Uns 11 dias depois da 1ª, ou 13 dias depois de estudar.", "source": "Contas com o FSRS-6, parâmetros padrão, 90%"},
  {"q": "Na regra 1-7-30, qual revisão vem cedo demais?", "a": "A de 24 horas: a chance de lembrar ainda está em 94,7%.", "source": "Contas com o FSRS-6, parâmetros padrão"},
  {"q": "Com a prova daqui a 35 dias, qual foi o melhor intervalo até a revisão no estudo de Cepeda?", "a": "Cerca de 8 dias.", "source": "Cepeda e colegas, 2008, Psychological Science"},
  {"q": "Esqueci um card na revisão. O que acontece com o intervalo?", "a": "Encolhe: o card volta no mesmo dia e depois em poucos dias, e cresce de novo a cada acerto.", "source": "Modelo FSRS"}
]}
```

## Perguntas frequentes

### Quantas vezes preciso revisar uma matéria?

Umas quatro revisões certas levam um assunto a meses sem precisar de outra. Pela conta do FSRS-6 com 90%, a quarta revisão certa marca a próxima para mais de um ano depois. Esquecer no caminho acrescenta revisões.

### Revisar antes do dia faz mal?

Não faz mal, mas rende menos. Quando a chance de lembrar ainda está alta, acertar aumenta pouco o intervalo seguinte. Antecipar faz sentido quando a prova está chegando.

### Revisar toda semana é suficiente?

No começo, sim; depois, é revisão demais. No primeiro mês, toda semana não fica longe do que o modelo marca (revisões no 2º e no 13º dia), mas um assunto que você já acertou três vezes só precisaria voltar daqui a meses. Esse tempo rende mais em matéria nova ou no que você erra.

### Revisar a matéria inteira ou só o que eu errei?

Revise pergunta por pergunta. Dentro de um assunto há o que você já sabe e o que esquece toda vez, e cada parte pede um intervalo. Com flashcards ou questões, o que você acerta se espaça sozinho e o que você erra volta mais cedo.

## Fontes

1. [Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T. e Pashler, H. (2008). Spacing effects in learning: a temporal ridgeline of optimal retention](https://doi.org/10.1111/j.1467-9280.2008.02209.x). Psychological Science 19(11), 1095-1102 (resumo e resultados: intervalos interpolados para a lembrança).
2. FSRS, algoritmo de repetição espaçada de código aberto: [fórmulas da versão 6 e definição de estabilidade](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) e [parâmetros padrão do FSRS-6](https://github.com/open-spaced-repetition/py-fsrs). Os intervalos de todas as tabelas e as chances da regra 1-7-30 são contas nossas com esses parâmetros, com os dias arredondados, refeitas em 17/11/2026.
3. [Notas da versão 25.07 do Anki](https://github.com/ankitects/anki/releases/tag/25.07) (FSRS-6).
