process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://receitas:receitas@localhost:5432/receitas_test";
process.env.JWT_SECRET = "segredo-de-teste";

const { test, before, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const request = require("supertest");

const app = require("../src/app");
const { pool } = require("../src/db");
const config = require("../src/config");

const sql = (f) => fs.readFileSync(path.join(__dirname, "..", "database", f), "utf8");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

let ana, bia; // { token, id }

async function criarUsuario(nome) {
  const email = `${nome.toLowerCase()}@teste.com`;
  await request(app).post("/api/auth/cadastro").send({ nome, email, senha: "123456" });
  const r = await request(app).post("/api/auth/login").send({ email, senha: "123456" });
  return { token: r.body.token, id: r.body.usuario.id_usuario };
}
const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });

before(async () => {
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.query(sql("schema.sql"));
  await pool.query(sql("seed.sql"));
  ana = await criarUsuario("Ana");
  bia = await criarUsuario("Bia");
});

after(async () => {
  await pool.end();
});

describe("autenticação", () => {
  test("cadastro válido não expõe senha", async () => {
    const r = await request(app)
      .post("/api/auth/cadastro")
      .send({ nome: "Caio", email: "CAIO@Teste.com", senha: "abcdef" });
    assert.equal(r.status, 201);
    assert.equal(r.body.usuario.email, "caio@teste.com");
    assert.equal(r.body.usuario.senha_hash, undefined);
  });

  test("e-mail duplicado → 409", async () => {
    const r = await request(app).post("/api/auth/cadastro").send({ nome: "Ana 2", email: "ana@teste.com", senha: "123456" });
    assert.equal(r.status, 409);
    assert.match(r.body.erro, /já está cadastrado/);
  });

  test("validações do cadastro", async () => {
    assert.equal((await request(app).post("/api/auth/cadastro").send({ nome: "X", email: "invalido", senha: "123456" })).status, 400);
    assert.equal((await request(app).post("/api/auth/cadastro").send({ nome: "X", email: "x@x.com", senha: "123" })).status, 400);
    assert.equal((await request(app).post("/api/auth/cadastro").send({})).status, 400);
  });

  test("login devolve token e usuario; senha errada → 401", async () => {
    const ok = await request(app).post("/api/auth/login").send({ email: "ana@teste.com", senha: "123456" });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    assert.equal(ok.body.usuario.nome, "Ana");
    const ruim = await request(app).post("/api/auth/login").send({ email: "ana@teste.com", senha: "errada" });
    assert.equal(ruim.status, 401);
    const inexistente = await request(app).post("/api/auth/login").send({ email: "naoexiste@x.com", senha: "123456" });
    assert.equal(inexistente.status, 401);
    assert.equal(ruim.body.erro, inexistente.body.erro); // não revela se o e-mail existe
  });

  test("rota protegida exige token válido", async () => {
    assert.equal((await request(app).get("/api/auth/me")).status, 401);
    assert.equal((await request(app).get("/api/auth/me").set("Authorization", "Bearer lixo")).status, 401);
    const r = await request(app).get("/api/auth/me").set(bearer(ana));
    assert.equal(r.body.email, "ana@teste.com");
  });
});

