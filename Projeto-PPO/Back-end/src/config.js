require("dotenv").config({ quiet: true });
const path = require("path");

const env = process.env.NODE_ENV || "development";

const config = {
  env,
  port: Number(process.env.PORT) || 3000,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://receitas:receitas@localhost:5432/receitas_db",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-nao-use-em-producao",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins: (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  publicUrl: (process.env.PUBLIC_URL || "").replace(/\/$/, ""),
  serveFrontend: (process.env.SERVE_FRONTEND || "true") !== "false",
  uploadsDir: path.join(__dirname, "..", "uploads"),
  frontendDir: path.join(__dirname, "..", "..", "Front-end"),
  maxImageBytes: 3 * 1024 * 1024,
  // Em testes o limite de requisições é desativado
  rateLimit: env !== "test",
};

if (env === "production" && config.jwtSecret === "dev-secret-nao-use-em-producao") {
  throw new Error("Defina JWT_SECRET no ambiente de produção.");
}

module.exports = config;
