// Se o site for aberto pelo próprio backend (http://localhost:3000) ou estiver publicado,
// usa a mesma origem. Se for aberto por outro servidor (ex.: Live Server) usa localhost:3000.
// Para forçar outro endereço, defina window.API_URL antes de carregar este arquivo.
const API_URL =
  window.API_URL ||
  (location.protocol.startsWith("http") &&
  (location.port === "3000" || !["localhost", "127.0.0.1"].includes(location.hostname))
    ? location.origin + "/api"
    : "http://localhost:3000/api");

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const ehFormData = options.body instanceof FormData;

  // FormData (upload de imagem) é enviado como está; o navegador define o Content-Type.
  if (options.body && !ehFormData && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(API_URL + path, { ...options, headers });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
  }
  const data = await response.json().catch(() => ({}));

  // Sessão expirada: limpa o login e volta para a tela de entrada
  if (response.status === 401 && token && !path.startsWith("/auth/")) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    location.href = "login.html";
  }

  if (!response.ok) {
    throw new Error(data.erro || "Não foi possível concluir a operação.");
  }
  return data;
}

function estaLogado() {
  return !!localStorage.getItem("token");
}

// Para páginas que exigem login
function exigirLogin() {
  if (!estaLogado()) {
    location.href = "login.html";
    return false;
  }
  return true;
}

function formatarData(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("pt-BR");
}

function escapeHtml(text = "") {
  return String(text ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function receitaCard(r) {
  return `
    <article class="recipe-card">
      <div class="thumb">${r.imagem_url ? `<img src="${escapeHtml(r.imagem_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : "🍲"}</div>
      <div class="content">
        <span class="tag">${escapeHtml(r.categoria || "Receita")}</span>${r.publica === false ? ' <small>🔒 Privada</small>' : ""}
        <h3><a href="receita.html?id=${r.id_receita}">${escapeHtml(r.nome)}</a></h3>
        <p>${escapeHtml(r.descricao || "Receita fácil e econômica.")}</p>
        ${r.tempo_preparo ? `<small>⏱ ${r.tempo_preparo} min</small>` : ""}${r.dificuldade ? ` <small>• ${escapeHtml(r.dificuldade)}</small>` : ""}
      </div>
    </article>`;
}
