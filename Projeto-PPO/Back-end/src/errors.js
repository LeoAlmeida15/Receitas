class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg) => new AppError(400, msg);
const unauthorized = (msg = "Faça login para continuar.") => new AppError(401, msg);
const forbidden = (msg = "Você não tem permissão para isso.") => new AppError(403, msg);
const notFound = (msg = "Recurso não encontrado.") => new AppError(404, msg);
const conflict = (msg) => new AppError(409, msg);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
