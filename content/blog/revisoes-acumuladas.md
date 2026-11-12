---
title: "Revisões acumuladas no Anki: como recuperar a fila sem zerar tudo num dia"
seoTitle: "Revisões acumuladas no Anki: o que fazer com cards atrasados"
description: O que fazer quando as revisões acumulam no Anki ou em outro app: dividir o atraso em 3 a 14 dias, começar pelo que você está perto de esquecer e o que não fazer.
summary: Não tente zerar as revisões acumuladas num dia só. Divida o atraso por 3 a 14 dias, comece pelos cards que você está mais perto de esquecer, pare de pôr cards novos até recuperar e continue fazendo as revisões que vencem a cada dia. Resetar o baralho ou marcar tudo como Fácil para limpar a fila deixa a situação pior.
category: metodo
area: concurso
author: baigi
published: 2026-11-12
updated: 2026-11-12
pillar: curva-do-esquecimento
related: alternativa-ao-anki, curva-do-esquecimento, caderno-de-erros-digital
context: Cards atrasados no Anki
cover: {"value": "72", "label": "cards por dia para recuperar 500 em 7 dias"}
facts: [{"value": "74%", "label": "de chance num card de 2 dias, 10 dias atrasado", "icon": "chart"}, {"value": "89%", "label": "de chance num card de 60 dias, mesmo atraso", "icon": "chart"}]
tags: revisões acumuladas, Anki, cards atrasados, repetição espaçada, FSRS, revisão
---

## O que fazer quando as revisões acumulam?

Divida o atraso em partes e faça um pouco por dia, junto com as revisões que vencem a cada dia. Na prática:

| Faça | Não faça |
|---|---|
| Divida o atraso em 3, 7 ou 14 dias | Tentar zerar 500 cards numa tarde |
| Comece pelos cards mais perto de serem esquecidos | Seguir a ordem padrão, do mais antigo para o mais novo |
| Ponha zero cards novos por dia até recuperar | Continuar adicionando matéria nova |
| Faça todo dia as revisões que vencem naquele dia | Deixar o dia de hoje virar o atraso de amanhã |
| Responda com honestidade: esqueceu é "De novo" | Marcar tudo como "Fácil" para a fila sumir |
| Mantenha o baralho e o histórico | Resetar ou apagar o baralho |

Um card atrasado não volta à estaca zero. A maior parte do que você revisava ainda está na memória, e o algoritmo leva o atraso em conta quando você responde. Segundo o manual do Anki, quem volta de uma pausa longa não precisa começar de novo e pode continuar de onde parou.

Este texto foi escrito por quem faz o Baigi, um app de revisão. As opções do Anki foram conferidas no manual oficial em 12/11/2026, com os nomes que elas têm no Anki em português. As contas de memória usam o FSRS-6 com os parâmetros padrão, o algoritmo que o Anki traz desde a versão 25.07 e que o Baigi usa.

## Quanto você ainda lembra de um card atrasado?

Depende do intervalo que o card já tinha. Com o FSRS e a retenção desejada padrão de 90%, cada card vence quando a chance de lembrar dele cai para 90%. Daí em diante, a queda continua, mas devagar, e mais devagar ainda nos cards que você já sabe bem.

Fizemos a conta com o FSRS-6 para três cards, todos com 10 dias de atraso:

| Card | Chance de lembrar no vencimento | Com 10 dias de atraso |
|---|---|---|
| Intervalo de 2 dias (matéria recente) | 90% | cerca de 74% |
| Intervalo de 10 dias | 90% | cerca de 85% |
| Intervalo de 60 dias (matéria firme) | 90% | cerca de 89% |

Mesmo depois de 10 dias parado, você ainda lembra a maior parte dos cards, então resetar joga fora memória que existe. E o atraso pesa mais nos cards de intervalo curto: um card que voltaria em 2 dias e esperou 12 está mais perto de ser esquecido do que um de 60 dias que esperou 70. Por isso vale começar pelos de intervalo curto, e não pelos que esperam há mais tempo.

```card
{"q": "Voltei depois de 10 dias e tenho 500 revisões atrasadas no Anki. Devo resetar o baralho?", "a": "Não. Você ainda lembra a maior parte dos cards; divida o atraso por alguns dias e comece pelos que estão mais perto de serem esquecidos.", "source": "Manual do Anki (Falling Behind) e contas com o FSRS-6"}
```

Para ver a curva de um card qualquer, dia a dia, use a calculadora:

```tool
{"tool": "calculadora-do-esquecimento"}
```

## Em quantos dias dividir o atraso?

Em 7 dias, se você não tem prova nas próximas semanas. Fica um número que cabe ao lado das revisões normais. Para um atraso de 500 cards:

| Prazo | Cards do atraso por dia | Quando escolher |
|---|---|---|
| 3 dias | 167 (o último dia fica com 166) | Atraso pequeno ou prova chegando |
| 7 dias | 72 (o último dia fica com 68) | O caso comum |
| 14 dias | 36 (o último dia fica com 32) | Atraso muito grande ou pouco tempo por dia |

