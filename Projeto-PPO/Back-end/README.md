# Back-end – Receitas Fáceis e Econômicas

API REST em **Node.js + Express + PostgreSQL** que atende o site da pasta `Front-end`.

## Como rodar

Pré-requisitos: Node.js 20+ e PostgreSQL 14+ (ou Docker).

```bash
# 1. Banco de dados (opção Docker, na raiz do projeto)
docker compose up -d

# 2. Back-end
cd Back-end
cp .env.example .env        # ajuste DATABASE_URL e troque o JWT_SECRET
npm install
npm run seed                # cria as tabelas + categorias, receitas, dicas e ingredientes de exemplo
npm start
```

Abra **http://localhost:3000** — o back-end também serve o `Front-end`, então o site já funciona completo.
Se preferir abrir o front por outro servidor (ex.: Live Server na porta 5500), ele aponta sozinho para `http://localhost:3000/api`
(e a origem precisa estar em `CORS_ORIGIN`).

Sem Docker: crie o banco manualmente
(`CREATE USER receitas WITH PASSWORD 'receitas'; CREATE DATABASE receitas_db OWNER receitas;`) e ajuste `DATABASE_URL`.

`npm run migrate` cria/atualiza só as tabelas (pode rodar quantas vezes quiser). `npm run seed` também insere os dados de exemplo.

## Testes

```bash
createdb receitas_test        # banco separado; o teste APAGA e recria o schema dele
npm test                      # 33 testes de integração (usa TEST_DATABASE_URL, se definida)
```

## Endpoints

Erros sempre retornam `{ "erro": "mensagem em português" }`. Rotas marcadas com 🔒 exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/cadastro` | `{nome, email, senha}` (senha ≥ 6) |
| POST | `/api/auth/login` | `{email, senha}` → `{token, usuario}` |
| GET 🔒 | `/api/auth/me` | dados do usuário logado |
| GET | `/api/categorias` | lista com `quantidade_receitas` |
| GET | `/api/receitas?busca=&categoria=&pagina=&limite=` | `{receitas, total, pagina, limite}`; busca em nome, descrição, ingredientes e categoria |
| GET | `/api/receitas/:id` | detalhe + `comentarios`, `favorito`, `pode_editar`, `autor` |
| GET 🔒 | `/api/receitas/minhas` | receitas do usuário (públicas e privadas) |
| POST 🔒 | `/api/receitas` | JSON **ou** `multipart/form-data` (campo de arquivo `imagem`) |
| PUT 🔒 | `/api/receitas/:id` | só o dono; atualização parcial; `remover_imagem=true` apaga a imagem |
| DELETE 🔒 | `/api/receitas/:id` | só o dono |
| GET 🔒 | `/api/favoritos` | receitas favoritas |
| POST / DELETE 🔒 | `/api/favoritos/:id` | favorita / desfavorita |
| POST 🔒 | `/api/comentarios` | `{id_receita, comentario}` |
| DELETE 🔒 | `/api/comentarios/:id` | só o autor |
| POST | `/api/contato` | `{nome, email, mensagem}` |
| GET 🔒 | `/api/pastas` | pastas do usuário |
| POST 🔒 | `/api/pastas` | `{nome}` |
| GET / PUT / DELETE 🔒 | `/api/pastas/:id` | ver conteúdo / renomear / excluir |
| POST / DELETE 🔒 | `/api/pastas/:id/receitas/:idReceita` | adiciona / remove receita da pasta |
| GET | `/api/dicas?tipo=` | dicas culinárias e de economia (RF08) |
| GET | `/api/ingredientes?busca=` | informações sobre ingredientes (RF09) |

Campos de receita: `nome*`, `ingredientes*`, `modo_preparo*`, `descricao`, `tempo_preparo` (min), `dificuldade` (`Fácil`/`Média`/`Difícil`), `id_categoria`, `publica` (padrão `true`), `imagem` (JPG/PNG/WEBP/GIF até 3 MB) ou `imagem_url` (link externo).

## Segurança

- Senhas com **bcrypt**; login com **JWT**; mensagem de erro igual para e-mail inexistente e senha errada.
- Todas as consultas SQL são **parametrizadas**; entrada validada com **zod**.
- Upload: tipo verificado, nome gerado pelo servidor, limite de 3 MB, arquivo removido ao excluir/trocar a imagem.
- `helmet` (cabeçalhos/CSP), CORS configurável, limite de tentativas em `/auth` e `/contato`.
- Receitas privadas só são visíveis ao dono; receitas/pastas/comentários só podem ser alterados pelo dono.
- O front escapa todo texto de usuário antes de exibir (XSS).

## Estrutura

```
Back-end/
├── database/schema.sql, seed.sql
├── src/
│   ├── app.js, server.js, config.js, db.js, errors.js, utils.js, queries.js
│   ├── middleware/   auth, upload, error
│   ├── routes/       auth, receitas, categorias, favoritos, comentarios, contato, pastas, conteudo
│   └── scripts/migrate.js
├── tests/api.test.js
└── uploads/          imagens enviadas (ignorado pelo git)
```

## Para colocar em produção

Defina `NODE_ENV=production`, um `JWT_SECRET` forte (a API recusa iniciar sem ele), `CORS_ORIGIN` com o domínio do site,
`PUBLIC_URL` e `TRUST_PROXY=1` se estiver atrás de proxy (Nginx etc.). Faça backup da pasta `uploads/` junto com o banco.
