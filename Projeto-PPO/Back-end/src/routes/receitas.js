const router = require("express").Router();
const { z } = require("zod");
const db = require("../db");
const { auth, authOpcional } = require("../middleware/auth");
const { upload, removerArquivo } = require("../middleware/upload");
const { forbidden, notFound, badRequest } = require("../errors");
const { parseId, validar, escapeLike } = require("../utils");
const { COLUNAS_RECEITA, FROM_RECEITA, visivel, serializar, buscarReceitaVisivel } = require("../queries");

// ---------- validação ----------
const campoTexto = (rotulo, max, { obrigatorio = false, parcial = false } = {}) => {
  const base = z
    .string({ message: `${rotulo} inválido.` })
    .max(max, `${rotulo} deve ter no máximo ${max} caracteres.`);
  if (obrigatorio && !parcial) {
    return z.preprocess((v) => (v == null ? "" : String(v).trim()), base.min(1, `${rotulo} é obrigatório.`));
  }
  const inner = obrigatorio ? base.min(1, `${rotulo} não pode ficar vazio.`) : base;
  return z.preprocess((v) => (v == null ? undefined : String(v).trim()), inner.optional());
};

const campoInt = (rotulo, min, max) =>
  z.preprocess(
    (v) => (v === undefined ? undefined : v === null || v === "" ? null : Number(v)),
    z
      .number({ message: `${rotulo} inválido.` })
      .int(`${rotulo} deve ser um número inteiro.`)
      .min(min, `${rotulo} deve ser pelo menos ${min}.`)
      .max(max, `${rotulo} deve ser no máximo ${max}.`)
      .nullable()
      .optional()
  );

const campoDificuldade = z.preprocess(
  (v) => (v == null || v === "" ? undefined : String(v).trim()),
  z.enum(["Fácil", "Média", "Difícil"], { message: "Dificuldade deve ser Fácil, Média ou Difícil." }).optional()
);

const campoBool = (rotulo) =>
  z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === true || v === "true" || v === "1" || v === "on") return true;
      if (v === false || v === "false" || v === "0" || v === "") return false;
      return v;
    },
    z.boolean({ message: `${rotulo} inválido.` }).optional()
  );

