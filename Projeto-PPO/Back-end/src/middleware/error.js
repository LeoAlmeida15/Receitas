const { AppError } = require("../errors");

function naoEncontrada(_req, _res, next) {
  next(new AppError(404, "Rota não encontrada."));
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, _req, res, _next) {
  if (err instanceof AppError) return res.status(err.status).json({ erro: err.message });

  if (err.name === "MulterError") {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "A imagem deve ter no máximo 3 MB." : "Erro no envio da imagem.";
    return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ erro: msg });
  }
  if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido." });
  if (err.type === "entity.too.large") return res.status(413).json({ erro: "Requisição muito grande." });

  // Violações de integridade do PostgreSQL
  if (err.code === "23505") return res.status(409).json({ erro: "Registro já existe." });
  if (err.code === "23503") return res.status(400).json({ erro: "Referência inválida (registro relacionado não existe)." });

  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
}

module.exports = { naoEncontrada, tratarErros };
