---
title: Alternativa ao Anki: quando o Anki é a melhor escolha e quando não é
seoTitle: Alternativa ao Anki: quando trocar e quando não trocar
description: Comparação honesta entre o Anki e as alternativas: o que o Anki faz melhor, onde ele cansa, quanto custa no iPhone e o que considerar antes de trocar.
summary: O Anki continua sendo a melhor escolha para quem gosta de montar e ajustar os próprios baralhos, e é grátis no computador, no Android e no navegador. Vale procurar uma alternativa quando o problema é o trabalho de criar os cards, a fila que acumula ou o pagamento do app no iPhone.
category: comparacao
area: medicina
author: weslley
published: 2026-11-08
updated: 2026-11-08
pillar: curva-do-esquecimento
related: como-revisar-lei-seca-inss
tags: Anki, alternativa ao Anki, flashcards, repetição espaçada
---

## O Anki ainda é bom em 2026?

É. Vale dizer isso logo, porque muito texto de "alternativa ao Anki" é propaganda disfarçada. O Anki é de código aberto (licença AGPL), grátis no computador, no Android (AnkiDroid) e no navegador (AnkiWeb), e desde a versão 23.10, de 2023, traz embutido o FSRS, um algoritmo de repetição espaçada de código aberto, testado num conjunto público de cerca de 727 milhões de revisões de usuários do Anki.

Ele também tem coisas que poucos concorrentes têm: um catálogo grande de complementos (add-ons) e de baralhos compartilhados pela comunidade no AnkiWeb, oclusão de imagem embutida desde a 23.10 (ótima para anatomia) e controle fino sobre as opções de revisão.

Eu uso o mesmo FSRS no Baigi, o app que eu fiz. Então este texto não vai dizer que o algoritmo do Anki é ruim. O algoritmo é ótimo. A pergunta é outra: o que faz tanta gente baixar o Anki e largar pouco depois?

## Por que tanta gente desiste do Anki?

Na minha leitura de fóruns e comunidades de estudo (é uma impressão, não uma pesquisa), quatro queixas se repetem.

1. **Criar os cards dá trabalho.** É a mais comum. Passar uma apostila inteira para flashcards leva horas, e muita gente desiste antes de começar. O Anki é uma ferramenta de revisão; quem escreve o conteúdo é você.
2. **A fila acumula.** Três dias sem abrir e aparecem centenas de cards vencidos. Esse número grande assusta, e a pessoa evita o app justamente quando mais precisa.
3. **Os quatro botões confundem.** "De novo", "Difícil", "Bom" e "Fácil" parecem simples, mas usar "Difícil" quando esqueceu é um hábito comum o bastante para o manual do Anki alertar contra ele: com o FSRS, "Difícil" conta como resposta certa, e usá-lo para erro deixa todos os intervalos altos demais.
4. **No iPhone, o app é pago.** O AnkiMobile é o app oficial para iPhone e iPad e custa R$ 149,90 na App Store do Brasil (preço de novembro de 2026); a venda ajuda a financiar o desenvolvimento do Anki. Para quem estuda pelo celular, isso pesa.

Nenhuma dessas é defeito de algoritmo. São trabalho, interface e preço.

```card
{"q": "No Anki, quando usar o botão \"Difícil\"?", "a": "Quando você acertou, mas com dúvida ou demorou para lembrar. Se esqueceu, a resposta é \"De novo\". \"Difícil\" conta como acerto.", "source": "Manual do Anki, estudo e opções do baralho"}
```

## Quando o Anki continua sendo a melhor escolha?

Se alguma destas frases descreve você, fique no Anki:

- **Você gosta de montar os próprios cards** e já tem um jeito de fazer isso que não cansa.
- **Você usa complementos** que mudam a revisão, ou baralhos compartilhados que sua turma mantém atualizados.
- **Você revisa muito sem internet.** O Anki no computador e no Android guarda a coleção no aparelho e funciona sem internet; a sincronização com o AnkiWeb é à parte.
- **Você tem anos de baralhos com mídia e formatação própria.** Migrar sempre perde alguma coisa.
- **Você quer controle fino**: passos de aprendizagem, limites, filtros, parâmetros do FSRS otimizados com o seu histórico.

Trocar de ferramenta custa tempo. Se a sua revisão funciona, não troque por modinha.