A conta é o total dividido pelos dias, arredondado para cima. Esses números são além das revisões que vencem em cada dia. Se você costuma ter 60 revisões por dia, o plano de 7 dias dá umas 130 por dia durante uma semana.

Pular um dia do plano devolve aqueles cards ao atraso, e o dia seguinte fica mais pesado.

## Como recuperar o atraso no Anki, passo a passo?

O Anki não tem uma tela própria para dividir o atraso, mas as opções do baralho fazem quase tudo. Os nomes abaixo são os do Anki em português, com o original em inglês entre parênteses.

1. **Pare os cards novos.** Nas opções do baralho, em Limites Diários, ponha **Novos cartões/dia** (New cards/day) em 0. O manual recomenda parar de introduzir cards novos até recuperar o atraso, porque continuar só aumenta a pilha. Se quiser mudar só hoje, use a aba **Somente hoje**.
2. **Mude a ordem das revisões.** Em **Ordem de classificação de revisões** (Review sort order), troque o padrão "Data de revisão, depois aleatório" por **Mais prováveis de esquecer** (Ascending retrievability) se você usa o FSRS, ou por "Relative overdueness" (o nome no SM-2) se ainda não ligou o FSRS. O manual indica essa troca para quem fez uma pausa longa e tem um atraso grande: o padrão mostra primeiro os cards que esperam há mais tempo, e esses nem sempre são os que você está perto de esquecer.
3. **Escolha quantos fazer por dia.** Pegue o número da tabela acima e some às revisões que vencem a cada dia. Se preferir que o Anki corte por você, use **Revisões máximas/dia** (Maximum reviews/day): o manual diz que esse limite esconde o que passar dele e pode "salvar você de um infarto" ao voltar de uma semana fora. Só não ponha um limite menor do que o que vence por dia, senão o atraso cresce em vez de diminuir.
4. **Se quiser separar o atraso do dia, use um baralho filtrado.** O manual traz a receita de um usuário que recuperou 800 cards assim: um baralho filtrado com a busca `is:due prop:due>-7` (o que venceu nesta semana, para fazer todo dia) e outro com `is:due prop:due<=-7` (o atraso, para fazer aos poucos).
5. **Ou espalhe as datas.** No Navegador, busque `prop:due<=-1` (todos os cards atrasados), selecione tudo e use **Definir Data de Revisão** (Set Due Date) com um intervalo como `0-6`: os cards são distribuídos ao acaso entre hoje e daqui a 6 dias, e os cards em revisão mantêm o intervalo atual. O manual sugere esse recurso para quando o cronograma é interrompido. A desvantagem é que a divisão é aleatória, sem olhar quem está mais perto de ser esquecido.

Quando o atraso acabar, volte os novos por dia para o número de antes. O manual lembra que 20 cards novos por dia costumam levar a umas 200 revisões por dia, e que muita gente se afoga por pôr centenas de cards novos nos primeiros dias.

```cta
{"area": "concurso", "text": "Quer ver como é revisar em lotes curtos, sem um número vermelho na tela? Revise 6 cards prontos agora, sem criar conta."}
```

## O que não fazer com as revisões acumuladas?

Não use atalhos que limpam a fila apagando o que o algoritmo sabe sobre você. Os quatro mais comuns:

- **Marcar tudo como "Fácil".** "Fácil" diz ao algoritmo que você lembrou sem esforço nenhum, e o intervalo seguinte cresce muito. Num card que você tinha esquecido, ele volta tarde demais, e o esquecimento aparece na prova. O manual pede "De novo" sempre que você esquece, e avisa que nem "Difícil" serve para erro, porque conta como acerto.
- **Resetar o baralho.** "Esquecer Cartão" (Reset card) leva o card para o fim da fila de novos. O histórico continua guardado, mas o card perde o agendamento e recomeça pelos passos de aprendizagem. Pela conta acima, você trocaria cards que ainda lembra em 74% a 89% das vezes por cards novos.
- **Apagar o baralho e começar outro.** Você perde os cards, o agendamento e o histórico, e ainda precisa criar tudo de novo. Se a ideia é testar outro app, exporte o .apkg antes.
- **Ligar "Reagendar cartões ao alterar" achando que resolve.** Essa opção (Reschedule cards on change) muda as datas de todos os cards quando você liga o FSRS ou mexe na retenção desejada. O manual avisa que ela costuma deixar muitos cards vencidos de uma vez quando se troca do SM-2. Baixar a retenção desejada reduz as revisões por dia, mas, nas palavras do manual, você também esquece mais cards.

## Como evitar que acumule de novo?

