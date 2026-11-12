---
title: Curva do esquecimento: quanto você esquece e como revisar no tempo certo
seoTitle: Curva do esquecimento: quanto você esquece e quando revisar
description: O que a curva do esquecimento de Ebbinghaus mostra de verdade, quanto você ainda lembra depois de 1, 7 e 30 dias e como revisar antes de esquecer.
summary: A curva do esquecimento mostra que a memória cai rápido nos primeiros dias e depois desacelera. Cada vez que você se testa e acerta, a queda seguinte fica mais lenta. Por isso revisar em intervalos crescentes rende mais do que reler tudo de novo.
category: metodo
area: faculdade
author: baigi
published: 2026-11-08
updated: 2026-11-08
related: como-revisar-lei-seca-inss, alternativa-ao-anki, revisoes-acumuladas
context: Ebbinghaus e FSRS
cover: {"value": "94,7%", "label": "de chance de lembrar 1 dia depois de acertar"}
facts: [{"value": "80,8%", "label": "depois de 7 dias", "icon": "chart"}, {"value": "66,8%", "label": "depois de 30 dias", "icon": "chart"}]
tags: curva do esquecimento, Ebbinghaus, repetição espaçada, revisão
---

## O que é a curva do esquecimento?

É o gráfico de quanto da memória sobra com o passar do tempo. A primeira versão veio de Hermann Ebbinghaus, um psicólogo alemão que, em 1885, decorou listas de sílabas sem sentido (coisas como "DAX", "BOK") e mediu quanto tempo levava para reaprender cada lista depois de horas ou dias.

O desenho que ele achou é o que todo mundo que estuda sente na pele: a queda é forte logo no começo e vai ficando mais lenta. Você sai da aula achando que entendeu tudo e, uma semana depois, a matéria parece nova.

Duas coisas costumam se perder quando a curva aparece em post de rede social:

1. **Ebbinghaus não mediu "quanto você lembra".** Ele mediu a **economia** (em inglês, *savings*): quanto tempo a menos ele precisava para reaprender uma lista que já tinha estudado. Se reaprender levava metade do tempo da primeira vez, a economia era de 50%.
2. **O material dele não tinha sentido nenhum.** Ele escolheu sílabas soltas de propósito, para que nada do que ele já sabia ajudasse a lembrar. Matéria que você entende, com ligação entre as ideias, é outra situação.

Então a curva é real, mas os números famosos não são a sua memória de Direito Constitucional ou de Fisiologia. São um ponto de partida.

## Quanto você esquece em 1, 7 e 30 dias?

Em 2015, Jaap Murre e Joeri Dros refizeram o experimento de Ebbinghaus com o mesmo método (e, como ele, com uma pessoa só, o próprio Dros) e chegaram a uma curva parecida com a original. Os números de economia do estudo de 1885, como o artigo deles os reproduz, são estes:

| Tempo depois de estudar | Economia ao reaprender (Ebbinghaus, 1885) |
|---|---|
| 20 minutos | 58,2% |
| 1 hora | 44,2% |
| cerca de 9 horas | 35,8% |
| 1 dia | 33,7% |
| 2 dias | 27,8% |
| 6 dias | 25,4% |
| 31 dias | 21,1% |

Para material de estudo de verdade, há um jeito mais útil de olhar: os modelos de repetição espaçada, ajustados com revisões reais. O FSRS é um algoritmo de código aberto, avaliado num conjunto público de cerca de 727 milhões de revisões de 10 mil usuários do Anki. O Anki passou a trazê-lo embutido em 2023 (versão 23.10), e o Baigi também usa. Ele estima a chance de você lembrar de um card a cada dia.

Com os parâmetros padrão do FSRS-6, um card que você estudou e acertou uma vez tem chance estimada de:

- **94,7%** de ser lembrado depois de 1 dia;
- **80,8%** depois de 7 dias;
- **66,8%** depois de 30 dias.

Esses números não se comparam direto com a tabela de Ebbinghaus: lá é a economia de tempo para reaprender sílabas sem sentido; aqui é a chance de lembrar um card que você já acertou uma vez. Mesmo assim, perder um terço do que você sabia em um mês é muito quando a prova cobra centenas de detalhes.

Se você quiser fazer a conta para o seu caso, a calculadora abaixo usa a mesma fórmula.

```tool
{"tool": "calculadora-do-esquecimento"}
```

## Por que se testar segura mais do que reler?

Reler dá a sensação de que você sabe, porque o texto parece familiar. Só que reconhecer não é o mesmo que lembrar. Na prova ninguém mostra o texto para você reconhecer: você precisa puxar a resposta da memória.