const esquemaReceita = (parcial) =>
  z.object({
    nome: campoTexto("Nome", 150, { obrigatorio: true, parcial }),
    descricao: campoTexto("Descrição", 500),
    ingredientes: campoTexto("Ingredientes", 10000, { obrigatorio: true, parcial }),
    modo_preparo: campoTexto("Modo de preparo", 20000, { obrigatorio: true, parcial }),
    tempo_preparo: campoInt("Tempo de preparo", 1, 10080),
    dificuldade: campoDificuldade,
    id_categoria: campoInt("Categoria", 1, 2147483647),
    publica: campoBool("Visibilidade"),
    imagem_url: z.preprocess(
      (v) => (v == null ? undefined : String(v).trim()),
      z
        .string()
        .max(500, "O link da imagem deve ter no máximo 500 caracteres.")
        .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Link da imagem inválido (use http:// ou https://).")
        .optional()
    ),
    remover_imagem: campoBool("remover_imagem"),
  });

// ---------- listagem ----------
router.get("/", authOpcional, async (req, res) => {
  const userId = req.user?.id ?? null;
  const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(50, Math.max(1, parseInt(req.query.limite, 10) || 9));

  const params = [userId];
  const where = [visivel(1)];

  const busca = String(req.query.busca ?? "").trim().slice(0, 100);
  if (busca) {
    params.push(`%${escapeLike(busca)}%`);
    const n = params.length;
    where.push(`(r.nome ILIKE $${n} OR r.descricao ILIKE $${n} OR r.ingredientes ILIKE $${n} OR c.nome ILIKE $${n})`);
  }
  if (req.query.categoria) {
    params.push(parseId(req.query.categoria, "categoria"));
    where.push(`r.id_categoria = $${params.length}`);
  }
  const condicao = where.join(" AND ");

  const total = (await db.query(`SELECT COUNT(*)::int AS n ${FROM_RECEITA} WHERE ${condicao}`, params)).rows[0].n;
  const { rows } = await db.query(
    `SELECT ${COLUNAS_RECEITA} ${FROM_RECEITA} WHERE ${condicao}
     ORDER BY r.criado_em DESC, r.id_receita DESC
     LIMIT ${limite} OFFSET ${(pagina - 1) * limite}`,
    params
  );
  res.json({ receitas: rows.map((r) => serializar(req, r)), total, pagina, limite });
});

// Receitas do próprio usuário (públicas e privadas). Declarada antes de "/:id".
router.get("/minhas", auth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${COLUNAS_RECEITA} ${FROM_RECEITA} WHERE r.id_usuario = $1
     ORDER BY r.atualizado_em DESC, r.id_receita DESC`,
    [req.user.id]
  );
  res.json(rows.map((r) => serializar(req, r)));
});

// ---------- detalhe ----------
router.get("/:id", authOpcional, async (req, res) => {
  const id = parseId(req.params.id);
  const userId = req.user?.id ?? null;
  const receita = await buscarReceitaVisivel(id, userId);

  const [coment, fav, autor] = await Promise.all([
    db.query(
      `SELECT c.id_comentario, c.id_usuario, u.nome, c.comentario, c.data
       FROM comentario c JOIN usuario u ON u.id_usuario = c.id_usuario
       WHERE c.id_receita = $1 ORDER BY c.data ASC, c.id_comentario ASC`,
      [id]
    ),
    userId
      ? db.query("SELECT 1 FROM favorito WHERE id_usuario = $1 AND id_receita = $2", [userId, id])
      : { rowCount: 0 },
    receita.id_usuario
      ? db.query("SELECT nome FROM usuario WHERE id_usuario = $1", [receita.id_usuario])
      : { rows: [] },
  ]);

  res.json(
    serializar(req, receita, {
      autor: autor.rows[0]?.nome ?? "Receitas Fáceis",
      favorito: fav.rowCount > 0,
      pode_editar: userId !== null && receita.id_usuario === userId,
      comentarios: coment.rows.map((c) => ({ ...c, meu: userId !== null && c.id_usuario === userId })),
    })
  );
});

// ---------- criação / edição / exclusão ----------
// Aceita JSON ou multipart/form-data (campo de arquivo: "imagem").
router.post("/", auth, upload, async (req, res) => {
  const arquivo = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const d = validar(esquemaReceita(false), req.body);
    const imagem = arquivo ?? (d.imagem_url || null);

    const { rows } = await db.query(
      `INSERT INTO receita (id_usuario, id_categoria, nome, descricao, ingredientes, modo_preparo,
                            tempo_preparo, imagem_url, publica, dificuldade)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id_receita`,
      [
        req.user.id,
        d.id_categoria ?? null,
        d.nome,
        d.descricao || null,
        d.ingredientes,
        d.modo_preparo,
        d.tempo_preparo ?? null,
        imagem,
        d.publica ?? true,
        d.dificuldade ?? "Fácil",
      ]
    );
    const receita = await buscarReceitaVisivel(rows[0].id_receita, req.user.id);
    res.status(201).json(serializar(req, receita));
  } catch (err) {
    removerArquivo(arquivo); // não deixa arquivo órfão se a validação/consulta falhar
    throw err;
  }
});

router.put("/:id", auth, upload, async (req, res) => {
  const arquivo = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const id = parseId(req.params.id);
    const atual = (await db.query("SELECT id_usuario, imagem_url FROM receita WHERE id_receita = $1", [id])).rows[0];
    if (!atual) throw notFound("Receita não encontrada.");
    if (atual.id_usuario !== req.user.id) throw forbidden("Você só pode editar suas próprias receitas.");

    const d = validar(esquemaReceita(true), req.body);

    const sets = [];
    const params = [];
    const set = (coluna, valor) => {
      params.push(valor);
      sets.push(`${coluna} = $${params.length}`);
    };

    if (d.nome !== undefined) set("nome", d.nome);
    if (d.descricao !== undefined) set("descricao", d.descricao || null);
    if (d.ingredientes !== undefined) set("ingredientes", d.ingredientes);
    if (d.modo_preparo !== undefined) set("modo_preparo", d.modo_preparo);
    if (d.tempo_preparo !== undefined) set("tempo_preparo", d.tempo_preparo);
    if (d.id_categoria !== undefined) set("id_categoria", d.id_categoria);
    if (d.publica !== undefined) set("publica", d.publica);
    if (d.dificuldade !== undefined) set("dificuldade", d.dificuldade);

    let imagemMudou = false;
    if (arquivo) {
      set("imagem_url", arquivo);
      imagemMudou = true;
    } else if (d.remover_imagem) {
      set("imagem_url", null);
      imagemMudou = true;
    } else if (d.imagem_url !== undefined) {
      set("imagem_url", d.imagem_url || null);
      imagemMudou = true;
    }

    if (!sets.length) throw badRequest("Nenhum campo para atualizar.");
    sets.push("atualizado_em = now()");
    params.push(id);
    await db.query(`UPDATE receita SET ${sets.join(", ")} WHERE id_receita = $${params.length}`, params);

    if (imagemMudou) removerArquivo(atual.imagem_url);

    const receita = await buscarReceitaVisivel(id, req.user.id);
    res.json(serializar(req, receita));
  } catch (err) {
    removerArquivo(arquivo);
    throw err;
  }
});

router.delete("/:id", auth, async (req, res) => {
  const id = parseId(req.params.id);
  const atual = (await db.query("SELECT id_usuario, imagem_url FROM receita WHERE id_receita = $1", [id])).rows[0];
  if (!atual) throw notFound("Receita não encontrada.");
  if (atual.id_usuario !== req.user.id) throw forbidden("Você só pode excluir suas próprias receitas.");

  await db.query("DELETE FROM receita WHERE id_receita = $1", [id]);
  removerArquivo(atual.imagem_url);
  res.json({ mensagem: "Receita excluída." });
});

module.exports = router;
