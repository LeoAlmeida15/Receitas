document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id");
  const area = document.getElementById("receita");
  if (!id) { area.innerHTML = "<p>Receita não informada.</p>"; return; }

  const logado = estaLogado();

  function htmlComentario(c) {
    return `
      <div class="comment">
        <strong>${escapeHtml(c.nome)} <small>${formatarData(c.data)}</small></strong>
        <span>${escapeHtml(c.comentario)}</span>
        ${c.meu ? `<button class="link-button" data-excluir-comentario="${c.id_comentario}">Excluir</button>` : ""}
      </div>`;
  }

  try {
    const r = await api(`/receitas/${id}`);
    document.title = `${r.nome} | Receitas Fáceis e Econômicas`;

    area.innerHTML = `
      <article class="recipe-detail">
        <span class="tag">${escapeHtml(r.categoria || "Receita")}</span>${r.publica === false ? " <small>🔒 Privada</small>" : ""}
        <h1>${escapeHtml(r.nome)}</h1>
        <p>${escapeHtml(r.descricao || "")}</p>
        ${r.imagem_url ? `<img class="recipe-photo" src="${escapeHtml(r.imagem_url)}" alt="${escapeHtml(r.nome)}">` : ""}
        <p><small>Por ${escapeHtml(r.autor)}</small></p>
        ${r.tempo_preparo ? `<p><strong>Tempo:</strong> ${r.tempo_preparo} minutos</p>` : ""}
        <p><strong>Dificuldade:</strong> ${escapeHtml(r.dificuldade)}</p>
        <div class="actions">
          <button class="btn favorite" id="favoritar"></button>
          ${r.pode_editar ? `
            <a class="btn secondary" href="nova-receita.html?id=${r.id_receita}">Editar</a>
            <button class="btn secondary" id="excluirReceita">Excluir</button>` : ""}
        </div>
        ${logado ? `
        <div class="actions" id="pastaBox">
          <select id="pastaSelect" aria-label="Escolher pasta"><option value="">Adicionar a uma pasta...</option></select>
          <button class="btn secondary" id="pastaAdd">Adicionar</button>
          <span id="pastaStatus" class="status"></span>
        </div>` : ""}
        <div class="recipe-columns">
          <section><h2>Ingredientes</h2><p>${escapeHtml(r.ingredientes).replace(/\n/g,"<br>")}</p></section>
          <section><h2>Modo de preparo</h2><p>${escapeHtml(r.modo_preparo).replace(/\n/g,"<br>")}</p></section>
        </div>
        <section style="margin-top:30px">
          <h2>Comentários</h2>
          <div id="comentarios">${r.comentarios?.length ? r.comentarios.map(htmlComentario).join("") : "<p>Nenhum comentário ainda.</p>"}</div>
          ${logado ? `
          <form id="comentarioForm" class="form-card">
            <label>Seu comentário<textarea id="comentarioTexto" rows="4" maxlength="1000" required></textarea></label>
            <button class="btn">Comentar</button>
            <p id="comentarioStatus" class="status"></p>
          </form>` : `<p><a href="login.html">Entre</a> para comentar.</p>`}
        </section>
      </article>`;

    // ----- favoritar / desfavoritar -----
    let favorito = r.favorito;
    const btnFav = document.getElementById("favoritar");
    const pintarFav = () => btnFav.textContent = favorito ? "♥ Salvo nos favoritos (remover)" : "♡ Salvar nos favoritos";
    pintarFav();
    btnFav.onclick = async () => {
      if (!estaLogado()) {
        alert("Faça login para salvar favoritos.");
        location.href = "login.html";
        return;
      }
      try {
        await api(`/favoritos/${id}`, { method: favorito ? "DELETE" : "POST" });
        favorito = !favorito;
        pintarFav();
      } catch (e) { alert(e.message); }
    };

    // ----- excluir receita -----
    const btnExcluir = document.getElementById("excluirReceita");
    if (btnExcluir) btnExcluir.onclick = async () => {
      if (!confirm("Excluir esta receita? Essa ação não pode ser desfeita.")) return;
      try {
        await api(`/receitas/${id}`, { method: "DELETE" });
        location.href = "minhas-receitas.html";
      } catch (e) { alert(e.message); }
    };

    // ----- pastas -----
    if (logado) {
      const select = document.getElementById("pastaSelect");
      const status = document.getElementById("pastaStatus");
      try {
        const pastas = await api("/pastas");
        select.innerHTML += pastas.map(p => `<option value="${p.id_pasta}">${escapeHtml(p.nome)}</option>`).join("");
        if (!pastas.length) status.innerHTML = '<a href="pastas.html">Crie sua primeira pasta</a>';
      } catch (e) { status.textContent = e.message; }
      document.getElementById("pastaAdd").onclick = async () => {
        if (!select.value) { status.textContent = "Escolha uma pasta."; return; }
        try {
          await api(`/pastas/${select.value}/receitas/${id}`, { method: "POST" });
          status.textContent = "Adicionada à pasta!";
        } catch (e) { status.textContent = e.message; }
      };
    }

    // ----- comentários -----
    const form = document.getElementById("comentarioForm");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const status = document.getElementById("comentarioStatus");
      try {
        await api("/comentarios", {
          method: "POST",
          body: { id_receita: Number(id), comentario: document.getElementById("comentarioTexto").value }
        });
        location.reload();
      } catch (err) { status.textContent = err.message; }
    };

    document.getElementById("comentarios").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-excluir-comentario]");
      if (!btn || !confirm("Excluir seu comentário?")) return;
      try {
        await api(`/comentarios/${btn.dataset.excluirComentario}`, { method: "DELETE" });
        location.reload();
      } catch (err) { alert(err.message); }
    });
  } catch (e) {
    area.innerHTML = `<p>${escapeHtml(e.message)}</p>`;
  }
});
