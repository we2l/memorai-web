# E2E Test Reference — Memorai

## Ambiente
- Frontend: `http://localhost:3000`
- API: `http://localhost:8037/api`
- Usuário teste: weslleyadesousa@gmail.com (plano Pro)
- Senha: variável `E2E_PASSWORD` (default: "password")

## Páginas (URLs em PT-BR)

| Rota | Descrição |
|---|---|
| `/entrar` | Login (email + senha ou Google OAuth) |
| `/criar-conta` | Registro |
| `/hoje` | Dashboard principal (cards pra hoje, backlog, sugestões) |
| `/revisar` | Sessão de revisão (flip card, botões rating) |
| `/decks` | Listagem de decks |
| `/decks/[id]` | Detalhe do deck (cards, settings) |
| `/cadernos` | Tópicos/cadernos (árvore, notas, erros, cards) |
| `/grafo` | Grafo visual de tópicos (D3.js) |
| `/chat` | Agente IA (chat contextual) |
| `/podcasts` | Lista de podcasts gerados |
| `/importar` | Importar Anki (.apkg) |
| `/progresso` | Estatísticas de progresso |
| `/stats` | Estatísticas de revisão |
| `/configuracoes` | Configurações do usuário |
| `/planos` | Planos e preços |
| `/documents` | PDFs enviados |
| `/comecar` | Onboarding |

## Seletores importantes

### Login (`/entrar`)
- Email: `#email`
- Senha: `#password`
- Submit: `button[type="submit"]`
- Erro geral: `[role="alert"]`

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