## Quando vale procurar uma alternativa?

Vale quando o que trava você é um dos problemas da lista acima, e não o algoritmo. Aí a pergunta certa é: qual ferramenta tira esse trabalho específico?

- **Se o problema é criar cards:** procure algo que gere rascunhos de card a partir do seu material (PDF, anotações, questões erradas) e deixe você revisar e corrigir. Cards prontos de outra pessoa resolvem o trabalho, mas nem sempre cobrem o que a sua prova cobra.
- **Se o problema é a fila:** procure algo que divida a revisão em lotes pequenos e não mostre um número vermelho assustador.
- **Se o problema é o iPhone:** há alternativas que rodam no navegador ou no app sem custo de entrada. Confira se elas importam o seu arquivo .apkg, para não começar do zero.
- **Se você tem prova com data:** procure algo que diga quanto falta e quanto você deve lembrar no dia, não só quantos cards vencem hoje.

> Antes de trocar, exporte seus baralhos do Anki (Arquivo, Exportar, "Pacote de Baralho do Anki", .apkg, com "Incluir informações de agendamento" marcado). É o seu backup, qualquer que seja a decisão.

## Comparação: Anki e Baigi

Comparo com o Baigi porque é a ferramenta que eu conheço por dentro. Para outros apps, use a mesma tabela como checklist.

| Critério | Anki | Baigi |
|---|---|---|
| Preço | Grátis no computador, Android e web; AnkiMobile (iPhone) custa R$ 149,90 | Revisar é grátis; a IA tem uma prévia grátis e o resto fica no plano pago |
| Onde roda | Programa no computador, apps no celular, AnkiWeb | No navegador, no computador e no celular (pode ser instalado como app) |
| Algoritmo | FSRS (desde a 23.10; versão 6 desde a 25.07) ou SM-2 | FSRS-6 com os parâmetros padrão |
| Criar cards | À mão, ou com complementos | À mão, colando a questão errada, ou com a IA lendo seu PDF e propondo os cards |
| Fila do dia | Contagem total de vencidos | Lotes de 10, 20 ou 30 cards |
| Prova com data | Sem tela própria | Mostra os dias até a prova e quanto você deve lembrar no dia |
| Importar do Anki | — | Importa .apkg (formato novo e antigo), mantendo o agendamento de cada card |
| Levar seus cards embora | Exporta .apkg | Exporta os cards em CSV, junto com os seus dados |
| Complementos e baralhos compartilhados | Catálogo grande no AnkiWeb | Não tem |
| Offline | Sim | Precisa de internet para a maior parte das funções |

Repare que o Anki ganha em várias linhas. O Baigi faz sentido para quem trava em criar cards, quem tem prova marcada e quem estuda pelo celular sem querer pagar o app do iPhone.

```shot
{"shot": "hoje-prova", "caption": "Tela real do Baigi, conta de demonstração: a prova marcada e a estimativa de quanto a pessoa vai lembrar no dia."}
```

## Como migrar sem perder o progresso?

Se você decidir testar outra ferramenta, faça a migração com calma:

1. **Exporte do Anki** cada baralho como .apkg, com "Incluir informações de agendamento" marcado.
2. **Importe na ferramenta nova** e confira por amostragem se as imagens e a formatação vieram.
3. **Rode as duas em paralelo por uma ou duas semanas**, com um baralho só. Se a nova não servir, você não perdeu nada.
4. **Confira se dá para sair de novo.** Ferramenta que não deixa exportar prende você.

No Baigi, a importação aceita o pacote .apkg do Anki 23.10 em diante e o formato antigo, cria os cadernos a partir dos seus baralhos e mantém quando cada card volta. O histórico detalhado de cada revisão antiga ainda não é importado.

```cta
{"area": "medicina", "text": "Quer ver a revisão em lotes antes de migrar qualquer coisa? Revise 6 cards prontos agora, sem conta e sem importar nada."}
```

## E o Noji, o Quizlet e os outros?

Cada um resolve uma parte diferente, e as versões e os preços mudam muito. Por isso não vou fazer ranking aqui. A dica é usar a tabela acima como checklist e responder:

- usa um algoritmo de repetição espaçada de verdade (FSRS ou parecido), ou só embaralha os cards?
- importa o seu .apkg?
- deixa exportar os seus cards?
- o plano grátis deixa revisar sem limite, ou corta a revisão para forçar a assinatura?

