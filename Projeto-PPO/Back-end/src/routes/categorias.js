const router = require("express").Router();
const db = require("../db");

router.get("/", async (_req, res) => {
  const { rows } = await db.query(
    `SELECT c.id_categoria, c.nome, c.descricao,
            COUNT(r.id_receita) FILTER (WHERE r.publica)::int AS quantidade_receitas
     FROM categoria c LEFT JOIN receita r ON r.id_categoria = c.id_categoria
     GROUP BY c.id_categoria ORDER BY c.id_categoria`
  );
  res.json(rows);
});

module.exports = router;
