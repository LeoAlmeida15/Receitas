const app = require("./app");
const config = require("./config");
const { pool } = require("./db");

const server = app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}/api`);
  if (config.serveFrontend) console.log(`Site em http://localhost:${config.port}`);
});

function encerrar() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
