const db = require("./db");
const { notFound } = require("./errors");
const { urlImagem } = require("./utils");

// Colunas usadas nos cartões/listas de receitas
const COLUNAS_RECEITA = `
  r.id_receita, r.id_usuario, r.id_categoria, r.nome, r.descricao, r.ingredientes,
  r.modo_preparo, r.tempo_preparo, r.dificuldade, r.imagem_url, r.publica, r.criado_em, r.atualizado_em,
  c.nome AS categoria`;

const FROM_RECEITA = `FROM receita r LEFT JOIN categoria c ON c.id_categoria = r.id_categoria`;

/** Receita é visível se for pública ou pertencer ao usuário logado. $n = id do usuário (ou NULL). */
const visivel = (n) => `(r.publica OR r.id_usuario = $${n})`;

/** Formata a linha para a resposta da API. */
function serializar(req, row, extras = {}) {
  return { ...row, imagem_url: urlImagem(req, row.imagem_url), ...extras };
}

/** Busca uma receita visível ao usuário ou lança 404. */
async function buscarReceitaVisivel(id, userId) {
  const { rows } = await db.query(
    `SELECT ${COLUNAS_RECEITA} ${FROM_RECEITA} WHERE r.id_receita = $1 AND ${visivel(2)}`,
    [id, userId ?? null]
  );
  if (!rows[0]) throw notFound("Receita não encontrada.");
  return rows[0];
}

module.exports = { COLUNAS_RECEITA, FROM_RECEITA, visivel, serializar, buscarReceitaVisivel };
