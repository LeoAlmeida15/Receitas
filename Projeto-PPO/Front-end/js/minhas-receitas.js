document.addEventListener("DOMContentLoaded", async () => {
  if (!exigirLogin()) return;
  const area = document.getElementById("minhas");

  async function carregar() {
    try {
      const receitas = await api("/receitas/minhas");
      area.innerHTML = receitas.length
        ? receitas.map(r => `
            <div>
              ${receitaCard(r)}
              <div class="actions">
                <a class="btn secondary" href="nova-receita.html?id=${r.id_receita}">Editar</a>
                <button class="btn secondary" data-excluir="${r.id_receita}">Excluir</button>
              </div>
            </div>`).join("")
        : '<p>Você ainda não cadastrou receitas. <a href="nova-receita.html">Cadastrar a primeira</a></p>';
    } catch (e) { area.innerHTML = `<p>${escapeHtml(e.message)}</p>`; }
  }

  area.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-excluir]");
    if (!btn || !confirm("Excluir esta receita? Essa ação não pode ser desfeita.")) return;
    try {
      await api(`/receitas/${btn.dataset.excluir}`, { method: "DELETE" });
      carregar();
    } catch (err) { alert(err.message); }
  });

  carregar();
});
