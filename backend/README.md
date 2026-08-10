# FlexPremia — Backend (API)

API REST em Express + Prisma + JWT. Contém toda a regra de negócio (catálogo,
faixas, cálculo de premiação, vendas, usuários/equipes) por trás da
plataforma FlexPremia. Feito para rodar como serviço Node no **Render**,
servindo o frontend estático (Vite/React) hospedado no **GitHub Pages**.

## Rodando localmente

```bash
npm install
npm run db:migrate   # aplica as migrations no SQLite local (prisma/dev.db)
npm run db:seed      # semeia catálogo, faixas e usuários iniciais
npm run dev           # http://localhost:4000
```

Logins criados pelo seed (senha para todos: `Trocar@123`):

| Papel        | E-mail                          |
|--------------|----------------------------------|
| Master       | master1@flexpremia.local        |
| Master       | master2@flexpremia.local        |
| Supervisor   | supervisor1@flexpremia.local    |
| Colaborador  | colaborador1@flexpremia.local   |

## Variáveis de ambiente

Veja `.env.example`.

- `DATABASE_URL` — SQLite em dev (`file:./dev.db`), Postgres em produção.
- `JWT_SECRET` — segredo para assinar os tokens de sessão. Gere um valor
  forte para produção (`openssl rand -base64 32`).
- `FRONTEND_ORIGIN` — origem(ns) do frontend permitidas no CORS (separadas
  por vírgula se precisar liberar mais de uma, ex: preview + produção).
- `PORT` — porta do servidor (o Render injeta a sua própria automaticamente).

## Deploy no Render

1. Crie um banco Postgres no Render (ou Neon/Supabase) e copie a connection
   string.
2. Em `prisma/schema.prisma`, troque:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Crie um **Web Service** no Render apontando para este diretório
   (`backend/` como Root Directory, se o repo for um monorepo).
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start` (roda `prisma migrate deploy` e depois
     sobe o servidor — não precisa de passo de deploy separado)
4. Configure as variáveis de ambiente no painel do Render:
   `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` (a URL do GitHub Pages,
   ex: `https://seu-usuario.github.io`).
5. Depois do primeiro deploy, rode o seed uma única vez (Render Shell ou
   localmente apontando `DATABASE_URL` para o Postgres de produção):
   ```bash
   npm run db:seed
   ```
   Isso cria o catálogo, as faixas e os 2 logins Master iniciais — troque as
   senhas temporárias depois.

## Endpoints principais

Todas as rotas (exceto `/api/auth/login`) exigem `Authorization: Bearer <token>`.

- `POST /api/auth/login` — autentica e retorna `{ token, user }`.
- `GET /api/catalog` — catálogo de produtos/pontos.
- `GET /api/sales`, `POST /api/sales`, `PATCH /api/sales/:id/status`,
  `PATCH /api/sales/:id/ativo`, `DELETE /api/sales/:id` — vendas do
  colaborador autenticado (papel `COLABORADOR`).
- `GET /api/sales/painel` — pontuação/faixa/premiação lançada x ativada do
  colaborador autenticado.
- `GET /api/supervisor/overview`, `GET /api/supervisor/colaboradores`,
  `GET /api/supervisor/colaboradores/:id`, `POST /api/supervisor/colaboradores`
  — somente leitura + criação de colaboradores (papel `SUPERVISOR`).
- `GET /api/master/overview`, `GET /api/master/usuarios`,
  `POST /api/master/usuarios`, `PATCH /api/master/usuarios/:id`,
  `POST /api/master/equipes`, `GET /api/master/colaboradores/:id` — gestão
  completa (papel `MASTER`).
- `GET /api/export/team-csv` — exporta as vendas da equipe (Supervisor) ou de
  todas/uma equipe (Master) em CSV.

## Estrutura

- `prisma/schema.prisma` + `prisma/seed.ts` — mesmo modelo de dados e seed do
  simulador original, sem alterar nenhum valor de pontos/faixas.
- `src/lib/calculo-premiacao.ts` — porte fiel das regras de premiação.
- `src/lib/aggregate.ts` / `src/lib/team-overview.ts` — agregação de pontos
  por colaborador/equipe (lançado x ativado).
- `src/auth/` — JWT + middleware de autenticação/autorização por papel.
- `src/routes/` — rotas Express por área (auth, catálogo, vendas, supervisor,
  master, export).