Um experimento muito citado sobre isso é de Henry Roediger e Jeffrey Karpicke, de 2006. Estudantes leram textos curtos, de cerca de 250 palavras. No segundo experimento, um grupo leu o texto em quatro sessões seguidas; outro leu uma vez e depois fez três testes de escrever o que lembrava, sem ver a resposta certa. Uma semana depois, o grupo que se testou lembrava de 61% das ideias do texto, contra 40% do grupo que só releu. Cinco minutos depois do estudo, era o contrário: quem releu lembrava mais (83% contra 71%).

Uma meta-análise de Christopher Rowland, de 2014, juntou 159 comparações desse tipo e achou um efeito médio de g = 0,50 a favor de se testar. Em linguagem simples: um efeito de tamanho médio, que se repete de estudo para estudo. E ele é maior quando a pessoa vê a resposta certa depois de tentar (g = 0,73, contra 0,39 sem ver a resposta).

O jeito mais simples de se testar é o flashcard: a pergunta de um lado, a resposta do outro. Você tenta lembrar antes de virar.

```card
{"q": "O que Ebbinghaus mediu na curva do esquecimento?", "a": "A economia ao reaprender (savings): quanto tempo a menos levava para decorar de novo uma lista já estudada.", "source": "Murre e Dros, 2015, PLoS ONE"}
```

## De quanto em quanto tempo revisar?

A outra metade da resposta é o espaçamento. Estudar o mesmo conteúdo em sessões separadas por dias rende mais do que a mesma quantidade de estudo num bloco só. A revisão de Cepeda e colegas, de 2006, reuniu 317 experimentos sobre prática distribuída. Das 271 comparações diretas entre estudar de uma vez e estudar espaçado, só 12 não mostraram vantagem para o espaçado.

**Cada revisão bem-sucedida deixa a curva seguinte mais lenta.** No FSRS, isso aparece como estabilidade, o número de dias até a chance de lembrar cair para 90%. Pelo modelo padrão, para um card que você acerta toda vez:

1. depois do primeiro estudo, a memória chega a 90% em cerca de 2 dias;
2. revisando nesse dia, o próximo ponto de 90% vai para cerca de 12 dias;
3. revisando de novo, para cerca de 50 dias;
4. e depois para cerca de 170 dias.

São estimativas de um modelo, não regra. Cards difíceis voltam mais cedo, e um erro encurta o intervalo. Mas o desenho mostra por que a revisão espaçada não "come o dia" quando é feita no tempo certo: os intervalos crescem rápido, e a maior parte dos cards antigos só aparece de vez em quando.

```shot
{"shot": "revisao", "caption": "Tela real do Baigi, conta de demonstração: o card volta perto do dia em que você esqueceria."}
```

## Como montar uma revisão que não acumula?

Na prática, o que derruba quem tenta revisar é a pilha: você fica três dias sem abrir o app e encontra 400 cards esperando. Algumas regras ajudam:

- **Faça perguntas, não resumos.** Um card bom pergunta uma coisa só. "Quais são os princípios da administração pública?" é melhor do que um parágrafo inteiro no verso.
- **Tente lembrar antes de virar o card.** Se você vira na hora, vira leitura de novo.
- **Seja honesto na nota.** Se errou, marque que errou. Marcar "difícil" quando você não lembrou faz o card voltar tarde demais.
- **Revise um pouco todo dia.** Lotes curtos, como 20 cards, cabem no ônibus ou na fila. O número 20 é uma escolha prática, não um resultado de pesquisa: o lote serve para começar sem preguiça.
- **Transforme erro em card.** Errou uma questão? A dúvida daquela questão vira um card e volta antes da prova.
- **Não comece tudo de uma vez.** Limite quantos cards novos entram por dia, para as revisões dos próximos dias continuarem cabendo.

Se a fila já acumulou, veja [o que fazer com as revisões acumuladas](/blog/revisoes-acumuladas): dividir o atraso em alguns dias e começar pelo que você está mais perto de esquecer.

Se você estuda para uma prova com data, dá para planejar ao contrário: quantos cards novos por dia cabem até lá e quanto você deve lembrar no dia. A ferramenta [plano até a prova](/ferramentas/plano-ate-a-prova) faz essa conta.

```cta
{"area": "faculdade", "text": "Quer que o card volte sozinho no dia certo? Comece com 6 cards prontos e veja como funciona, sem criar conta."}
```

## E se eu estudo por PDF e videoaula?

