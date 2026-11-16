const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const config = require("./config");
const { naoEncontrada, tratarErros } = require("./middleware/error");

const app = express();

if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(
  helmet({
    // As imagens de /uploads precisam ser carregáveis pelo front-end em outra origem (ex.: Live Server)
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https:", "http:"],
        "upgrade-insecure-requests": null, // permite http://localhost em desenvolvimento
      },
    },
  })
);

app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "100kb" }));

const limitar = (max, janelaMin) =>
  config.rateLimit
    ? rateLimit({
        windowMs: janelaMin * 60 * 1000,
        limit: max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
      })
    : (_req, _res, next) => next();

app.get("/api/saude", (_req, res) => res.json({ status: "ok" }));

app.use("/uploads", express.static(config.uploadsDir, { index: false, dotfiles: "deny", maxAge: "7d" }));

app.use("/api/auth", limitar(30, 15), require("./routes/auth"));
app.use("/api/categorias", require("./routes/categorias"));
app.use("/api/receitas", require("./routes/receitas"));
app.use("/api/favoritos", require("./routes/favoritos"));
app.use("/api/comentarios", require("./routes/comentarios"));
app.use("/api/contato", limitar(10, 15), require("./routes/contato"));
app.use("/api/pastas", require("./routes/pastas"));
app.use("/api", require("./routes/conteudo")); // /dicas e /ingredientes

// Qualquer rota /api desconhecida devolve JSON (não HTML)
app.use("/api", naoEncontrada);

// Front-end estático (http://localhost:3000)
if (config.serveFrontend && fs.existsSync(config.frontendDir)) {
  app.use(express.static(config.frontendDir));
}

app.use(naoEncontrada);
app.use(tratarErros);

module.exports = app;
