# FlexPremia — Frontend (SPA)

Aplicação React (Vite) que consome a API do backend (`../backend`). SPA
estática, sem servidor Node — pensada para ser publicada no **GitHub Pages**.

Usa `HashRouter` (URLs no formato `/#/colaborador/vendas`) de propósito: o
GitHub Pages não sabe reescrever rotas para `index.html`, então um refresh em
`/colaborador/vendas` daria 404 com rotas "normais" — o hash router evita
isso sem configuração extra no servidor.

## Rodando localmente

```bash
npm install
npm run dev   # http://localhost:5173
```

Por padrão (`.env`), aponta para o backend local em `http://localhost:4000`
— suba o backend (`../backend`) antes de logar.

## Variáveis de ambiente

Veja `.env.example`.

- `VITE_API_URL` — URL da API. Local: `http://localhost:4000`. Produção:
  a URL pública do serviço no Render (ex:
  `https://flexpremia-backend.onrender.com`).
- `BASE_PATH` — só usada no ambiente de build do deploy (não vai no `.env`),
  para servir os assets no subcaminho correto do GitHub Pages
  (`/nome-do-repo/`).

## Deploy no GitHub Pages

Duas opções — escolha uma:

### Opção A — GitHub Actions (recomendado, automático a cada push)

1. No repositório do GitHub: **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions**:
   - New repository secret `VITE_API_URL` = URL do backend no Render.
   - (Opcional) New repository variable `BASE_PATH` = `/nome-do-repo/` — se
     omitido, o workflow já usa o nome do repositório automaticamente.
3. O workflow em `../.github/workflows/deploy-frontend.yml` builda e publica
   a cada push em `main` que toque a pasta `frontend/`.

### Opção B — deploy manual pela CLI (`gh-pages`)

```bash
VITE_API_URL=https://flexpremia-backend.onrender.com BASE_PATH=/nome-do-repo/ npm run build
npm run deploy
```

Isso publica o conteúdo de `dist/` na branch `gh-pages` do repositório
(exige que o remote `origin` já esteja configurado). Depois, em
**Settings → Pages**, selecione a branch `gh-pages` como origem (se ainda não
estiver usando GitHub Actions como Source).

> Se o repositório for do tipo `usuario.github.io` (página de usuário, não de
> projeto), o site já fica na raiz — use `BASE_PATH=/` nesse caso.

## CORS

O backend precisa liberar a origem do GitHub Pages em `FRONTEND_ORIGIN`
(veja `../backend/README.md`), ex: `https://seu-usuario.github.io`.
