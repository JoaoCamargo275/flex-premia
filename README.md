# FlexPremia

Plataforma de registro de vendas e pontuação, separada em dois projetos
independentes para deploy:

- [`backend/`](backend/README.md) — API REST (Express + Prisma + JWT).
  Deploy no **Render**.
- [`frontend/`](frontend/README.md) — SPA estática (Vite + React).
  Deploy no **GitHub Pages**.

Os dois se comunicam via HTTP/JSON (CORS + Bearer token), sem cookies de
sessão compartilhados — por isso podem ficar em domínios completamente
diferentes (`*.onrender.com` e `*.github.io`).

`legacy-nextjs/` é a versão anterior (Next.js full-stack, tudo em um único
projeto) mantida como referência/backup — não é mais o código ativo.

## Ordem para rodar localmente

```bash
# 1) backend
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev          # http://localhost:4000

# 2) frontend (em outro terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Logins de teste (senha para todos: `Trocar@123`):

| Papel        | E-mail                          |
|--------------|----------------------------------|
| Master       | master1@flexpremia.local        |
| Master       | master2@flexpremia.local        |
| Supervisor   | supervisor1@flexpremia.local    |
| Colaborador  | colaborador1@flexpremia.local   |

## Deploy

1. **Backend no Render** — siga [`backend/README.md`](backend/README.md).
   Anote a URL pública gerada (ex: `https://flexpremia-backend.onrender.com`).
2. **Frontend no GitHub Pages** — siga [`frontend/README.md`](frontend/README.md),
   apontando `VITE_API_URL` para a URL do passo 1.
3. Volte ao Render e configure `FRONTEND_ORIGIN` com a URL do GitHub Pages
   (ex: `https://seu-usuario.github.io`), para o CORS liberar o frontend.

## Regras de negócio

Ver a seção "Regras de negócio" e "Decisões tomadas para pontos ambíguos do
escopo" em [`legacy-nextjs/README.md`](legacy-nextjs/README.md) — a lógica de
cálculo de premiação, o modelo de dados e as decisões de projeto não mudaram
na separação backend/frontend, só a forma como as camadas conversam entre si
(chamadas de API em vez de Server Components/Server Actions).