describe("categorias e listagem de receitas", () => {
  test("categorias com quantidade_receitas", async () => {
    const r = await request(app).get("/api/categorias");
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 5);
    assert.ok(r.body.every((c) => Number.isInteger(c.quantidade_receitas) && c.id_categoria && c.nome));
    assert.ok(r.body.find((c) => c.nome === "Doces").quantidade_receitas >= 2);
  });

  test("lista paginada no formato esperado pelo front", async () => {
    const r = await request(app).get("/api/receitas?limite=3&pagina=1");
    assert.equal(r.status, 200);
    assert.equal(r.body.receitas.length, 3);
    assert.equal(r.body.pagina, 1);
    assert.equal(r.body.total, 9);
    const p2 = await request(app).get("/api/receitas?limite=3&pagina=2");
    assert.notEqual(p2.body.receitas[0].id_receita, r.body.receitas[0].id_receita);
    const c = r.body.receitas[0];
    for (const k of ["id_receita", "nome", "descricao", "categoria", "tempo_preparo", "imagem_url"]) assert.ok(k in c, k);
  });

  test("busca por nome, ingrediente e categoria; filtro por categoria", async () => {
    const porNome = await request(app).get("/api/receitas?busca=brigadeiro");
    assert.equal(porNome.body.total, 1);
    const porIngrediente = await request(app).get("/api/receitas?busca=polvilho");
    assert.equal(porIngrediente.body.receitas[0].nome, "Pão de queijo");
    const cats = (await request(app).get("/api/categorias")).body;
    const doces = cats.find((c) => c.nome === "Doces");
    const f = await request(app).get(`/api/receitas?categoria=${doces.id_categoria}`);
    assert.equal(f.body.total, doces.quantidade_receitas);
    assert.ok(f.body.receitas.every((r) => r.categoria === "Doces"));
    // front envia busca= e categoria= vazios
    assert.equal((await request(app).get("/api/receitas?busca=&categoria=&pagina=1&limite=9")).status, 200);
  });

  test("curingas do LIKE são tratados como texto", async () => {
    assert.equal((await request(app).get("/api/receitas?busca=%25")).body.total, 0);
    assert.equal((await request(app).get("/api/receitas?busca=_")).body.total, 0);
  });

  test("detalhe da receita", async () => {
    const lista = await request(app).get("/api/receitas?busca=brigadeiro");
    const r = await request(app).get(`/api/receitas/${lista.body.receitas[0].id_receita}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.nome, "Brigadeiro");
    assert.equal(r.body.categoria, "Doces");
    assert.deepEqual(r.body.comentarios, []);
    assert.equal(r.body.favorito, false);
    assert.equal(r.body.pode_editar, false);
  });

  test("id inválido → 400, inexistente → 404 (sempre JSON)", async () => {
    assert.equal((await request(app).get("/api/receitas/abc")).status, 400);
    assert.equal((await request(app).get("/api/receitas/999999")).status, 404);
    const r = await request(app).get("/api/rota-que-nao-existe");
    assert.equal(r.status, 404);
    assert.ok(r.body.erro);
  });
});

describe("CRUD de receitas", () => {
  let id;

  test("criar exige login", async () => {
    assert.equal((await request(app).post("/api/receitas").send({ nome: "x" })).status, 401);
  });

  test("validação na criação", async () => {
    const r = await request(app).post("/api/receitas").set(bearer(ana)).send({ nome: "Sem ingredientes" });
    assert.equal(r.status, 400);
    assert.match(r.body.erro, /Ingredientes/);
    const t = await request(app).post("/api/receitas").set(bearer(ana))
      .send({ nome: "N", ingredientes: "a", modo_preparo: "b", tempo_preparo: -5 });
    assert.equal(t.status, 400);
    const c = await request(app).post("/api/receitas").set(bearer(ana))
      .send({ nome: "N", ingredientes: "a", modo_preparo: "b", id_categoria: 99999 });
    assert.equal(c.status, 400);
  });

  test("criar com JSON", async () => {
    const cats = (await request(app).get("/api/categorias")).body;
    const r = await request(app).post("/api/receitas").set(bearer(ana)).send({
      nome: "Bolo da Ana", descricao: "Teste", ingredientes: "farinha\novo", modo_preparo: "misture\nasse",
      tempo_preparo: 45, id_categoria: cats[0].id_categoria,
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.id_usuario, ana.id);
    assert.equal(r.body.categoria, cats[0].nome);
    assert.equal(r.body.dificuldade, "Fácil"); // padrão
    id = r.body.id_receita;
  });

  test("criar com imagem (multipart), servir arquivo e rejeitar tipo inválido", async () => {
    const r = await request(app).post("/api/receitas").set(bearer(ana))
      .field("nome", "Com foto").field("ingredientes", "a").field("modo_preparo", "b").field("tempo_preparo", "10")
      .attach("imagem", PNG, { filename: "foto.png", contentType: "image/png" });
    assert.equal(r.status, 201);
    assert.match(r.body.imagem_url, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/[a-f0-9]{32}\.png$/);
    const arquivo = path.join(config.uploadsDir, path.basename(r.body.imagem_url));
    assert.ok(fs.existsSync(arquivo));
    const img = await request(app).get(new URL(r.body.imagem_url).pathname);
    assert.equal(img.status, 200);
    assert.match(img.headers["content-type"], /image\/png/);

    // excluir remove o arquivo do disco
    await request(app).delete(`/api/receitas/${r.body.id_receita}`).set(bearer(ana));
    await new Promise((res) => setTimeout(res, 100));
    assert.equal(fs.existsSync(arquivo), false);

    const ruim = await request(app).post("/api/receitas").set(bearer(ana))
      .field("nome", "X").field("ingredientes", "a").field("modo_preparo", "b")
      .attach("imagem", Buffer.from("<script>alert(1)</script>"), { filename: "x.html", contentType: "text/html" });
    assert.equal(ruim.status, 400);
  });

  test("não deixa arquivo órfão quando a validação falha", async () => {
    const antes = fs.readdirSync(config.uploadsDir).length;
    const r = await request(app).post("/api/receitas").set(bearer(ana))
      .field("nome", "Sem resto")
      .attach("imagem", PNG, { filename: "f.png", contentType: "image/png" });
    assert.equal(r.status, 400);
    await new Promise((res) => setTimeout(res, 100));
    assert.equal(fs.readdirSync(config.uploadsDir).length, antes);
  });

  test("editar: só o dono; atualização parcial", async () => {
    assert.equal((await request(app).put(`/api/receitas/${id}`).set(bearer(bia)).send({ nome: "Roubada" })).status, 403);
    assert.equal((await request(app).put(`/api/receitas/${id}`).send({ nome: "x" })).status, 401);
    const r = await request(app).put(`/api/receitas/${id}`).set(bearer(ana)).send({ nome: "Bolo da Ana v2", tempo_preparo: 50 });
    assert.equal(r.status, 200);
    assert.equal(r.body.nome, "Bolo da Ana v2");
    assert.equal(r.body.tempo_preparo, 50);
    assert.equal(r.body.descricao, "Teste"); // não mexeu
    const dif = await request(app).put(`/api/receitas/${id}`).set(bearer(ana)).send({ dificuldade: "Difícil" });
    assert.equal(dif.body.dificuldade, "Difícil");
    assert.equal((await request(app).put(`/api/receitas/${id}`).set(bearer(ana)).send({ dificuldade: "Impossível" })).status, 400);
    assert.equal((await request(app).put(`/api/receitas/${id}`).set(bearer(ana)).send({})).status, 400);
  });

  test("receita do site (sem dono) não pode ser editada nem excluída", async () => {
    const seed = (await request(app).get("/api/receitas?busca=brigadeiro")).body.receitas[0];
    assert.equal((await request(app).put(`/api/receitas/${seed.id_receita}`).set(bearer(ana)).send({ nome: "x" })).status, 403);
    assert.equal((await request(app).delete(`/api/receitas/${seed.id_receita}`).set(bearer(ana))).status, 403);
  });

  test("pode_editar e /minhas", async () => {
    const d = await request(app).get(`/api/receitas/${id}`).set(bearer(ana));
    assert.equal(d.body.pode_editar, true);
    const m = await request(app).get("/api/receitas/minhas").set(bearer(ana));
    assert.ok(m.body.some((r) => r.id_receita === id));
    const mb = await request(app).get("/api/receitas/minhas").set(bearer(bia));
    assert.equal(mb.body.length, 0);
  });

  test("receita privada só aparece para o dono", async () => {
    const r = await request(app).post("/api/receitas").set(bearer(ana))
      .send({ nome: "Segredo de família", ingredientes: "?", modo_preparo: "?", publica: false });
    const pid = r.body.id_receita;
    assert.equal((await request(app).get(`/api/receitas/${pid}`)).status, 404);
    assert.equal((await request(app).get(`/api/receitas/${pid}`).set(bearer(bia))).status, 404);
    assert.equal((await request(app).get(`/api/receitas/${pid}`).set(bearer(ana))).status, 200);
    assert.equal((await request(app).get("/api/receitas?busca=Segredo")).body.total, 0);
    assert.equal((await request(app).get("/api/receitas?busca=Segredo").set(bearer(ana))).body.total, 1);
    assert.equal((await request(app).post(`/api/favoritos/${pid}`).set(bearer(bia))).status, 404);
  });

  test("excluir: só o dono", async () => {
    assert.equal((await request(app).delete(`/api/receitas/${id}`).set(bearer(bia))).status, 403);
    assert.equal((await request(app).delete(`/api/receitas/${id}`).set(bearer(ana))).status, 200);
    assert.equal((await request(app).get(`/api/receitas/${id}`)).status, 404);
  });
});

describe("favoritos e comentários", () => {
  let rid;
  before(async () => {
    rid = (await request(app).get("/api/receitas?busca=omelete")).body.receitas[0].id_receita;
  });

  test("favoritos exigem login", async () => {
    assert.equal((await request(app).get("/api/favoritos")).status, 401);
  });

  test("favoritar é idempotente, lista e desfavorita", async () => {
    assert.equal((await request(app).post(`/api/favoritos/${rid}`).set(bearer(ana))).status, 201);
    assert.equal((await request(app).post(`/api/favoritos/${rid}`).set(bearer(ana))).status, 201);
    const lista = await request(app).get("/api/favoritos").set(bearer(ana));
    assert.equal(lista.body.length, 1);
    assert.equal(lista.body[0].nome, "Omelete simples");
    assert.equal((await request(app).get(`/api/receitas/${rid}`).set(bearer(ana))).body.favorito, true);
    assert.equal((await request(app).get("/api/favoritos").set(bearer(bia))).body.length, 0);
    assert.equal((await request(app).delete(`/api/favoritos/${rid}`).set(bearer(ana))).status, 200);
    assert.equal((await request(app).get("/api/favoritos").set(bearer(ana))).body.length, 0);
    assert.equal((await request(app).post("/api/favoritos/999999").set(bearer(ana))).status, 404);
  });

  test("comentar exige login e valida", async () => {
    assert.equal((await request(app).post("/api/comentarios").send({ id_receita: rid, comentario: "oi" })).status, 401);
    assert.equal((await request(app).post("/api/comentarios").set(bearer(ana)).send({ id_receita: rid, comentario: "   " })).status, 400);
    assert.equal((await request(app).post("/api/comentarios").set(bearer(ana)).send({ id_receita: 999999, comentario: "oi" })).status, 404);
  });

  test("comentário aparece no detalhe com nome do autor; só o autor exclui", async () => {
    const c = await request(app).post("/api/comentarios").set(bearer(ana)).send({ id_receita: rid, comentario: "Ficou ótima! <b>x</b>" });
    assert.equal(c.status, 201);
    const d = await request(app).get(`/api/receitas/${rid}`).set(bearer(ana));
    assert.equal(d.body.comentarios.length, 1);
    assert.equal(d.body.comentarios[0].nome, "Ana");
    assert.equal(d.body.comentarios[0].comentario, "Ficou ótima! <b>x</b>"); // guardado como texto; o front escapa
    assert.equal(d.body.comentarios[0].meu, true);
    assert.equal((await request(app).get(`/api/receitas/${rid}`).set(bearer(bia))).body.comentarios[0].meu, false);
    assert.equal((await request(app).delete(`/api/comentarios/${c.body.id_comentario}`).set(bearer(bia))).status, 403);
    assert.equal((await request(app).delete(`/api/comentarios/${c.body.id_comentario}`).set(bearer(ana))).status, 200);
  });
});

describe("pastas", () => {
  let pid, rid;
  before(async () => {
    rid = (await request(app).get("/api/receitas?busca=panqueca")).body.receitas[0].id_receita;
  });

  test("criar, nome duplicado e listar", async () => {
    const r = await request(app).post("/api/pastas").set(bearer(ana)).send({ nome: "Jantares" });
    assert.equal(r.status, 201);
    pid = r.body.id_pasta;
    assert.equal((await request(app).post("/api/pastas").set(bearer(ana)).send({ nome: "Jantares" })).status, 409);
    assert.equal((await request(app).post("/api/pastas").set(bearer(bia)).send({ nome: "Jantares" })).status, 201); // outro usuário pode
    assert.equal((await request(app).post("/api/pastas").set(bearer(ana)).send({ nome: "" })).status, 400);
    const l = await request(app).get("/api/pastas").set(bearer(ana));
    assert.equal(l.body.length, 1);
  });

  test("adicionar/remover receita e ver conteúdo", async () => {
    assert.equal((await request(app).post(`/api/pastas/${pid}/receitas/${rid}`).set(bearer(ana))).status, 201);
    assert.equal((await request(app).post(`/api/pastas/${pid}/receitas/${rid}`).set(bearer(ana))).status, 201);
    const d = await request(app).get(`/api/pastas/${pid}`).set(bearer(ana));
    assert.equal(d.body.receitas.length, 1);
    assert.equal(d.body.receitas[0].nome, "Panqueca simples");
    assert.equal((await request(app).get("/api/pastas").set(bearer(ana))).body[0].quantidade_receitas, 1);
    assert.equal((await request(app).delete(`/api/pastas/${pid}/receitas/${rid}`).set(bearer(ana))).status, 200);
    assert.equal((await request(app).get(`/api/pastas/${pid}`).set(bearer(ana))).body.receitas.length, 0);
  });

  test("pasta de outro usuário é invisível (404)", async () => {
    assert.equal((await request(app).get(`/api/pastas/${pid}`).set(bearer(bia))).status, 404);
    assert.equal((await request(app).delete(`/api/pastas/${pid}`).set(bearer(bia))).status, 404);
    assert.equal((await request(app).post(`/api/pastas/${pid}/receitas/${rid}`).set(bearer(bia))).status, 404);
  });

  test("renomear e excluir (receitas permanecem)", async () => {
    await request(app).post(`/api/pastas/${pid}/receitas/${rid}`).set(bearer(ana));
    assert.equal((await request(app).put(`/api/pastas/${pid}`).set(bearer(ana)).send({ nome: "Jantares leves" })).body.nome, "Jantares leves");
    assert.equal((await request(app).delete(`/api/pastas/${pid}`).set(bearer(ana))).status, 200);
    assert.equal((await request(app).get(`/api/receitas/${rid}`)).status, 200);
  });
});

describe("contato e conteúdo", () => {
  test("contato salva mensagem e valida", async () => {
    const r = await request(app).post("/api/contato").send({ nome: "Visitante", email: "v@v.com", mensagem: "Olá!" });
    assert.equal(r.status, 201);
    const { rows } = await pool.query("SELECT * FROM contato");
    assert.equal(rows.length, 1);
    assert.equal((await request(app).post("/api/contato").send({ nome: "V", email: "ruim", mensagem: "x" })).status, 400);
    assert.equal((await request(app).post("/api/contato").send({ nome: "V", email: "v@v.com", mensagem: "" })).status, 400);
  });

  test("dicas e ingredientes", async () => {
    const d = await request(app).get("/api/dicas");
    assert.ok(d.body.length >= 6);
    assert.ok((await request(app).get("/api/dicas?tipo=economia")).body.every((x) => x.tipo === "economia"));
    const i = await request(app).get("/api/ingredientes?busca=ovo");
    assert.equal(i.body[0].nome, "Ovo");
  });

  test("JSON malformado → 400", async () => {
    const r = await request(app).post("/api/contato").set("Content-Type", "application/json").send("{ruim");
    assert.equal(r.status, 400);
  });

  test("cabeçalhos de segurança e CORS", async () => {
    const r = await request(app).get("/api/saude").set("Origin", "http://localhost:5500");
    assert.equal(r.headers["x-content-type-options"], "nosniff");
    assert.equal(r.headers["x-powered-by"], undefined);
    assert.ok(r.headers["access-control-allow-origin"]);
  });
});
