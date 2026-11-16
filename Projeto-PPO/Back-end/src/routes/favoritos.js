const router = require("express").Router();
const db = require("../db");
const { auth } = require("../middleware/auth");
const { parseId } = require("../utils");
const { COLUNAS_RECEITA, FROM_RECEITA, visivel, serializar, buscarReceitaVisivel } = require("../queries");

router.use(auth);

// Lista as receitas favoritas (mesmo formato dos cartões de receita)
router.get("/", async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${COLUNAS_RECEITA}
     ${FROM_RECEITA} JOIN favorito f ON f.id_receita = r.id_receita
     WHERE f.id_usuario = $1 AND ${visivel(1)}
     ORDER BY f.criado_em DESC, f.id_favorito DESC`,
    [req.user.id]
  );
  res.json(rows.map((r) => serializar(req, r)));
});

router.post("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  await buscarReceitaVisivel(id, req.user.id);
  await db.query(
    "INSERT INTO favorito (id_usuario, id_receita) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [req.user.id, id]
  );
  res.status(201).json({ mensagem: "Receita salva nos favoritos." });
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  await db.query("DELETE FROM favorito WHERE id_usuario = $1 AND id_receita = $2", [req.user.id, id]);
  res.json({ mensagem: "Receita removida dos favoritos." });
});

module.exports = router;
