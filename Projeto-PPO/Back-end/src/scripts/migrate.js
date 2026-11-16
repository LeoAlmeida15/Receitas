// Uso: npm run migrate           -> cria/atualiza as tabelas
//      npm run seed              -> cria as tabelas e insere categorias, receitas, dicas e ingredientes de exemplo
const fs = require("fs");
const path = require("path");
const { pool } = require("../db");

async function rodar(arquivo) {
  const sql = fs.readFileSync(path.join(__dirname, "..", "..", "database", arquivo), "utf8");
  await pool.query(sql);
  console.log(`✔ ${arquivo} executado`);
}

(async () => {
  try {
    await rodar("schema.sql");
    if (process.argv.includes("--seed")) await rodar("seed.sql");
  } catch (err) {
    console.error("Falha na migração:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
