const router = require("express").Router();
const { z } = require("zod");
const db = require("../db");
const { auth } = require("../middleware/auth");
const { notFound, conflict } = require("../errors");
const { parseId, validar } = require("../utils");
const { COLUNAS_RECEITA, FROM_RECEITA, visivel, serializar, buscarReceitaVisivel } = require("../queries");

router.use(auth);

const schema = z.object({
  nome: z.string({ message: "Nome da pasta é obrigatório." }).trim().min(1, "Nome da pasta é obrigatório.").max(60, "O nome deve ter no máximo 60 caracteres."),
});

/** Garante que a pasta existe e é do usuário (404 caso contrário, sem revelar pastas alheias). */
async function pastaDoUsuario(id, userId) {
  const { rows } = await db.query("SELECT id_pasta, nome FROM pasta WHERE id_pasta = $1 AND id_usuario = $2", [id, userId]);
  if (!rows[0]) throw notFound("Pasta não encontrada.");
  return rows[0];
}

router.get("/", async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.id_pasta, p.nome, COUNT(pr.id_receita)::int AS quantidade_receitas
     FROM pasta p LEFT JOIN pasta_receita pr ON pr.id_pasta = p.id_pasta
     WHERE p.id_usuario = $1 GROUP BY p.id_pasta ORDER BY p.nome`,
    [req.user.id]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const d = validar(schema, req.body);
  try {
    const { rows } = await db.query(
      "INSERT INTO pasta (id_usuario, nome) VALUES ($1,$2) RETURNING id_pasta, nome",
      [req.user.id, d.nome]
    );
    res.status(201).json({ ...rows[0], quantidade_receitas: 0 });
  } catch (err) {
    if (err.code === "23505") throw conflict("Você já tem uma pasta com esse nome.");
    throw err;
  }
});

router.get("/:id", async (req, res) => {
  const pasta = await pastaDoUsuario(parseId(req.params.id), req.user.id);
  const { rows } = await db.query(
    `SELECT ${COLUNAS_RECEITA}
     ${FROM_RECEITA} JOIN pasta_receita pr ON pr.id_receita = r.id_receita
     WHERE pr.id_pasta = $2 AND ${visivel(1)}
     ORDER BY r.nome`,
    [req.user.id, pasta.id_pasta]
  );
  res.json({ ...pasta, receitas: rows.map((r) => serializar(req, r)) });
});

router.put("/:id", async (req, res) => {
  const pasta = await pastaDoUsuario(parseId(req.params.id), req.user.id);
  const d = validar(schema, req.body);
  try {
    await db.query("UPDATE pasta SET nome = $1 WHERE id_pasta = $2", [d.nome, pasta.id_pasta]);
  } catch (err) {
    if (err.code === "23505") throw conflict("Você já tem uma pasta com esse nome.");
    throw err;
  }
  res.json({ id_pasta: pasta.id_pasta, nome: d.nome });
});

router.delete("/:id", async (req, res) => {
  const pasta = await pastaDoUsuario(parseId(req.params.id), req.user.id);
  await db.query("DELETE FROM pasta WHERE id_pasta = $1", [pasta.id_pasta]);
  res.json({ mensagem: "Pasta excluída. As receitas continuam salvas." });
});

router.post("/:id/receitas/:idReceita", async (req, res) => {
  const pasta = await pastaDoUsuario(parseId(req.params.id), req.user.id);
  const idReceita = parseId(req.params.idReceita, "idReceita");
  await buscarReceitaVisivel(idReceita, req.user.id);
  await db.query(
    "INSERT INTO pasta_receita (id_pasta, id_receita) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [pasta.id_pasta, idReceita]
  );
  res.status(201).json({ mensagem: "Receita adicionada à pasta." });
});

router.delete("/:id/receitas/:idReceita", async (req, res) => {
  const pasta = await pastaDoUsuario(parseId(req.params.id), req.user.id);
  await db.query("DELETE FROM pasta_receita WHERE id_pasta = $1 AND id_receita = $2", [
    pasta.id_pasta,
    parseId(req.params.idReceita, "idReceita"),
  ]);
  res.json({ mensagem: "Receita removida da pasta." });
});

module.exports = router;
