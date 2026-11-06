# E2E Test Reference — Memorai

## Ambiente
- Frontend: `http://localhost:3000`
- API: `http://localhost:8037/api` (containers `baigi-app` e `baigi-db`)
- Usuário padrão dos specs antigos (`e2e/*.spec.ts`): `e2e-legacy@audit.test` (Pro, verificado), criado/recriado
  via `docker exec baigi-app php artisan tinker` na primeira vez que uma execução precisa dele
  (`e2e/auditoria/support/provision.php`). Para outro usuário: `E2E_EMAIL` / `E2E_PASSWORD`
  (ex.: banco novo com `php artisan db:seed --class=E2eSeeder`, que cria `weslleyadesousa@gmail.com` / `password`).
  Localmente essa conta é Google (sem a senha `password`): não use como padrão.
- Login: `login(page)` faz **um** login pela API por usuário e execução e reaproveita o `storageState`
  (`e2e/.auth/`, fora do git). O throttle de login (5/min por e-mail+IP) não é atingido; não rode `cache:clear`
  (apaga cache/sessões de quem mais usa o stack). `loginViaForm(page)` só onde o formulário é o alvo do teste.
- `unverified@e2e.test` / `password` vem do `E2eSeeder`.

## Auditoria (`e2e/auditoria/`)
Jornadas com caminho feliz e triste (cadastro/onboarding, caderno, nota, card, revisão, importar, configurações,
planos/paywall, sessão, resiliência a 500/offline, mobile 390px). Usuários próprios `e2e-*@audit.test`,
recriados uma vez por execução. **IA nunca roda**: toda chamada de IA é cortada no navegador (fixture `aiGuard`)
ou mockada; `realGate` só deixa passar para provar um 402/403 do servidor depois de checar a pré-condição no banco.
Cadastros (3/h por IP) saem com `X-Forwarded-For` próprio da execução. Notas criadas pelos specs têm < 50
caracteres: salvar nota enfileira `GenerateNoteEmbeddingJob` (embedding OpenAI) na fila `default`, que o job
ignora abaixo desse tamanho — e pode haver worker consumindo essa fila.

```bash
npx playwright test e2e/auditoria            # ~3 min
npx playwright test e2e/auditoria/revisao.spec.ts
```

## Páginas (URLs em PT-BR)

| Rota | Descrição |
|---|---|
| `/entrar` | Login (email + senha ou Google OAuth) |
| `/criar-conta` | Registro |
| `/hoje` | Dashboard principal (cards pra hoje, backlog, sugestões) |
| `/revisar` | Sessão de revisão (flip card, botões rating) |
| `/cadernos` | Tópicos/cadernos (árvore, notas, erros, cards) |
| `/podcasts` | Lista de podcasts gerados |
| `/importar` | Importar Anki (.apkg) |
| `/progresso` | Estatísticas de progresso |
| `/configuracoes` | Configurações do usuário |
| `/planos` | Planos e preços |
| `/comecar` | Onboarding |

URLs legadas (`/dashboard`, `/chat`, `/stats`, `/graph`, `/documents`, `/decks/**`) são 301 no edge (`routeRules`) — ver `redirects.spec.ts`.

## Seletores importantes

### Login (`/entrar`)
- Email: `#email`
- Senha: `#password`
- Submit: `button[type="submit"]`
- Erro geral: `p[role="alert"]` (o `UiToast` mantém regiões `role="status"`/`role="alert"` sempre montadas e vazias)

### Revisão (`/revisar`)
- Botões rating: "Não lembrei", "Quase", "Lembrei", "Fácil demais" (atalhos 1–4)
- Card: `.review-card` (botão "Toque para ver a resposta" / "Verso do card"); Espaço vira, U ou Ctrl+Z desfaz, ? ajuda

### Cadernos (`/cadernos`)
- Árvore de tópicos: sidebar com itens colapsáveis
- Editor de notas: Tiptap (contenteditable)

## Como rodar

```bash
cd memorai-web
npx playwright test                 # usuário padrão provisionado (precisa do docker local)
E2E_EMAIL=x@y E2E_PASSWORD=z npx playwright test   # outro usuário já existente
npx playwright test --headed
```

## Estrutura de testes

