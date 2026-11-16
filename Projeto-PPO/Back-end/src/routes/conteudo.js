const router = require("express").Router();
const db = require("../db");
const { escapeLike } = require("../utils");

// RF08 – Dicas culinárias e de economia doméstica
router.get("/dicas", async (req, res) => {
  const tipo = String(req.query.tipo ?? "");
  const { rows } = await db.query(
    "SELECT id_dica, titulo, conteudo, tipo FROM dica WHERE ($1 = '' OR tipo = $1) ORDER BY id_dica",
    [tipo]
  );
  res.json(rows);
});

// RF09 – Informações sobre ingredientes
router.get("/ingredientes", async (req, res) => {
  const busca = String(req.query.busca ?? "").trim().slice(0, 80);
  const { rows } = await db.query(
    `SELECT id_ingrediente, nome, descricao, conservacao, substituicao
     FROM ingrediente_info WHERE nome ILIKE $1 ORDER BY nome`,
    [`%${escapeLike(busca)}%`]
  );
  res.json(rows);
});

module.exports = router;
