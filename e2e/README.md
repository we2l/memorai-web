# E2E Test Reference — Memorai

## Ambiente
- Frontend: `http://localhost:3000`
- API: `http://localhost:8037/api`
- Usuário teste: weslleyadesousa@gmail.com (plano Pro)
- Senha: variável `E2E_PASSWORD` (default: "password")
- Auth por cookie (Sanctum SPA): `docker exec baigi-app php artisan db:seed --class=E2eSeeder` cria o usuário
  verificado (`E2E_EMAIL`, default acima) e `unverified@e2e.test`. Ex.: `docker exec -e E2E_EMAIL=verified@e2e.test baigi-app php artisan db:seed --class=E2eSeeder`
  e `E2E_EMAIL=verified@e2e.test npx playwright test e2e/auth-cookie.spec.ts`. O throttle de login (5/min) persiste
  entre execuções: `docker exec baigi-app php artisan cache:clear` antes de repetir.

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
- Botões rating: texto "De novo", "Difícil", "Bom", "Fácil"
- Revelar resposta: procurar botão com texto "Mostrar resposta" ou similar

### Decks (`/decks`)
- Criar deck: botão com texto "Novo deck" ou ícone +

### Cadernos (`/cadernos`)
- Árvore de tópicos: sidebar com itens colapsáveis
- Editor de notas: Tiptap (contenteditable)

## Como rodar

```bash
cd memorai-web
E2E_PASSWORD=suasenha npx playwright test
# ou headed:
E2E_PASSWORD=suasenha npx playwright test --headed
```

## Estrutura de testes

```
e2e/
├── helpers.ts          ← login, navegação, utilitários
├── smoke.spec.ts       ← teste de sanidade (login + dashboard)
└── *.spec.ts           ← testes por fluxo (gerados sob demanda)
```

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
