document.addEventListener("DOMContentLoaded", async () => {
  if (!exigirLogin()) return;

  const $ = (x) => document.getElementById(x);
  const pastaId = new URLSearchParams(location.search).get("id");

  // ---------- lista de pastas ----------
  async function listar() {
    try {
      const pastas = await api("/pastas");
      $("pastas").innerHTML = pastas.length
        ? pastas.map(p => `
            <a class="category-card" href="pastas.html?id=${p.id_pasta}">
              <h2>📁 ${escapeHtml(p.nome)}</h2>
              <small>${p.quantidade_receitas} receita(s)</small>
            </a>`).join("")
        : "<p>Você ainda não criou pastas.</p>";
    } catch (e) { $("pastas").innerHTML = `<p>${escapeHtml(e.message)}</p>`; }
  }

  // ---------- conteúdo de uma pasta ----------
  async function abrir(id) {
    $("listaView").classList.add("hidden");
    $("detalheView").classList.remove("hidden");
    let pasta;
    try {
      pasta = await api(`/pastas/${id}`);
    } catch (e) {
      $("detalheView").innerHTML = `<p>${escapeHtml(e.message)} <a href="pastas.html">Voltar</a></p>`;
      return;
    }
    const renderizar = () => {
      $("pastaTitulo").textContent = pasta.nome;
      $("pastaReceitas").innerHTML = pasta.receitas.length
        ? pasta.receitas.map(r => `
            <div>
              ${receitaCard(r)}
              <div class="actions"><button class="btn secondary" data-remover="${r.id_receita}">Remover da pasta</button></div>
            </div>`).join("")
        : '<p>Pasta vazia. Abra uma receita e use "Adicionar a uma pasta".</p>';
    };
    renderizar();

    $("pastaReceitas").addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-remover]");
      if (!btn) return;
      try {
        await api(`/pastas/${id}/receitas/${btn.dataset.remover}`, { method: "DELETE" });
        pasta.receitas = pasta.receitas.filter(r => String(r.id_receita) !== btn.dataset.remover);
        renderizar();
      } catch (err) { alert(err.message); }
    });

    $("renomear").onclick = async () => {
      const nome = prompt("Novo nome da pasta:", pasta.nome);
      if (!nome || nome.trim() === pasta.nome) return;
      try {
        const r = await api(`/pastas/${id}`, { method: "PUT", body: { nome } });
        pasta.nome = r.nome;
        renderizar();
      } catch (err) { alert(err.message); }
    };

    $("excluirPasta").onclick = async () => {
      if (!confirm("Excluir esta pasta? As receitas não serão apagadas.")) return;
      try {
        await api(`/pastas/${id}`, { method: "DELETE" });
        location.href = "pastas.html";
      } catch (err) { alert(err.message); }
    };
  }

  if (pastaId) { abrir(pastaId); return; }

  $("pastaForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/pastas", { method: "POST", body: { nome: $("pastaNome").value } });
      $("pastaNome").value = "";
      $("pastaStatus").textContent = "";
      listar();
    } catch (err) { $("pastaStatus").textContent = err.message; }
  };
  listar();
});