Funciona igual, mas falta um passo: transformar o que você leu em perguntas. Muita gente para aí, porque escrever card leva tempo.

Duas saídas que funcionam:

1. **Ao fim de cada sessão, escreva 5 perguntas** sobre o que você acabou de ver. Cinco perguntas por dia viram 150 em um mês.
2. **Use as questões que você errou.** Elas já são perguntas, e erradas por você.

No Baigi, você pode mandar o PDF e a IA propõe os cards a partir do seu material (há uma prévia grátis). Você revisa e corrige o que ela criou, porque nenhuma IA acerta tudo. Revisar os cards é grátis, e a fila é organizada pelo mesmo FSRS desta página.

Para lei seca, que é o caso clássico de decorar prazos e percentuais, há um guia específico: [como revisar lei seca para o INSS](/blog/como-revisar-lei-seca-inss). Se você já usa o Anki, veja [quando vale ou não vale trocar o Anki](/blog/alternativa-ao-anki).

```quiz
{"area": "faculdade", "title": "Teste rápido: o que ficou deste texto?", "cards": [
  {"q": "A curva do esquecimento cai mais rápido no começo ou no fim?", "a": "No começo. A queda é forte nas primeiras horas e dias e depois desacelera.", "source": "Ebbinghaus, 1885; Murre e Dros, 2015"},
  {"q": "Uma semana depois, quem se testou lembrava de quanto do texto, contra quem só releu?", "a": "61% das ideias contra 40%.", "source": "Roediger e Karpicke, 2006, experimento 2"},
  {"q": "O que acontece com o intervalo seguinte quando você acerta uma revisão?", "a": "Fica maior: a memória passa a cair mais devagar.", "source": "Modelo FSRS"},
  {"q": "Errei e marquei 'difícil'. Qual o problema?", "a": "O card volta tarde demais. Se não lembrou, marque que errou.", "source": "Manual do Anki, opções do baralho"}
]}
```

## Perguntas frequentes

### A curva do esquecimento é real?

É. O experimento de Ebbinghaus foi refeito em 2015 com o mesmo método e deu uma curva parecida. O que não vale é usar os números dele como se fossem a sua memória de qualquer matéria: ele usou sílabas sem sentido e mediu o tempo de reaprender.

### Quanto tempo depois devo revisar pela primeira vez?

Pelo modelo FSRS padrão, para um card que você acertou, a chance de lembrar cai para 90% em cerca de 2 dias. Revisar no primeiro ou no segundo dia depois de estudar é um bom começo. Depois, os intervalos crescem.

### Reler o resumo conta como revisão?

Conta pouco. Reler ajuda a entender, mas para guardar o que mais funciona é tentar lembrar sem olhar e só depois conferir a resposta.

### Preciso de um aplicativo para fazer repetição espaçada?

Não. Dá para fazer com cartões de papel e caixas separadas por intervalo. O aplicativo só faz a conta de quando cada card volta e evita que você revise demais o que já sabe.

## Fontes

1. [Murre, J. M. J. e Dros, J. (2015). Replication and Analysis of Ebbinghaus' Forgetting Curve](https://doi.org/10.1371/journal.pone.0120644). PLoS ONE 10(7): e0120644.
2. [Roediger, H. L. e Karpicke, J. D. (2006). Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention](https://doi.org/10.1111/j.1467-9280.2006.01693.x). Psychological Science 17(3), 249-255 (experimento 2, figura 2).
3. [Rowland, C. A. (2014). The effect of testing versus restudy on retention: a meta-analytic review of the testing effect](https://doi.org/10.1037/a0037559). Psychological Bulletin 140(6), 1432-1463.
4. [Cepeda, N. J. e colegas (2006). Distributed practice in verbal recall tasks: a review and quantitative synthesis](https://doi.org/10.1037/0033-2909.132.3.354). Psychological Bulletin 132(3), 354-380.
5. FSRS, algoritmo de repetição espaçada de código aberto: [fórmulas da versão 6 e definição de estabilidade](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm), [parâmetros padrão do FSRS-6](https://github.com/open-spaced-repetition/py-fsrs) e o [conjunto de 727 milhões de revisões](https://github.com/open-spaced-repetition/srs-benchmark). Os números de 1, 7 e 30 dias e os intervalos de 2, 12, 50 e 170 dias são contas nossas com esses parâmetros.
6. [Notas da versão 23.10 do Anki](https://github.com/ankitects/anki/releases/tag/23.10), com o FSRS embutido.
7. [Manual do Anki, opções do baralho](https://docs.ankiweb.net/manual/deck-options) (uso do botão "Difícil" com o FSRS).
