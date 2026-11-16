const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const db = require("../db");
const { auth, gerarToken } = require("../middleware/auth");
const { conflict, unauthorized, notFound } = require("../errors");
const { validar } = require("../utils");

const email = z
  .string({ message: "E-mail é obrigatório." })
  .trim()
  .toLowerCase()
  .max(255, "E-mail muito longo.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido.");

const cadastroSchema = z.object({
  nome: z.string({ message: "Nome é obrigatório." }).trim().min(1, "Nome é obrigatório.").max(100, "Nome deve ter no máximo 100 caracteres."),
  email,
  // bcrypt só considera os primeiros 72 bytes
  senha: z.string({ message: "Senha é obrigatória." }).min(6, "A senha deve ter pelo menos 6 caracteres.").max(72, "A senha deve ter no máximo 72 caracteres."),
});

const loginSchema = z.object({
  email,
  senha: z.string({ message: "Senha é obrigatória." }).min(1, "Senha é obrigatória.").max(72, "E-mail ou senha inválidos."),
});

// Hash fictício usado para gastar o mesmo tempo quando o e-mail não existe
const HASH_FALSO = bcrypt.hashSync("senha-falsa", 10);

const publico = (u) => ({ id_usuario: u.id_usuario, nome: u.nome, email: u.email });

router.post("/cadastro", async (req, res) => {
  const d = validar(cadastroSchema, req.body);
  const hash = await bcrypt.hash(d.senha, 10);
  try {
    const { rows } = await db.query(
      "INSERT INTO usuario (nome, email, senha_hash) VALUES ($1,$2,$3) RETURNING id_usuario, nome, email",
      [d.nome, d.email, hash]
    );
    res.status(201).json({ usuario: publico(rows[0]) });
  } catch (err) {
    if (err.code === "23505") throw conflict("Este e-mail já está cadastrado.");
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const d = validar(loginSchema, req.body);
  const { rows } = await db.query("SELECT * FROM usuario WHERE email = $1", [d.email]);
  const usuario = rows[0];
  const ok = await bcrypt.compare(d.senha, usuario ? usuario.senha_hash : HASH_FALSO);
  if (!usuario || !ok) throw unauthorized("E-mail ou senha inválidos.");
  res.json({ token: gerarToken(usuario), usuario: publico(usuario) });
});

router.get("/me", auth, async (req, res) => {
  const { rows } = await db.query("SELECT id_usuario, nome, email FROM usuario WHERE id_usuario = $1", [req.user.id]);
  if (!rows[0]) throw notFound("Usuário não encontrado.");
  res.json(rows[0]);
});

module.exports = router;
