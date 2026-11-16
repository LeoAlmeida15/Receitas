const router = require("express").Router();
const { z } = require("zod");
const db = require("../db");
const { auth } = require("../middleware/auth");
const { notFound, forbidden } = require("../errors");
const { parseId, validar } = require("../utils");
const { buscarReceitaVisivel } = require("../queries");

const schema = z.object({
  id_receita: z.coerce.number({ message: "Receita inválida." }).int("Receita inválida.").positive("Receita inválida."),
  comentario: z.string({ message: "Escreva um comentário." }).trim().min(1, "Escreva um comentário.").max(1000, "O comentário deve ter no máximo 1000 caracteres."),
});

router.post("/", auth, async (req, res) => {
  const d = validar(schema, req.body);
  parseId(d.id_receita, "id_receita");
  await buscarReceitaVisivel(d.id_receita, req.user.id);
  const { rows } = await db.query(
    `INSERT INTO comentario (id_usuario, id_receita, comentario) VALUES ($1,$2,$3)
     RETURNING id_comentario, id_receita, comentario, data`,
    [req.user.id, d.id_receita, d.comentario]
  );
  res.status(201).json({ ...rows[0], nome: req.user.nome, meu: true });
});

router.delete("/:id", auth, async (req, res) => {
  const id = parseId(req.params.id);
  const c = (await db.query("SELECT id_usuario FROM comentario WHERE id_comentario = $1", [id])).rows[0];
  if (!c) throw notFound("Comentário não encontrado.");
  if (c.id_usuario !== req.user.id) throw forbidden("Você só pode excluir seus próprios comentários.");
  await db.query("DELETE FROM comentario WHERE id_comentario = $1", [id]);
  res.json({ mensagem: "Comentário excluído." });
});

module.exports = router;
