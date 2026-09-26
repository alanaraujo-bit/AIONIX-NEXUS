# AIONIX NEXUS

Painel central de comando do ecossistema AIONIX. Uma plataforma privada, de um
operador só, onde cada produto, sistema, cliente, ambiente, link e próximo passo
vive num lugar só — e onde abrir a Home já responde *o que precisa de mim hoje*.

```
Cockpit ──▶ Foco ──▶ Projeto ──▶ Link / painel / repositório
   │          │         └── passos, notas, credenciais (referência), arquivos
   │          └── atrasados, esquecidos, sem direção, links fora do ar
   └── KPIs, portfólio, agenda, fixados, acesso rápido, atividade
```

## Como subir

```bash
npm install
cp .env.example .env.local     # gere o NEXUS_SECRET (comando no arquivo)
npm run dev                    # http://localhost:4310
```

Na primeira execução o NEXUS cria o banco, as categorias padrão e os atalhos
padrão. Se `NEXUS_EMAIL` e `NEXUS_PASSWORD` estiverem no `.env.local`, o operador
é criado junto; se não, `/login` mostra a tela de primeiro acesso.

Para ver o painel cheio antes de cadastrar o seu:

```bash
npm run db:seed          # 10 projetos de exemplo, com links, passos e notas
npm run db:seed -- clear # remove só o que veio do exemplo
```

O mesmo botão existe em **Configurações › Dados**.

> Os endereços dos projetos de exemplo são fictícios e vêm com o monitoramento
> desligado — só o link real marcado como *exemplo monitorado* participa da
> verificação de saúde.

## O que tem dentro

| Área | O que resolve |
|---|---|
| **Cockpit** (`/`) | KPIs por status, portfólio, o que precisa de atenção, agenda de hoje, fixados, acesso rápido, atividade recente |
| **Foco** (`/foco`) | Só o que está atrasado, esquecido, sem próximo passo ou com link caído — ordenado por severidade e prioridade |
| **Projetos** (`/projetos`) | Cartões, lista e quadro; agrupar por status, prioridade, categoria, cliente ou estágio; filtros combináveis, busca difusa, favoritos e arquivamento — tudo refletido na URL |
| **Projeto** (`/projetos/[slug]`) | Identidade, estado, progresso, saúde, próximos passos, links agrupados por ambiente/código/infra/serviços, notas, credenciais como referência, arquivos, histórico |
| **Acesso rápido** (`/atalhos`) | GitHub, Vercel, Railway, Cloudflare, bancos, IA — em grupos que você cria e reordena |
| **Clientes** (`/clientes`) | Contatos, observações e todos os projetos de cada cliente |
| **Notas** (`/notas`) | Captura rápida e notas por projeto, com fixação |
| **Saúde dos links** (`/links`) | Verificação HTTP de todos os endereços monitorados, com código e horário da última checagem |
| **Atividade** (`/atividade`) | Histórico paginado de tudo que mudou |
| **Configurações** (`/config`) | Categorias, tags, clientes, ferramentas, conta, sessões, exportação e zona de risco |

### Command Center

`⌘K` (ou `Ctrl K`, ou `/`) abre a busca global. Ela indexa projetos, **links de
projeto**, ferramentas, clientes, categorias, tags, notas e páginas — e também
executa ações. Busca difusa e sem acento: `rtl` acha *AIONIX Retail*, `railway
otto` acha o Railway do Otto, `pausados` filtra a lista.

### Atalhos de teclado

| Tecla | Ação |
|---|---|
| `⌘K` / `Ctrl K` / `/` | Command Center |
| `⇧N` | Novo projeto |
| `g` + `h` `f` `p` `a` `c` `n` `t` `l` `s` | Ir para cockpit, foco, projetos, atalhos, clientes, notas, atividade, links, configurações |
| `Esc` | Fecha modal, menu ou busca |

### Sinais de atenção

O NEXUS calcula sozinho, sem você marcar nada:

- **próximo passo atrasado** — o passo em aberto mais próximo já venceu;
- **link fora do ar** — a última verificação devolveu erro ou não respondeu;
- **sem próximo passo** — projeto ativo sem nenhuma ação definida;
- **parado há tempo demais** — limite por status (ativo 21 d, dev 14 d, pausado 60 d, ideia 120 d);
- **ativo sem URL de produção** — está no ar, mas ninguém cadastrou o endereço;
- **progresso em 0%** — em desenvolvimento e sem avanço registrado.

Cada sinal vira pontos de severidade; a soma dá a **saúde** de 0 a 100 mostrada
no cartão e na página do projeto.