Revise um pouco todo dia, com um lote que caiba no seu pior dia, e controle a entrada de cards novos. Quem coloca mais cards novos do que consegue revisar acumula de novo em poucas semanas. As regras de uma revisão que não acumula estão no [guia da curva do esquecimento](/blog/curva-do-esquecimento#como-montar-uma-revisao-que-nao-acumula).

Se o problema que se repete é a fila, e não o algoritmo, vale olhar outras ferramentas com calma. Explicamos quando faz sentido trocar, e quando não faz, em [alternativa ao Anki](/blog/alternativa-ao-anki).

## Como o Baigi lida com o atraso?

No Baigi, o plano de recuperação faz essa divisão. Quando você tem pelo menos 2 lotes de cards atrasados (40 cards, com o lote padrão de 20), o atraso sai da revisão do dia e aparece numa linha à parte, "120 atrasados · Recuperar em 7 dias", em vez de inflar o número de hoje. Atrasado, aqui, é o card que venceu antes do dia de hoje.

- **Recuperar em 3, 7 ou 14 dias.** Você escolhe o prazo, e a tela mostra quantos cards por dia isso dá, além dos de hoje. O plano começa hoje, vale para todos os cadernos e divide pelo mesmo arredondamento da tabela acima: 500 cards em 7 dias dão 72 por dia.
- **Os mais perto de esquecer vêm primeiro.** O plano ordena os cards pela chance de lembrar calculada pelo FSRS, da menor para a maior. Só muda o dia em que cada card volta; a memória do card (estabilidade e dificuldade) fica igual.
- **Os cards novos pausam sozinhos** enquanto houver atraso. Dá para desligar em Configurações ou tocar em "Retomar" na mesma linha.
- **Dia perdido volta para o atraso.** Se você pular um dia do plano, aqueles cards viram atraso de novo, e refazer o plano junta tudo. Cancelar devolve a cada card a data que ele tinha.
- **Tudo de uma vez, se preferir.** "Revisar o atraso agora" abre só os cards atrasados, na mesma ordem.

O plano de recuperação é grátis, como toda a revisão. E se você vem do Anki com a fila atrasada, a importação do .apkg mantém o agendamento de cada card, então o atraso chega junto e cabe no mesmo plano.

```quiz
{"area": "concurso", "title": "Teste: o que você lembra deste texto?", "cards": [
  {"q": "Com 500 cards atrasados, quantos por dia para recuperar em 7 dias?", "a": "72 por dia (o último dia fica com 68), além das revisões que vencem em cada dia.", "source": "Conta deste artigo: total dividido pelos dias, arredondado para cima"},
  {"q": "Qual ordem de revisão o manual do Anki indica para um atraso grande, com o FSRS?", "a": "Mais prováveis de esquecer (Ascending retrievability).", "source": "Manual do Anki, opções do baralho"},
  {"q": "O que fazer com os cards novos enquanto houver atraso?", "a": "Parar: novos por dia em 0 até recuperar, senão a pilha cresce.", "source": "Manual do Anki, opções do baralho"},
  {"q": "Por que não marcar tudo como \"Fácil\" para zerar a fila?", "a": "Porque \"Fácil\" diz que você lembrou sem esforço, e os cards que você esqueceu voltam tarde demais.", "source": "Manual do Anki, estudo"}
]}
```

## Perguntas frequentes

### Como zerar as revisões do Anki?

Não zere de uma vez: divida o atraso por 3 a 14 dias e responda cada card com honestidade. Zerar resetando ou marcando "Fácil" apaga o que o Anki sabe sobre a sua memória e faz os cards voltarem na hora errada.

### Resetar o baralho do Anki resolve?

Não. "Esquecer Cartão" leva os cards para o fim da fila de novos e você recomeça como se nunca tivesse estudado, mesmo lembrando a maior parte deles. O atraso some do contador, mas o trabalho volta em dobro nas semanas seguintes.

### Quanto tempo leva para recuperar 500 cards atrasados?

Uma semana, no plano mais comum: 72 cards do atraso por dia, além das revisões de cada dia. Com mais pressa, 3 dias (167 por dia); com menos tempo livre, 14 dias (36 por dia).

### Posso continuar estudando matéria nova enquanto recupero o atraso?

Pode estudar, mas não transforme em cards novos ainda. O manual do Anki recomenda parar os cards novos até pôr o atraso em dia; anote o que estudou e crie os cards quando a fila voltar ao normal.

## Fontes

1. [Manual do Anki, opções do baralho](https://docs.ankiweb.net/manual/deck-options) (limites diários, cards novos com atraso, ordem das revisões, retenção desejada, "Reagendar cartões ao alterar", uso de "Difícil" e "De novo").
2. [Manual do Anki, estudo](https://docs.ankiweb.net/manual/studying) (o que cada botão quer dizer, "Esquecer Cartão", "Definir Data de Revisão" e "Falling Behind").
3. [Manual do Anki, navegador](https://docs.ankiweb.net/manual/browsing) ("Set Due Date" com intervalo e "Reset").
4. [Manual do Anki, baralhos filtrados](https://docs.ankiweb.net/manual/filtered-decks) (a receita para recuperar um atraso).
5. [Manual do Anki, busca](https://docs.ankiweb.net/manual/searching) (`is:due` e `prop:due`).
6. [Tradução do Anki para o português do Brasil](https://github.com/ankitects/anki-core-i18n/tree/main/core/pt-BR) (os nomes das opções em português).
7. [Notas da versão 25.07 do Anki](https://github.com/ankitects/anki/releases/tag/25.07) (FSRS-6).
8. [FSRS, algoritmo de repetição espaçada de código aberto](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) (a fórmula da chance de lembrar usada nas contas, com os parâmetros padrão do FSRS-6).
