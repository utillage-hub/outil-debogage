/* =====================================================================
   Outil Mesure
   - Règle : glisser pour mesurer une distance en pixels ;
   - Écart : toucher deux éléments → espace entre eux et décalages d'alignement ;
   - Couleur : toucher un élément → couleur du texte, du fond, contraste, police ;
   - Grille : quadrillage d'alignement (4, 8, 16 ou 24 px), gardé pendant les mesures.
   ===================================================================== */
function outilMesure() {
  const st = { mode: "regle", grille: local.lire("grille", 0), a: null, b: null, p1: null, p2: null, res: null };
  const c = outilOuvrir("mesure", `
    <canvas id="mToile"></canvas>
    <div class="barre haut"><button type="button" class="btn petit" data-m="fin">Fermer</button>
      <div class="formes" role="tablist">${[["regle", "Règle"], ["ecart", "Écart"], ["couleur", "Couleur"]].map(([k, t]) => `<button type="button" role="tab" data-mode="${k}" aria-pressed="${k === "regle"}"><span style="font-size:13px">${t}</span></button>`).join("")}
      <button type="button" data-m="grille" aria-pressed="false" title="Grille d'alignement"><span style="font-size:13px" id="mGr">Grille</span></button></div></div>
    <div class="consigne" id="mRes" style="bottom:12px"></div>`, true);
  const cv = c.querySelector("#mToile"), ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
  const taille = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; dessiner(); };
  const aide = { regle: "Glisse d'un point à un autre pour mesurer.", ecart: "Touche un premier élément, puis un second.", couleur: "Touche un texte ou un bloc pour lire ses couleurs." };
  const res = c.querySelector("#mRes");
  deplacable(c.querySelector(".barre.haut"), "mesure-haut"); deplacable(res, "mesure-resultat");
  const afficher = (html, piece) => {
    st.res = piece || null;
    res.innerHTML = `<div class="resultat">${html}</div>${piece ? `<div class="rang"><button type="button" class="btn prim" data-m="ajouter" style="flex:1">Ajouter à la note</button></div>` : ""}`;
  };
  const boiteEl = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  function dessiner() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (st.grille) {
      ctx.strokeStyle = "rgba(255,0,140,.22)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0.5; x < innerWidth; x += st.grille) { ctx.moveTo(x, 0); ctx.lineTo(x, innerHeight); }
      for (let y = 0.5; y < innerHeight; y += st.grille) { ctx.moveTo(0, y); ctx.lineTo(innerWidth, y); }
      ctx.stroke(); ctx.strokeStyle = "rgba(255,0,140,.5)"; ctx.beginPath(); ctx.moveTo(innerWidth / 2, 0); ctx.lineTo(innerWidth / 2, innerHeight); ctx.stroke();
    }
    const cadre = (b, coul, lettre) => { ctx.strokeStyle = coul; ctx.lineWidth = 2; ctx.fillStyle = coul + "22"; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeRect(b.x, b.y, b.w, b.h); if (lettre) { ctx.fillStyle = coul; ctx.fillRect(b.x, b.y - 18, 18, 18); ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.fillText(lettre, b.x + 5, b.y - 5); } };
    const etiquette = (x, y, t) => { ctx.font = "600 12.5px ui-monospace, Menlo, monospace"; const w = ctx.measureText(t).width + 12; x = borne(x - w / 2, 4, innerWidth - w - 4); y = borne(y, 22, innerHeight - 4); ctx.fillStyle = "#1D2024"; ctx.fillRect(x, y - 18, w, 22); ctx.fillStyle = "#FFB224"; ctx.fillText(t, x + 6, y - 3); };
    if (st.mode === "regle" && st.p1 && st.p2) {
      ctx.strokeStyle = "#FFB224"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(st.p1.x, st.p1.y); ctx.lineTo(st.p2.x, st.p2.y); ctx.stroke(); ctx.setLineDash([]);
      [st.p1, st.p2].forEach(p => { ctx.fillStyle = "#FFB224"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill(); });
      const dx = Math.abs(st.p2.x - st.p1.x), dy = Math.abs(st.p2.y - st.p1.y);
      etiquette((st.p1.x + st.p2.x) / 2, (st.p1.y + st.p2.y) / 2 - 8, fmtNb(Math.hypot(dx, dy)) + " px");
    }
    if (st.mode === "ecart") {
      if (st.a) cadre(boiteEl(st.a), "#2F80ED", "A");
      if (st.b) {
        cadre(boiteEl(st.b), "#FF3B30", "B");
        const A = boiteEl(st.a), B = boiteEl(st.b);
        ctx.strokeStyle = "#FFB224"; ctx.lineWidth = 2;
        const gx = B.x > A.x + A.w ? [A.x + A.w, B.x] : A.x > B.x + B.w ? [B.x + B.w, A.x] : null;
        const gy = B.y > A.y + A.h ? [A.y + A.h, B.y] : A.y > B.y + B.h ? [B.y + B.h, A.y] : null;
        if (gx) { const y = Math.max(A.y, B.y) + 10; ctx.beginPath(); ctx.moveTo(gx[0], y); ctx.lineTo(gx[1], y); ctx.stroke(); etiquette((gx[0] + gx[1]) / 2, y - 6, Math.round(gx[1] - gx[0]) + " px"); }
        if (gy) { const x = Math.max(A.x, B.x) + 10; ctx.beginPath(); ctx.moveTo(x, gy[0]); ctx.lineTo(x, gy[1]); ctx.stroke(); etiquette(x + 30, (gy[0] + gy[1]) / 2 + 6, Math.round(gy[1] - gy[0]) + " px"); }
      }
    }
    if (st.mode === "couleur" && st.a) cadre(boiteEl(st.a), "#FFB224");
  }
  taille(); surFenetre("resize", taille);
  afficher(`<small>${aide.regle}</small>`);
  if (st.grille) c.querySelector("#mGr").textContent = "Grille " + st.grille;

  cv.addEventListener("pointerdown", e => {
    const x = e.clientX, y = e.clientY;
    if (st.mode === "regle") { st.p1 = { x, y }; st.p2 = { x, y }; st.glisse = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} dessiner(); }
  });
  cv.addEventListener("pointermove", e => { if (st.mode === "regle" && st.glisse) { st.p2 = { x: e.clientX, y: e.clientY }; if (e.shiftKey) { if (Math.abs(st.p2.x - st.p1.x) > Math.abs(st.p2.y - st.p1.y)) st.p2.y = st.p1.y; else st.p2.x = st.p1.x; } dessiner(); } });
  cv.addEventListener("pointerup", e => {
    const x = e.clientX, y = e.clientY;
    if (st.mode === "regle") {
      st.glisse = false; const dx = Math.round(Math.abs(st.p2.x - st.p1.x)), dy = Math.round(Math.abs(st.p2.y - st.p1.y));
      if (dx + dy < 3) { afficher(`<small>${aide.regle}</small>`); return; }
      const d = fmtNb(Math.hypot(dx, dy));
      const de = decrireCourt(elementSous(st.p1.x, st.p1.y)), a = decrireCourt(elementSous(st.p2.x, st.p2.y));
      afficher(`<b>${d} px</b><small>horizontal ${dx} px · vertical ${dy} px</small><small>de ${esc(de)} à ${esc(a)}</small>`,
        { type: "mesure", genre: "distance", resume: d + " px (Δx " + dx + ", Δy " + dy + ")", details: "De " + de + " à " + a });
    } else if (st.mode === "ecart") {
      const el = elementSous(x, y); if (!el) return;
      if (!st.a || st.b) { st.a = el; st.b = null; afficher(`<small>A : ${esc(decrireCourt(el))}. Touche maintenant le second élément.</small>`); }
      else {
        st.b = el; const A = boiteEl(st.a), B = boiteEl(st.b);
        const ex = Math.round(Math.max(B.x - (A.x + A.w), A.x - (B.x + B.w), 0)), ey = Math.round(Math.max(B.y - (A.y + A.h), A.y - (B.y + B.h), 0));
        const dg = Math.round(B.x - A.x), dh = Math.round(B.y - A.y), dc = Math.round((B.x + B.w / 2) - (A.x + A.w / 2)), dd = Math.round((B.x + B.w) - (A.x + A.w));
        const lignes = [ex ? "Espace horizontal : " + ex + " px" : "", ey ? "Espace vertical : " + ey + " px" : "", !ex && !ey ? "Les deux éléments se touchent ou se chevauchent" : "",
          "Bords gauches décalés de " + dg + " px" + (dg === 0 ? " (alignés)" : ""), "Bords hauts décalés de " + dh + " px" + (dh === 0 ? " (alignés)" : ""),
          "Centres décalés de " + dc + " px horizontalement" + (dc === 0 ? " (centrés)" : ""), "Bords droits décalés de " + dd + " px" + (dd === 0 ? " (alignés)" : "")].filter(Boolean);
        const tA = decrireCourt(st.a), tB = decrireCourt(st.b);
        afficher(`<small>A : ${esc(tA)}<br>B : ${esc(tB)}</small>${lignes.map(l => `<span>${esc(l)}</span>`).join("")}`,
          { type: "mesure", genre: "ecart", resume: (ex || ey ? "écart " + [ex ? ex + " px horizontal" : "", ey ? ey + " px vertical" : ""].filter(Boolean).join(", ") : "éléments collés") + " entre A et B",
            details: "A = " + tA + " (" + selecteur(st.a) + ") ; B = " + tB + " (" + selecteur(st.b) + ") ; " + lignes.join(" ; ") });
      }
      dessiner();
    } else if (st.mode === "couleur") {
      const el = elementSous(x, y); if (!el) return; st.a = el; dessiner();
      const cs = getComputedStyle(el), fond = fondEffectif(el), ct = contraste(cs.color, fond);
      const ok = ct >= 4.5, verdict = ct ? fmtNb(ct) + ":1 " + (ok ? "✓ lisible (AA)" : ct >= 3 ? "⚠ juste pour du gros texte" : "✗ insuffisant") : "";
      afficher(`<small>${esc(decrireCourt(el))}</small>
        <span class="nuance"><i style="background:${esc(cs.color)}"></i>Texte <b class="mono">${esc(versHex(cs.color))}</b></span>
        <span class="nuance"><i style="background:${esc(fond)}"></i>Fond <b class="mono">${esc(versHex(fond))}</b></span>
        <span>Contraste <b>${esc(verdict)}</b></span>
        <small class="mono">${esc(cs.fontSize + " / " + cs.lineHeight + " · " + cs.fontWeight + " · " + cs.fontFamily.split(",")[0])}</small>`,
        { type: "mesure", genre: "couleur", resume: "texte " + versHex(cs.color) + " sur " + versHex(fond) + (ct ? ", contraste " + fmtNb(ct) + ":1" : ""),
          details: decrireCourt(el) + " (" + selecteur(el) + ") · police " + cs.fontSize + " " + cs.fontWeight + " " + cs.fontFamily.split(",")[0] + (ct && !ok ? " · contraste sous 4,5:1" : "") });
    }
  });
  c.addEventListener("click", e => {
    const md = e.target.closest("[data-mode]");
    if (md) { st.mode = md.dataset.mode; st.a = st.b = st.p1 = st.p2 = null; c.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === md))); afficher(`<small>${aide[st.mode]}</small>`); dessiner(); return; }
    const a = e.target.closest("[data-m]"); if (!a) return;
    if (a.dataset.m === "fin") return outilFermer();
    if (a.dataset.m === "grille") { const pas = [0, 4, 8, 16, 24]; st.grille = pas[(pas.indexOf(st.grille) + 1) % pas.length]; local.ecrire("grille", st.grille); a.setAttribute("aria-pressed", String(!!st.grille)); c.querySelector("#mGr").textContent = st.grille ? "Grille " + st.grille : "Grille"; dessiner(); }
    if (a.dataset.m === "ajouter" && st.res) outilFermer(st.res);
  });
  echapFerme(() => outilFermer());
}
