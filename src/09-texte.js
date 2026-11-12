/* =====================================================================
   Outil Texte : sélectionner un texte de l'appli et proposer
   « remplacer par… ». La sélection est forcée même là où l'appli
   l'interdit (user-select: none), le temps de l'outil.
   ===================================================================== */
function outilTexte() {
  const c = outilOuvrir("texte", `<div id="tSurl"></div>
    <div class="barre bas" id="tBarre"><button type="button" class="btn petit" data-x="annuler">Annuler</button>
      <span class="tt"><b>Sélectionne le texte à changer</b><small id="tAide">${estLarge() ? "Glisse sur le texte avec la souris" : "Appui long sur un mot, puis étire la sélection"}</small></span>
      <button type="button" class="btn petit prim" data-x="prendre" disabled>Utiliser</button></div>
    <div class="consigne" id="tForm" hidden style="bottom:12px"></div>`);
  const style = document.createElement("style"); style.setAttribute("data-outil-debogage", "");
  style.textContent = "*{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}";
  document.head.appendChild(style); (OUTIL.nettoyer = OUTIL.nettoyer || []).push(() => style.remove());
  bloquerAppli(true);
  deplacable(c.querySelector("#tBarre"), "texte-barre"); deplacable(c.querySelector("#tForm"), "texte-formulaire");
  // la dernière sélection valable est gardée : toucher « Utiliser » efface souvent la sélection du téléphone
  let sel = null, choix = null;
  c.addEventListener("pointerdown", e => { if (e.target.closest("#tBarre button")) e.preventDefault(); });
  c.addEventListener("mousedown", e => { if (e.target.closest("#tBarre button")) e.preventDefault(); });
  const lire = () => {
    const s = document.getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return null;
    const t = s.toString().replace(/\s+/g, " ").trim(); if (!t) return null;
    const r = s.getRangeAt(0); let el = r.commonAncestorContainer; if (el.nodeType !== 1) el = el.parentElement;
    return { texte: t, el, rects: [...r.getClientRects()].slice(0, 20) };
  };
  surPage("selectionchange", () => {
    if (choix) return;
    const lu = lire(); if (!lu) return;
    sel = lu; const b = c.querySelector('[data-x="prendre"]'); if (b) b.disabled = !sel;
    c.querySelector("#tAide").textContent = sel ? "« " + tronquer(sel.texte, 60) + " »" : (estLarge() ? "Glisse sur le texte avec la souris" : "Appui long sur un mot, puis étire la sélection");
  });
  const formulaire = () => {
    const box = c.querySelector("#tForm"), s = choix = sel;
    c.querySelector("#tBarre").hidden = true;
    c.querySelector("#tSurl").innerHTML = s.rects.map(r => `<div class="surligne" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"></div>`).join("");
    try { document.getSelection().removeAllRanges(); } catch (e) {}
    box.innerHTML = `<small>Texte actuel</small><b>« ${esc(tronquer(s.texte, 200))} »</b>
      <small>Remplacer par (laisser vide pour signaler seulement)</small>
      <div class="rang"><input type="text" id="tNouv" value="${esc(s.texte.length < 160 ? s.texte : "")}" aria-label="Nouveau texte"><button type="button" class="btn" data-x="micro" aria-label="Dicter">${ICO.micro}</button></div>
      <div class="rang"><button type="button" class="btn" data-x="refaire" style="flex:1">Autre sélection</button><button type="button" class="btn prim" data-x="ok" style="flex:1.4">Ajouter à la note</button></div>`;
    box.hidden = false; const inp = box.querySelector("#tNouv"); setTimeout(() => { inp.focus({ preventScroll: true }); inp.select(); }, 30);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); box.querySelector('[data-x="ok"]').click(); } });
  };
  c.addEventListener("click", e => {
    const a = e.target.closest("[data-x]"); if (!a) return; const k = a.dataset.x;
    if (k === "annuler") return outilFermer();
    if (k === "prendre" && sel) return formulaire();
    if (k === "micro") return dicterDans(c.querySelector("#tNouv"));
    if (k === "refaire") { choix = sel = null; c.querySelector("#tForm").hidden = true; c.querySelector("#tBarre").hidden = false; c.querySelector("#tSurl").innerHTML = ""; const b = c.querySelector('[data-x="prendre"]'); b.hidden = false; b.disabled = true; c.querySelector("#tAide").textContent = estLarge() ? "Glisse sur le texte avec la souris" : "Appui long sur un mot, puis étire la sélection"; return; }
    if (k === "ok" && choix) {
      const sel = choix;
      if (DICT.mode === "consigne") dicteeArreter();
      const nouv = c.querySelector("#tNouv").value.trim();
      outilFermer({ type: "texte", texte: sel.texte, remplacement: nouv && nouv !== sel.texte ? nouv : "", element: selecteur(sel.el), dans: decrireCourt(sel.el) });
    }
  });
  echapFerme(() => outilFermer());
}
