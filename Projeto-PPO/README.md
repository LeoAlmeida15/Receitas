# receitas-faceis

## Como executar

O projeto tem duas partes: `Front-end/` (HTML, CSS e JavaScript) e `Back-end/` (API em Node.js + PostgreSQL).
Instruções completas, lista de endpoints e testes em [`Back-end/README.md`](Back-end/README.md).

Resumo:

```bash
docker compose up -d            # PostgreSQL
cd Back-end && cp .env.example .env && npm install && npm run seed && npm start
# abra http://localhost:3000
```