Esta última importa muito: limitar quantos cards você revisa por dia pune justamente quem está estudando direito.

Se você ainda está entendendo por que a revisão espaçada funciona, comece pelo [guia da curva do esquecimento](/blog/curva-do-esquecimento). E se o seu caso é concurso com lei seca, veja [como revisar a Lei 8.213 para o INSS](/blog/como-revisar-lei-seca-inss).

```quiz
{"area": "medicina", "title": "Teste: o que você lembra deste texto?", "cards": [
  {"q": "Desde qual versão o Anki traz o FSRS embutido?", "a": "Desde a 23.10, lançada em 2023.", "source": "Notas da versão 23.10 do Anki"},
  {"q": "Usar \"Difícil\" quando você esqueceu: qual o efeito?", "a": "Os intervalos ficam longos demais, porque \"Difícil\" conta como acerto.", "source": "Manual do Anki"},
  {"q": "Em quais plataformas o Anki é grátis?", "a": "No computador, no Android (AnkiDroid) e no navegador (AnkiWeb). No iPhone, o AnkiMobile é pago.", "source": "Site oficial do Anki (apps.ankiweb.net)"},
  {"q": "Qual é o primeiro passo antes de testar outra ferramenta?", "a": "Exportar seus baralhos do Anki como .apkg, como backup.", "source": "Manual do Anki, exportação"}
]}
```

## Perguntas frequentes

### O Anki é pago?

No computador, no Android (AnkiDroid) e no navegador (AnkiWeb), não. O app oficial para iPhone e iPad, o AnkiMobile, é pago (R$ 149,90 na App Store do Brasil em novembro de 2026), e a venda ajuda a financiar o projeto.

### Existe Anki grátis para iPhone?

O app oficial é pago. O AnkiWeb, com conta grátis, permite estudar online, então dá para revisar pelo navegador do iPhone. Outra saída é usar uma ferramenta que importe o seu .apkg e rode no navegador.

### Vou perder meu progresso se sair do Anki?

Depende da ferramenta nova. Exporte o .apkg com o agendamento, importe e confira se cada card manteve quando deve voltar. Rodar as duas em paralelo por um tempo evita surpresa.

### O FSRS é o mesmo no Anki e no Baigi?

É o mesmo algoritmo de código aberto. O Baigi usa o FSRS-6 com os parâmetros padrão, a mesma versão que o Anki traz desde a 25.07. No Anki, você pode otimizar os parâmetros com o seu próprio histórico.

## Fontes

1. Notas da versão 23.10 do Anki (FSRS e oclusão de imagem embutidos). [https://github.com/ankitects/anki/releases/tag/23.10](https://github.com/ankitects/anki/releases/tag/23.10)
2. Notas da versão 25.07 do Anki (FSRS-6). [https://github.com/ankitects/anki/releases/tag/25.07](https://github.com/ankitects/anki/releases/tag/25.07)
3. Manual do Anki, opções do baralho ("Difícil" no lugar de "De novo" com o FSRS). [https://docs.ankiweb.net/manual/deck-options](https://docs.ankiweb.net/manual/deck-options)
4. Manual do Anki, estudo (o que cada botão quer dizer). [https://docs.ankiweb.net/manual/studying](https://docs.ankiweb.net/manual/studying)
5. Manual do Anki, exportação de baralhos. [https://docs.ankiweb.net/manual/exporting](https://docs.ankiweb.net/manual/exporting)
6. Manual do Anki, sincronização com o AnkiWeb (conta grátis e estudo online). [https://docs.ankiweb.net/manual/syncing](https://docs.ankiweb.net/manual/syncing)
7. Site oficial do Anki, com as versões para cada plataforma. [https://apps.ankiweb.net/](https://apps.ankiweb.net/)
8. AnkiMobile Flashcards na App Store do Brasil (R$ 149,90, consultado em 8 de novembro de 2026). [https://apps.apple.com/br/app/id373493387](https://apps.apple.com/br/app/id373493387)
9. Licença do Anki (AGPL). [https://github.com/ankitects/anki/blob/main/LICENSE](https://github.com/ankitects/anki/blob/main/LICENSE)
10. FSRS: conjunto de 727 milhões de revisões do benchmark. [https://github.com/open-spaced-repetition/srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark)
