const jwt = require("jsonwebtoken");
const config = require("../config");
const { unauthorized } = require("../errors");

function lerToken(req) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");
  return tipo === "Bearer" && token ? token : null;
}

function decodificar(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return { id: Number(payload.sub), nome: payload.nome };
  } catch {
    return null;
  }
}

/** Exige usuário autenticado. Preenche req.user = { id, nome }. */
function auth(req, _res, next) {
  const token = lerToken(req);
  const user = token && decodificar(token);
  if (!user) return next(unauthorized("Sessão inválida ou expirada. Faça login novamente."));
  req.user = user;
  next();
}

/** Autenticação opcional: preenche req.user se houver token válido. */
function authOpcional(req, _res, next) {
  const token = lerToken(req);
  req.user = (token && decodificar(token)) || null;
  next();
}

function gerarToken(usuario) {
  return jwt.sign({ nome: usuario.nome }, config.jwtSecret, {
    subject: String(usuario.id_usuario),
    expiresIn: config.jwtExpiresIn,
  });
}

module.exports = { auth, authOpcional, gerarToken };