## Arquitetura

| Decisão | Por quê |
|---|---|
| Next.js 16 (App Router), React 19 | Server Components leem direto do banco; Server Actions fazem as escritas — nenhuma camada de API para manter |
| `node:sqlite` (embutido no Node 24) | Banco de um arquivo, zero dependência nativa para compilar, transações síncronas. Para um operador só, é mais rápido e mais simples que Postgres |
| Tailwind v4 + camada de tokens própria | Utilitários para layout, componentes nomeados (`.panel`, `.btn`, `.chip`, `.meter`) para identidade. Nada de biblioteca de UI pronta |
| Sessão própria (scrypt + cookie httpOnly) | Sem dependência de provedor externo num sistema pessoal |

```
src/
  app/
    (app)/            cockpit, foco, projetos, clientes, notas, atalhos, links, atividade, config
    login/            primeiro acesso e autenticação
    api/export/       backup JSON
  components/
    shell/            sidebar, barra inferior, Command Center, tema
    project/          cartão, explorador, formulário, painéis (passos, links, recursos)
    dashboard/        KPIs e painéis do cockpit
    ui/               modal, menu, toast, pickers, formulários
  lib/
    schema.sql        fonte única do esquema  →  schema.ts (gerado)
    db.ts             conexão, transações, bootstrap
    auth.ts           senha, sessão, rate limit
    queries.ts        leitura tipada
    actions/          escrita (projetos, catálogo, links, seed, auth)
    insights.ts       atenção, agenda, saúde, estatísticas
    search.ts         índice do Command Center
  proxy.ts            atalho de roteamento para quem não tem sessão
```

Ao mexer em `src/lib/schema.sql`, rode `node scripts/gen-schema.mjs` para
regenerar o módulo TypeScript.

## Segurança

- Senha com **scrypt** (N=32768, sal por usuário), verificação em tempo constante.
- Sessão de 30 dias: o cookie é `httpOnly`, `SameSite=Lax` e `Secure` em produção;
  o banco guarda só o **HMAC-SHA256** do token, assinado com `NEXUS_SECRET` —
  um backup do banco não revela nenhuma sessão. Em produção o app se recusa a
  emitir sessão se o segredo estiver ausente ou com menos de 32 caracteres.
- Login com limite de 8 tentativas por 15 minutos e verificação de senha mesmo
  quando o e-mail não existe (não vaza quais contas existem por tempo de resposta).
- `proxy.ts` barra o render das áreas privadas; toda leitura ainda passa por
  `requireUser()` no servidor.
- Redirecionamento pós-login aceita só caminhos internos.
- Cabeçalhos `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy` restritiva; páginas marcadas `noindex`.
- **Credenciais**: o NEXUS guarda apenas *onde* o segredo vive (cofre, usuário,
  link, data da última rotação). Nunca a senha, o token ou a chave. O export JSON
  também não inclui usuários nem sessões.

## Deploy

### Railway (recomendado — o SQLite precisa de disco)

1. `railway init` e conecte o repositório.
2. Crie um **Volume** montado em `/data`.
3. Variáveis: `NEXUS_SECRET` (obrigatória), `NEXUS_DB_PATH=/data/nexus.db`,
   `NEXUS_EMAIL`, `NEXUS_PASSWORD`, `NEXUS_OWNER_NAME`.
4. Deploy — o `railway.json` já aponta para o `Dockerfile` e para o healthcheck.

### Vercel

Funciona, mas o sistema de arquivos é efêmero: o banco seria recriado a cada
deploy. Só faz sentido com um Postgres gerenciado no lugar do SQLite — troca
localizada em `src/lib/db.ts`, já que todo o resto fala SQL puro.

### Backup

O banco inteiro é `data/nexus.db`. Copiar o arquivo é o backup completo.
Pela interface, **Configurações › Dados › Exportar tudo em JSON**.

## Scripts

```bash
npm run dev         # desenvolvimento em :4310
npm run build       # build de produção
npm run start       # sobe o build (respeita $PORT)
npm run typecheck   # tsc --noEmit
npm run db:seed     # portfólio de demonstração  (-- clear para remover)
```

### Autoteste das escritas

Com o servidor de desenvolvimento no ar e uma sessão aberta, `GET /api/selftest`
exercita de ponta a ponta criar, editar, duplicar e excluir projeto, links
(com normalização e recusa de URL inválida), próximos passos, notas,
credenciais, alteração de campos, verificação de link e o catálogo — e limpa
tudo o que criou. Responde 200 com o relatório, ou 500 se algum passo falhar.
A rota devolve 404 em produção.
