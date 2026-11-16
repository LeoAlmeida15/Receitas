document.addEventListener("DOMContentLoaded", () => {
  const loginLink = document.getElementById("loginLink");
  const logoutBtn = document.getElementById("logoutBtn");
  const logado = estaLogado();

  if (logado) {
    if (loginLink) loginLink.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
  }

  // Links extras do menu (Dicas para todos; área do usuário só para quem está logado)
  const nav = document.querySelector(".header nav");
  if (nav) {
    const extras = [["Dicas", "dicas.html"]];
    if (logado) {
      extras.push(["Minhas receitas", "minhas-receitas.html"], ["Pastas", "pastas.html"], ["Favoritos", "favoritos.html"]);
    }
    const ref = loginLink || logoutBtn || null;
    extras.forEach(([texto, href]) => {
      if (nav.querySelector(`a[href="${href}"]`)) return;
      const a = document.createElement("a");
      a.href = href;
      a.textContent = texto;
      nav.insertBefore(a, ref);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "index.html";
    });
  }

  const destaques = document.getElementById("destaques");
  if (destaques) {
    api("/receitas?limite=6")
      .then(data => {
        destaques.innerHTML = data.receitas.length
          ? data.receitas.map(receitaCard).join("")
          : "<p>Nenhuma receita cadastrada ainda.</p>";
      })
      .catch(err => destaques.innerHTML = `<p>${escapeHtml(err.message)}</p>`);
  }
});
