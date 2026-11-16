const router = require("express").Router();
const { z } = require("zod");
const db = require("../db");
const { validar } = require("../utils");

const schema = z.object({
  nome: z.string({ message: "Nome é obrigatório." }).trim().min(1, "Nome é obrigatório.").max(100, "Nome deve ter no máximo 100 caracteres."),
  email: z.string({ message: "E-mail é obrigatório." }).trim().max(255, "E-mail muito longo.").regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido."),
  mensagem: z.string({ message: "Mensagem é obrigatória." }).trim().min(1, "Mensagem é obrigatória.").max(2000, "A mensagem deve ter no máximo 2000 caracteres."),
});

router.post("/", async (req, res) => {
  const d = validar(schema, req.body);
  await db.query("INSERT INTO contato (nome, email, mensagem) VALUES ($1,$2,$3)", [d.nome, d.email, d.mensagem]);
  res.status(201).json({ mensagem: "Mensagem enviada com sucesso!" });
});

module.exports = router;