```
e2e/
├── helpers.ts          ← login, navegação, utilitários
├── smoke.spec.ts       ← teste de sanidade (login + dashboard)
└── *.spec.ts           ← testes por fluxo (gerados sob demanda)
```

## Regressão visual (`visual.spec.ts`)

Compara pixel a pixel com `e2e/visual.spec.ts-snapshots`. **Fora do CI**: a renderização de fonte muda de máquina. Rode antes e depois de mexer em CSS global.

```bash
npx playwright test e2e/visual.spec.ts                       # compara
npx playwright test e2e/visual.spec.ts --update-snapshots    # regrava, em commit separado
```

As telas do app usam a conta `e2e-visual@audit.test`, que nenhum outro spec toca, então a ordem da suíte não importa. As públicas e a landing usam um catálogo fixo. A **landing tem tolerância zero**: a aparência dela está congelada até a fase 4h voltar à pauta.

## Screenshots de PR (`@screens`)

`e2e/screens.spec.ts` captura as telas principais (desktop 1440×900, mobile 375×812, dark em /hoje,
caderno Material e nota) em `screens-output/<tela>-<desktop|mobile>[-dark].png`. Não compara pixels:
é artefato para revisão humana. Roda sem backend — a API vem de `e2e/screens/api.har` (replay via
`routeFromHAR`), com os ids em `e2e/screens/fixture.json`. Telas e passos: `e2e/screens/screens.ts`.

```bash
# build apontando para a origem gravada no HAR + servidor
NUXT_PUBLIC_API_BASE=http://localhost:8037/api npm run build && node .output/server/index.mjs &
npx playwright test e2e/screens.spec.ts   # não precisa da API rodando
```

**No CI:** job `screens` em todo PR. Baixe o artefato `screens-<nº do PR>` na aba Summary do run
(ou `gh run download <run-id> -n screens-<nº>`); o resumo do job lista os PNG. Para antes/depois,
baixe também o artefato do PR anterior (ou de um run do `develop` re-executado) e compare lado a lado.

**Regravar o HAR** quando endpoint/payload mudar, uma tela nova chamar outra rota ou o resumo do job
listar "Requests fora do HAR" (também em `screens-output/unmatched.txt`). Precisa da API local em
:8037 com o usuário de fixture `caderno-shots@test.local` (dados descritos em `docs/research/caderno-ux-2026-09.md` na raiz do projeto)
e do build acima servido em :3000:

```bash
E2E_EMAIL=caderno-shots@test.local E2E_PASSWORD='<senha do usuário>' \
  npx playwright test -c e2e/screens/record.config.ts
```

O gravador faz login uma vez (contexto A), reaproveita a sessão no contexto B (sem login no HAR),
bloqueia escritas, guarda uma resposta por URL e remove `cookie`/`set-cookie`/`x-xsrf-token`/
`authorization`; falha se a senha ou cookie de sessão aparecer no arquivo. Revise o diff do HAR antes
de commitar. Os dados ficam congelados na data da gravação (o spec instala o relógio em `recordedAt`).

## Responsividade (`@responsivo`, prd-responsividade)

- **CI:** `e2e/responsivo.spec.ts` roda no job `screens` com o mesmo HAR, em 5 aparelhos (Galaxy S5 360×640,
  iPhone SE, iPhone 14 Pro Max, iPhone 13 deitado e iPad Mini) × as telas do `screens.ts` e as públicas. Falha com
  rolagem horizontal, folha ou diálogo fora da tela, campo com fonte < 16 px (zoom do iOS) ou alvo de toque < 24 px.
- **Auditoria completa (local, com a API):** 12 aparelhos × ~57 estados, capturas e JSON por aparelho, mais um
  resumo. Fora do testMatch padrão. Achados de 2026-11 em `docs/research/responsividade-2026-11.md` (raiz do projeto).

```bash
RESP_OUT=/tmp/resp npx playwright test -c e2e/responsivo/audit.config.ts [--project=iphone-se]
node e2e/responsivo/summary.mjs /tmp/resp > resumo.md
# Outra porta (a 3000 ocupada): RESP_BASE_URL=http://localhost:3020 (CORS desligado só no Chromium local)
```

As checagens ficam em `e2e/responsivo/checks.ts` e os aparelhos em `e2e/responsivo/devices.ts` (descritores do
Playwright, sempre no Chromium; a área segura do iPhone é simulada por CDP no teste `area segura`).
