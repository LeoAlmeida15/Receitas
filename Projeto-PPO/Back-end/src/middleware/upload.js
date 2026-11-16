const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { badRequest } = require("../errors");

fs.mkdirSync(config.uploadsDir, { recursive: true });

// A extensão vem do tipo MIME validado, nunca do nome enviado pelo usuário.
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString("hex") + EXT[file.mimetype]),
  }),
  limits: { fileSize: config.maxImageBytes, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(badRequest("A imagem deve ser JPG, PNG, WEBP ou GIF.")),
});

/** Remove do disco uma imagem enviada por upload (ignora URLs externas). */
function removerArquivo(imagemUrl) {
  if (!imagemUrl || !imagemUrl.startsWith("/uploads/")) return;
  const arquivo = path.join(config.uploadsDir, path.basename(imagemUrl));
  fs.unlink(arquivo, () => {});
}

module.exports = { upload: upload.single("imagem"), removerArquivo };
