-- Esquema do banco de dados (PostgreSQL). Idempotente: pode rodar várias vezes.

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario  SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria SERIAL PRIMARY KEY,
  nome         VARCHAR(60) NOT NULL UNIQUE,
  descricao    VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS receita (
  id_receita    SERIAL PRIMARY KEY,
  id_usuario    INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE, -- NULL = receita do site
  id_categoria  INTEGER REFERENCES categoria(id_categoria) ON DELETE SET NULL,
  nome          VARCHAR(150) NOT NULL,
  descricao     VARCHAR(500),
  ingredientes  TEXT NOT NULL,
  modo_preparo  TEXT NOT NULL,
  tempo_preparo INTEGER CHECK (tempo_preparo IS NULL OR tempo_preparo > 0), -- minutos
  dificuldade   VARCHAR(10) NOT NULL DEFAULT 'Fácil' CHECK (dificuldade IN ('Fácil','Média','Difícil')),
  imagem_url    VARCHAR(500),
  publica       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Bancos criados antes do campo dificuldade
ALTER TABLE receita ADD COLUMN IF NOT EXISTS dificuldade VARCHAR(10) NOT NULL DEFAULT 'Fácil'
  CHECK (dificuldade IN ('Fácil','Média','Difícil'));

CREATE INDEX IF NOT EXISTS idx_receita_categoria ON receita(id_categoria);
CREATE INDEX IF NOT EXISTS idx_receita_usuario   ON receita(id_usuario);
CREATE INDEX IF NOT EXISTS idx_receita_criado    ON receita(criado_em DESC, id_receita DESC);

CREATE TABLE IF NOT EXISTS comentario (
  id_comentario SERIAL PRIMARY KEY,
  id_usuario    INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_receita    INTEGER NOT NULL REFERENCES receita(id_receita) ON DELETE CASCADE,
  comentario    VARCHAR(1000) NOT NULL,
  data          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comentario_receita ON comentario(id_receita);

CREATE TABLE IF NOT EXISTS favorito (
  id_favorito SERIAL PRIMARY KEY,
  id_usuario  INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_receita  INTEGER NOT NULL REFERENCES receita(id_receita) ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_usuario, id_receita)
);

-- Pastas pessoais para organizar receitas
CREATE TABLE IF NOT EXISTS pasta (
  id_pasta   SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  nome       VARCHAR(60) NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_usuario, nome)
);

CREATE TABLE IF NOT EXISTS pasta_receita (
  id_pasta   INTEGER NOT NULL REFERENCES pasta(id_pasta) ON DELETE CASCADE,
  id_receita INTEGER NOT NULL REFERENCES receita(id_receita) ON DELETE CASCADE,
  PRIMARY KEY (id_pasta, id_receita)
);

CREATE TABLE IF NOT EXISTS contato (
  id_contato SERIAL PRIMARY KEY,
  nome       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  mensagem   TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conteúdo editorial (RF08 e RF09)
CREATE TABLE IF NOT EXISTS dica (
  id_dica   SERIAL PRIMARY KEY,
  titulo    VARCHAR(120) NOT NULL UNIQUE,
  conteudo  TEXT NOT NULL,
  tipo      VARCHAR(30) NOT NULL DEFAULT 'culinaria' -- 'culinaria' | 'economia'
);

CREATE TABLE IF NOT EXISTS ingrediente_info (
  id_ingrediente SERIAL PRIMARY KEY,
  nome           VARCHAR(80) NOT NULL UNIQUE,
  descricao      TEXT NOT NULL,
  conservacao    VARCHAR(255),
  substituicao   VARCHAR(255)
);
