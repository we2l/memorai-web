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
