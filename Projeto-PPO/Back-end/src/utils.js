const { badRequest } = require("./errors");
const config = require("./config");

/** Valida :id numérico positivo (evita erro do PostgreSQL com valores absurdos). */
function parseId(value, nome = "id") {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 2147483647) {
    throw badRequest(`Parâmetro ${nome} inválido.`);
  }
  return n;
}

/** Valida o corpo com um schema zod e devolve a primeira mensagem de erro em português. */
function validar(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message || "Dados inválidos.");
  }
  return result.data;
}

/** Escapa curingas do LIKE para a busca tratar o texto literalmente. */
function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&");
}

/** Transforma "/uploads/x.jpg" em URL absoluta; mantém URLs externas. */
function urlImagem(req, valor) {
  if (!valor) return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  const base = config.publicUrl || `${req.protocol}://${req.get("host")}`;
  return base + valor;
}

module.exports = { parseId, validar, escapeLike, urlImagem };
