document.addEventListener("DOMContentLoaded", async () => {
  if (!exigirLogin()) return;

  const id = new URLSearchParams(location.search).get("id");
  const status = document.getElementById("status");
  const $ = (x) => document.getElementById(x);

  // categorias
  try {
    const cats = await api("/categorias");
    $("categoria").innerHTML += cats.map(c => `<option value="${c.id_categoria}">${escapeHtml(c.nome)}</option>`).join("");
  } catch (e) { status.textContent = e.message; }

  // modo edição: preenche o formulário
  if (id) {
    $("titulo").textContent = "Editar receita";
    document.title = "Editar receita | Receitas Fáceis e Econômicas";
    try {
      const r = await api(`/receitas/${id}`);
      if (!r.pode_editar) { location.href = `receita.html?id=${id}`; return; }
      $("nome").value = r.nome;
      $("descricao").value = r.descricao || "";
      $("categoria").value = r.id_categoria || "";
      $("tempo").value = r.tempo_preparo || "";
      $("dificuldade").value = r.dificuldade;
      $("ingredientes").value = r.ingredientes;
      $("modo").value = r.modo_preparo;
      $("publica").checked = r.publica;
      if (r.imagem_url) {
        $("preview").src = r.imagem_url;
        $("imagemAtual").classList.remove("hidden");
      }
    } catch (e) { status.textContent = e.message; return; }
  }

  // validação de tamanho no cliente (o servidor também valida)
  $("imagem").onchange = () => {
    const f = $("imagem").files[0];
    if (f && f.size > 3 * 1024 * 1024) {
      status.textContent = "A imagem deve ter no máximo 3 MB.";
      $("imagem").value = "";
    } else if (f) {
      status.textContent = "";
      $("preview").src = URL.createObjectURL(f);
      $("imagemAtual").classList.remove("hidden");
    }
  };

  $("receitaForm").onsubmit = async (e) => {
    e.preventDefault();
    status.textContent = "";
    const btn = $("salvar");
    btn.disabled = true;

    const fd = new FormData();
    fd.append("nome", $("nome").value);
    fd.append("descricao", $("descricao").value);
    fd.append("id_categoria", $("categoria").value);
    fd.append("tempo_preparo", $("tempo").value);
    fd.append("dificuldade", $("dificuldade").value);
    fd.append("ingredientes", $("ingredientes").value);
    fd.append("modo_preparo", $("modo").value);
    fd.append("publica", $("publica").checked ? "true" : "false");
    if ($("imagem").files[0]) fd.append("imagem", $("imagem").files[0]);
    if (id && $("removerImagem").checked) fd.append("remover_imagem", "true");

    try {
      const r = await api(id ? `/receitas/${id}` : "/receitas", { method: id ? "PUT" : "POST", body: fd });
      location.href = `receita.html?id=${r.id_receita}`;
    } catch (err) {
      status.textContent = err.message;
      btn.disabled = false;
    }
  };
});
