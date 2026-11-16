document.addEventListener("DOMContentLoaded", () => {
  const $ = (x) => document.getElementById(x);
  const ROTULO = { culinaria: "👩‍🍳 Culinária", economia: "💰 Economia" };

  api("/dicas")
    .then(dicas => {
      $("dicas").innerHTML = dicas.map(d => `
        <article class="info-card">
          <span class="tag">${ROTULO[d.tipo] || escapeHtml(d.tipo)}</span>
          <h3>${escapeHtml(d.titulo)}</h3>
          <p>${escapeHtml(d.conteudo)}</p>
        </article>`).join("") || "<p>Nenhuma dica ainda.</p>";
    })
    .catch(e => $("dicas").innerHTML = `<p>${escapeHtml(e.message)}</p>`);

  async function ingredientes() {
    try {
      const lista = await api(`/ingredientes?busca=${encodeURIComponent($("buscaIng").value)}`);
      $("ingredientes").innerHTML = lista.length ? lista.map(i => `
        <article class="info-card">
          <h3>${escapeHtml(i.nome)}</h3>
          <p>${escapeHtml(i.descricao)}</p>
          ${i.conservacao ? `<p><strong>Conservação:</strong> ${escapeHtml(i.conservacao)}</p>` : ""}
          ${i.substituicao ? `<p><strong>Substituição:</strong> ${escapeHtml(i.substituicao)}</p>` : ""}
        </article>`).join("") : "<p>Nenhum ingrediente encontrado.</p>";
    } catch (e) { $("ingredientes").innerHTML = `<p>${escapeHtml(e.message)}</p>`; }
  }
  $("buscarIng").onclick = ingredientes;
  $("buscaIng").addEventListener("keydown", e => { if (e.key === "Enter") ingredientes(); });
  ingredientes();
});
