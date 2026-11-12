/* =====================================================================
   Outil Élément : désigner un bouton, un bloc, une image…
   Survol (ordinateur) ou toucher (téléphone) → l'élément s'encadre.
   « ↑ Parent » pour élargir. La note retient son sélecteur CSS, son
   texte, sa taille, sa police, ses couleurs et le contraste.
   ===================================================================== */
function bloquerAppli(garderPointeur) {
  // pendant l'outil, l'appli ne réagit pas aux clics (on ne veut pas déclencher d'action).
  // garderPointeur (outil Texte) : la sélection native du téléphone doit rester possible,
  // donc on laisse passer l'appui long (contextmenu) et on n'empêche que les actions de l'appli.
  const stop = e => { if (deMoiEvt(e)) return; e.stopPropagation(); e.stopImmediatePropagation(); if (e.type === "click" || e.type === "submit" || (e.type === "contextmenu" && !garderPointeur)) e.preventDefault(); };
  ["click", "dblclick", "contextmenu", "submit", "mousedown", "mouseup", "touchstart", "touchend", "keydown"].forEach(t => surPage(t, ev => { if (t === "keydown" && ev.key === "Escape") return; stop(ev); }, true));
  if (!garderPointeur) ["pointerdown", "pointerup"].forEach(t => surPage(t, ev => { if (!deMoiEvt(ev)) ev.stopPropagation(); }, true));
}
function placerCadre(cadre, el, etiquette) {
  if (!el) { cadre.hidden = true; return; }
  const r = el.getBoundingClientRect();
  Object.assign(cadre.style, { left: r.left - 2 + "px", top: r.top - 2 + "px", width: r.width + 4 + "px", height: r.height + 4 + "px" });
  cadre.hidden = false; cadre.classList.toggle("bas", r.top < 40);
  cadre.querySelector(".etq").textContent = etiquette || (decrireCourt(el) + " · " + Math.round(r.width) + "×" + Math.round(r.height));
}

function outilElement() {
  const c = outilOuvrir("element", `
    <div class="cadre" id="cadre" hidden><span class="etq"></span></div>
    <div class="barre haut"><button type="button" class="btn petit" data-e="annuler">Annuler</button>
      <span class="tt"><b>Touche l'élément à signaler</b><small>${estLarge() ? "Survole puis clique · ↑ pour le bloc parent · Entrée pour choisir" : "Touche un bouton, un texte, une image…"}</small></span></div>
    <div class="barre bas" id="eChoix" hidden><span class="tt" style="min-width:0"><b id="eNom" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></b><small id="eSel" class="mono coupe-debut"></small></span>
      <button type="button" class="btn petit" data-e="parent" title="Élargir au bloc qui le contient">↑ Parent</button>
      <button type="button" class="btn petit" data-e="enfant" title="Revenir à l'élément intérieur">↓</button>
      <button type="button" class="btn petit prim" data-e="ok">Choisir</button></div>`);
  const cadre = c.querySelector("#cadre"); let survol = null, choisi = null; const pile = [];
  deplacable(c.querySelector(".barre.haut"), "element-haut"); deplacable(c.querySelector("#eChoix"), "element-choix");
  bloquerAppli(false);
  const montrerChoix = () => {
    placerCadre(cadre, choisi);
    c.querySelector("#eChoix").hidden = !choisi; if (!choisi) return;
    const r = choisi.getBoundingClientRect();
    c.querySelector("#eNom").textContent = decrireCourt(choisi) + " · " + Math.round(r.width) + "×" + Math.round(r.height) + " px";
    c.querySelector("#eSel").textContent = selecteur(choisi);
    c.querySelector('[data-e="enfant"]').disabled = !pile.length;
  };
  let p0 = null;
  surPage("pointermove", e => { if (deMoiEvt(e) || e.pointerType !== "mouse" || choisi) return; survol = elementSous(e.clientX, e.clientY); placerCadre(cadre, survol); }, true);
  surPage("pointerdown", e => { if (deMoiEvt(e)) return; p0 = { x: e.clientX, y: e.clientY }; }, true);
  surPage("pointerup", e => {
    if (deMoiEvt(e) || !p0) return; const bouge = Math.hypot(e.clientX - p0.x, e.clientY - p0.y) > 10; p0 = null; if (bouge) return;
    const el = elementSous(e.clientX, e.clientY); if (!el) return; choisi = el; pile.length = 0; montrerChoix();
  }, true);
  surFenetre("scroll", () => { if (choisi) placerCadre(cadre, choisi); }, true);
  surFenetre("keydown", e => {
    if (!choisi && survol && e.key === "Enter") { choisi = survol; montrerChoix(); return; }
    if (!choisi) return;
    if (e.key === "ArrowUp") { e.preventDefault(); c.querySelector('[data-e="parent"]').click(); }
    if (e.key === "ArrowDown") { e.preventDefault(); c.querySelector('[data-e="enfant"]').click(); }
    if (e.key === "Enter") { e.preventDefault(); c.querySelector('[data-e="ok"]').click(); }
  }, true);
  c.addEventListener("click", async e => {
    const a = e.target.closest("[data-e]"); if (!a) return; const k = a.dataset.e;
    if (k === "annuler") return outilFermer();
    if (k === "parent" && choisi && choisi.parentElement && choisi.parentElement !== document.body) { pile.push(choisi); choisi = choisi.parentElement; montrerChoix(); }
    if (k === "enfant" && pile.length) { choisi = pile.pop(); montrerChoix(); }
    if (k === "ok" && choisi) {
      a.disabled = true; a.textContent = "…";
      const p = Object.assign({ type: "element" }, decrireElement(choisi));
      cadre.hidden = true;
      p.image = await photoElement(choisi);
      outilFermer(p);
    }
  });
  echapFerme(() => outilFermer());
}
async function photoElement(el) {
  if (!htmlToImage) return null;
  try {
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.width * r.height > 1600 * 1600) return null;
    const blob = await Promise.race([htmlToImage.toBlob(el, { pixelRatio: Math.min(2, window.devicePixelRatio || 1), backgroundColor: fondEffectif(el), cacheBust: false, skipFonts: true }), attendre(6000).then(() => null)]);
    return blob ? await imageMettre("el-" + uid(), blob) : null;
  } catch (e) { return null; }
}
