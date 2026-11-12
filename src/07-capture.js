/* =====================================================================
   Outils : cadre commun + Capture annotée
   L'écran est figé : on dessine par-dessus l'appli (zones à main levée,
   rectangles, flèches, traits, textes, flou). Chaque zone reçoit une
   consigne et la liste des éléments de l'appli qu'elle contient.
   ===================================================================== */
function outilOuvrir(nom, html, bloque) {
  if (OUTIL.actif) outilFermer();
  OUTIL.actif = nom;
  const c = q("#calque"); c.innerHTML = html; c.hidden = false; c.classList.toggle("bloque", !!bloque);
  fermerPanneau(); rendreBulle();
  return c;
}
function outilFermer(piece) {
  const nom = OUTIL.actif; OUTIL.actif = null;
  (OUTIL.nettoyer || []).forEach(f => { try { f(); } catch (e) {} }); OUTIL.nettoyer = [];
  const c = q("#calque"); c.innerHTML = ""; c.hidden = true; c.classList.remove("bloque");
  if (piece) { COMPO.pieces.push(piece); rendrePieces(); }
  if (nom) ouvrirPanneau("note");
}
// écouteur posé sur la page pendant l'outil, retiré à la fermeture
function surPage(type, f, opts) { document.addEventListener(type, f, opts); (OUTIL.nettoyer = OUTIL.nettoyer || []).push(() => document.removeEventListener(type, f, opts)); }
function surFenetre(type, f, opts) { addEventListener(type, f, opts); (OUTIL.nettoyer = OUTIL.nettoyer || []).push(() => removeEventListener(type, f, opts)); }
const deMoiEvt = e => e.composedPath && e.composedPath().includes(HOTE);
/* ---------- Fenêtres d'outils déplaçables (place retenue pour chaque fenêtre) ---------- */
const FEN = {
  lire() { try { return JSON.parse(localStorage.getItem("debogage:fenetres") || "{}") || {}; } catch (e) { return {}; } },
  ecrire(o) { try { localStorage.setItem("debogage:fenetres", JSON.stringify(o)); } catch (e) {} }
};
function deplacable(el, nom) {
  if (!el || el.dataset.fen) return; el.dataset.fen = nom;
  el.classList.add("deplacable");
  el.insertAdjacentHTML("afterbegin", '<span class="poigneeB" title="Glisser pour déplacer · double-toucher pour remettre en place" aria-hidden="true"></span>');
  const poser = (x, y) => { Object.assign(el.style, { left: borne(x, 4, innerWidth - 90) + "px", top: borne(y, 4, innerHeight - 56) + "px", right: "auto", bottom: "auto", transform: "none", marginLeft: "0" }); el.dataset.deplace = "1"; };
  const pos = FEN.lire()[nom]; if (pos) poser(pos.x, pos.y);
  let d = null;
  el.addEventListener("pointerdown", e => {
    // on attrape la fenêtre par sa poignée ou par son fond, jamais par un bouton ou un champ
    if (!e.target.closest(".poigneeB") && e.target.closest("button,input,textarea,select,a,canvas,label")) return;
    const r = el.getBoundingClientRect(); d = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, bouge: false };
    try { el.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
  });
  el.addEventListener("pointermove", e => {
    if (!d) return; if (!d.bouge && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    d.bouge = true; el.classList.add("glisse-fen"); poser(d.l + e.clientX - d.x, d.t + e.clientY - d.y);
  });
  const fin = () => { if (!d) return; const s = d; d = null; el.classList.remove("glisse-fen"); if (s.bouge) { const r = el.getBoundingClientRect(), o = FEN.lire(); o[nom] = { x: Math.round(r.left), y: Math.round(r.top) }; FEN.ecrire(o); } };
  el.addEventListener("pointerup", fin); el.addEventListener("pointercancel", fin);
  el.querySelector(".poigneeB").addEventListener("dblclick", () => { const o = FEN.lire(); delete o[nom]; FEN.ecrire(o); ["left", "top", "right", "bottom", "transform", "marginLeft"].forEach(k => { el.style[k] = ""; }); delete el.dataset.deplace; });
}

// Échap ferme l'outil en cours
function echapFerme(annuler) { surFenetre("keydown", e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); annuler(); } }, true); }

/* ---------- Photographier l'écran visible ---------- */
function fondPage() {
  for (const el of [document.body, document.documentElement]) { const v = rgbDe(getComputedStyle(el).backgroundColor); if (v && v.a > 0.05) return getComputedStyle(el).backgroundColor; }
  return "#ffffff";
}
async function rasteriser() {
  if (!htmlToImage) return null;
  const cs = getComputedStyle(document.body);
  const opts = {
    width: innerWidth, height: innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2), backgroundColor: fondPage(), cacheBust: false,
    imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
    // le contenu remonte de la hauteur défilée ; les éléments fixes restent où on les voit
    style: { marginTop: (parseFloat(cs.marginTop) - scrollY) + "px", marginLeft: (parseFloat(cs.marginLeft) - scrollX) + "px", height: "auto", minHeight: "0", maxHeight: "none", overflow: "visible", transform: "none" },
    filter: n => !(n.nodeType === 1 && CFG.ignorer && n.matches && n.matches(CFG.ignorer))
  };
  const essai = (o, ms) => Promise.race([htmlToImage.toCanvas(document.body, o), attendre(ms).then(() => { throw new Error("délai dépassé"); })]);
  try { return await essai(opts, 15000); }
  catch (e) { try { return await essai(Object.assign({}, opts, { skipFonts: true }), 10000); } catch (e2) { console.warn("[débogage] capture impossible :", e2 && e2.message); return null; } }
}

/* ---------- Dessin ---------- */
const COULEURS = ["#FF3B30", "#FFB224", "#2F80ED"];
const FORMES = [
  ["zone", "Zone", '<svg viewBox="0 0 24 24"><path d="M6 8c1.5-3 7-4.5 11-2s3 8-2 10-10 1-11-2 0-4 2-6z" stroke-dasharray="3 2"/></svg>'],
  ["rect", "Cadre", '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>'],
  ["fleche", "Flèche", '<svg viewBox="0 0 24 24"><path d="M5 19L19 5M10 5h9v9"/></svg>'],
  ["trait", "Trait", '<svg viewBox="0 0 24 24"><path d="M4 16c3-6 5-8 7-5s4 2 9-6"/></svg>'],
  ["texte", "Texte", '<svg viewBox="0 0 24 24"><path d="M6 6h12M12 6v13"/></svg>'],
  ["flou", "Masquer", '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10l6-4M4 15l11-9M7 18l13-9M12 18l8-5"/></svg>']
];
function dessinerFormes(ctx, formes, s, apercu) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const f of formes) {
    ctx.save(); ctx.strokeStyle = f.c; ctx.fillStyle = f.c; ctx.lineWidth = 3.5 * s;
    if (f.t === "zone" || f.t === "trait") {
      if (f.p.length < 2) { ctx.restore(); continue; }
      ctx.beginPath(); ctx.moveTo(f.p[0][0] * s, f.p[0][1] * s); for (const [x, y] of f.p) ctx.lineTo(x * s, y * s);
      if (f.t === "zone" && f.fini) { ctx.closePath(); ctx.globalAlpha = 0.14; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.stroke();
    } else if (f.t === "rect") {
      ctx.globalAlpha = 0.12; ctx.fillRect(f.x * s, f.y * s, f.w * s, f.h * s); ctx.globalAlpha = 1; ctx.strokeRect(f.x * s, f.y * s, f.w * s, f.h * s);
    } else if (f.t === "fleche") {
      const a = Math.atan2(f.y2 - f.y1, f.x2 - f.x1), L = 16 * s;
      ctx.beginPath(); ctx.moveTo(f.x1 * s, f.y1 * s); ctx.lineTo(f.x2 * s, f.y2 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(f.x2 * s, f.y2 * s); ctx.lineTo(f.x2 * s - L * Math.cos(a - 0.45), f.y2 * s - L * Math.sin(a - 0.45)); ctx.lineTo(f.x2 * s - L * Math.cos(a + 0.45), f.y2 * s - L * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
    } else if (f.t === "texte") {
      ctx.font = `700 ${17 * s}px system-ui, sans-serif`; const w = ctx.measureText(f.txt).width, pad = 6 * s;
      ctx.fillStyle = "rgba(20,22,26,.88)"; ctx.fillRect(f.x * s - pad, f.y * s - 20 * s, w + pad * 2, 28 * s);
      ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x * s, f.y * s);
    } else if (f.t === "flou" && apercu) {
      ctx.fillStyle = "rgba(30,32,36,.82)"; ctx.fillRect(f.x * s, f.y * s, f.w * s, f.h * s);
      ctx.fillStyle = "#fff"; ctx.font = `600 ${13 * s}px system-ui, sans-serif`; ctx.fillText("masqué", f.x * s + 8 * s, f.y * s + 20 * s);
    }
    // numéro de zone
    if (f.n) { const [bx, by] = f.t === "rect" ? [f.x, f.y] : f.p.reduce((m, p) => p[1] < m[1] ? p : m, f.p[0]);
      ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(bx * s, by * s, 13 * s, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `800 ${14 * s}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(f.n), bx * s, by * s + 0.5 * s); }
    ctx.restore();
  }
}
const boite = f => {
  if (f.t === "rect" || f.t === "flou") return { x: f.x, y: f.y, w: f.w, h: f.h };
  const xs = f.p.map(p => p[0]), ys = f.p.map(p => p[1]); const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

function outilCapture() {
  const rasterP = rasteriser(); // la photo se prend pendant qu'on dessine
  const st = { forme: "zone", c: COULEURS[0], formes: [], en: null, raster: undefined };
  const c = outilOuvrir("capture", `
    <canvas id="toile" aria-label="Zone de dessin sur la capture"></canvas>
    <div class="barre haut"><button type="button" class="btn petit" data-c="annuler">Annuler</button>
      <span class="tt"><b>Entoure ce qu'il faut modifier</b><small id="cEtat" class="attente">Photo de l'écran…</small></span>
      <button type="button" class="btn petit prim" data-c="ok">Terminer</button></div>
    <div class="consigne" id="cons" hidden></div>
    <div class="barre bas"><div class="formes" role="toolbar" aria-label="Formes">${FORMES.map(([k, t, svg]) => `<button type="button" data-forme="${k}" aria-pressed="${k === "zone"}" title="${t}">${svg}<span>${t}</span></button>`).join("")}</div>
      <span class="sep"></span><div class="couleurs">${COULEURS.map((k, i) => `<button type="button" data-coul="${k}" aria-pressed="${i === 0}" style="background:${k}" aria-label="Couleur ${["rouge", "ambre", "bleu"][i]}"></button>`).join("")}</div>
      <button type="button" class="ic" data-c="defaire" aria-label="Défaire" title="Défaire">↶</button></div>`, true);
  const cv = c.querySelector("#toile"), ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
  const taille = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; redessiner(); caler(); };
  // la consigne et la barre déplacée se posent juste au-dessus de la barre d'outils du bas
  const caler = () => { const h = c.querySelector(".barre.bas").offsetHeight + 16; c.style.setProperty("--bas", h + "px"); const k = c.querySelector("#cons"); if (!k.dataset.deplace) k.style.bottom = h + "px"; };
  const redessiner = () => { ctx.clearRect(0, 0, cv.width, cv.height); dessinerFormes(ctx, st.formes.concat(st.en ? [st.en] : []), dpr, true); };
  deplacable(c.querySelector(".barre.haut"), "capture-haut"); deplacable(c.querySelector(".barre.bas"), "capture-outils"); deplacable(c.querySelector("#cons"), "capture-consigne");
  taille(); surFenetre("resize", taille);
  rasterP.then(r => { st.raster = r; const e = c.querySelector("#cEtat"); if (e) { e.classList.remove("attente"); e.textContent = r ? "Écran figé · dessine avec le doigt ou la souris" : "Photo impossible ici : tes annotations et les éléments repérés seront gardés"; } });
  // la page ne défile pas pendant le dessin
  const bloquer = e => { if (deMoiEvt(e)) e.preventDefault(); };
  surPage("wheel", bloquer, { passive: false, capture: true }); surPage("touchmove", bloquer, { passive: false, capture: true });
  const nZones = () => st.formes.filter(f => f.n).length;

  cv.addEventListener("pointerdown", e => {
    if (!c.querySelector("#cons").hidden) return;
    const x = e.clientX, y = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    if (st.forme === "texte") return demanderTexte(x, y);
    c.classList.add("dessin");
    st.en = st.forme === "zone" || st.forme === "trait" ? { t: st.forme, c: st.c, p: [[x, y]] }
      : st.forme === "fleche" ? { t: "fleche", c: st.c, x1: x, y1: y, x2: x, y2: y }
      : { t: st.forme, c: st.c, x, y, w: 0, h: 0, x0: x, y0: y };
    redessiner();
  });
  cv.addEventListener("pointermove", e => {
    const f = st.en; if (!f) return; const x = e.clientX, y = e.clientY;
    if (f.p) f.p.push([x, y]); else if (f.t === "fleche") { f.x2 = x; f.y2 = y; }
    else { f.x = Math.min(f.x0, x); f.y = Math.min(f.y0, y); f.w = Math.abs(x - f.x0); f.h = Math.abs(y - f.y0); }
    redessiner();
  });
  const fin = () => {
    c.classList.remove("dessin");
    const f = st.en; st.en = null; if (!f) return;
    const b = f.t === "fleche" ? { w: Math.abs(f.x2 - f.x1), h: Math.abs(f.y2 - f.y1) } : boite(f);
    if (b.w < 10 && b.h < 10) { redessiner(); return; }
    if (f.t === "zone") f.fini = true;
    if (f.t === "zone" || f.t === "rect") { f.n = nZones() + 1; f.elements = elementsDansZone(boite(f)); }
    st.formes.push(f); redessiner();
    if (f.n) demanderConsigne(f);
  };
  cv.addEventListener("pointerup", fin); cv.addEventListener("pointercancel", fin);

  function demanderConsigne(f) {
    const box = c.querySelector("#cons");
    box.innerHTML = `<small><span class="numero">${f.n}</span>Que faut-il faire dans cette zone ?</small>
      ${f.elements.length ? `<small>Contient : ${esc(f.elements.slice(0, 3).map(e => e.t).join(" · "))}</small>` : ""}
      <div class="rang"><input type="text" id="consIn" placeholder="Ex. : agrandir, aligner à gauche, mettre en rouge…" aria-label="Consigne pour la zone ${f.n}"></div>
      <div class="rang"><button type="button" class="btn" data-cs="micro" aria-label="Dicter la consigne">${ICO.micro}</button><button type="button" class="btn" data-cs="passer" style="flex:1">Passer</button><button type="button" class="btn prim" data-cs="ok" style="flex:1">OK</button></div>`;
    box.hidden = false; const inp = box.querySelector("#consIn"); setTimeout(() => inp.focus({ preventScroll: true }), 30);
    const valider = garder => { if (garder) f.consigne = inp.value.trim(); box.hidden = true; box.innerHTML = ""; if (DICT.mode === "consigne") dicteeArreter(); };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); valider(true); } });
    box.onclick = e => {
      const k = e.target.closest("[data-cs]"); if (!k) return;
      if (k.dataset.cs === "micro") return dicterDans(inp);
      valider(k.dataset.cs === "ok");
    };
  }
  function demanderTexte(x, y) {
    const box = c.querySelector("#cons");
    box.innerHTML = `<small>Texte à écrire sur la capture</small><div class="rang"><input type="text" id="txtIn" placeholder="Ex. : trop petit" aria-label="Texte à écrire"><button type="button" class="btn prim" data-t="ok">OK</button></div>`;
    box.hidden = false; const inp = box.querySelector("#txtIn"); setTimeout(() => inp.focus({ preventScroll: true }), 30);
    const ok = () => { const t = inp.value.trim(); box.hidden = true; box.innerHTML = ""; if (t) { st.formes.push({ t: "texte", c: st.c, x, y, txt: t }); redessiner(); } };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ok(); } if (e.key === "Escape") { e.stopPropagation(); box.hidden = true; } });
    box.onclick = e => { if (e.target.closest("[data-t]")) ok(); };
  }

  c.addEventListener("click", async e => {
    const fo = e.target.closest("[data-forme]"); if (fo) { st.forme = fo.dataset.forme; c.querySelectorAll("[data-forme]").forEach(b => b.setAttribute("aria-pressed", String(b === fo))); return; }
    const co = e.target.closest("[data-coul]"); if (co) { st.c = co.dataset.coul; c.querySelectorAll("[data-coul]").forEach(b => b.setAttribute("aria-pressed", String(b === co))); return; }
    const a = e.target.closest("[data-c]"); if (!a) return;
    if (a.dataset.c === "defaire") { st.formes.pop(); redessiner(); }
    else if (a.dataset.c === "annuler") outilFermer();
    else if (a.dataset.c === "ok") {
      a.disabled = true; a.textContent = "Finalisation…";
      const cons = c.querySelector("#cons"); if (!cons.hidden) { const i = cons.querySelector("#consIn"); const z = st.formes.filter(f => f.n).pop(); if (i && z) z.consigne = i.value.trim(); }
      const raster = st.raster === undefined ? await rasterP : st.raster;
      outilFermer(await composerCapture(raster, st.formes));
    }
  });
  echapFerme(() => outilFermer());
}

// Dictée rapide dans un petit champ (consigne de zone, remplacement de texte)
function dicterDans(inp) {
  if (DICT.mode) { dicteeArreter(); return; }
  const base = inp.value ? inp.value.trimEnd() + " " : "";
  const cible = { partiel: t => { inp.value = base + t; inp.scrollLeft = inp.scrollWidth; }, final: t => { inp.value = (base + t).trim(); inp.scrollLeft = inp.scrollWidth; } };
  // on réutilise le moteur de la dictée avec une cible ponctuelle
  dicteeBasculer("consigne"); if (DICT.mode === "consigne") DICT.cible = cible;
}

async function composerCapture(raster, formes) {
  const L = innerWidth, H = innerHeight;
  const s = raster ? raster.width / L : Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement("canvas"); cv.width = Math.round(L * s); cv.height = Math.round(H * s);
  const ctx = cv.getContext("2d");
  if (raster) ctx.drawImage(raster, 0, 0);
  else {
    ctx.fillStyle = "#E9EBEE"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#5E6670"; ctx.font = `600 ${15 * s}px system-ui, sans-serif`;
    ctx.fillText("Photo de l'écran indisponible ici : annotations seules", 16 * s, 28 * s);
  }
  // zones masquées : pixellisation
  for (const f of formes.filter(f => f.t === "flou")) {
    const x = f.x * s, y = f.y * s, w = Math.max(1, f.w * s), h = Math.max(1, f.h * s), k = 14 * s;
    const t = document.createElement("canvas"); t.width = Math.max(1, Math.round(w / k)); t.height = Math.max(1, Math.round(h / k));
    t.getContext("2d").drawImage(cv, x, y, w, h, 0, 0, t.width, t.height);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(t, 0, 0, t.width, t.height, x, y, w, h); ctx.restore();
  }
  dessinerFormes(ctx, formes.filter(f => f.t !== "flou"), s, false);
  // image raisonnable : 1440 px de large au plus
  let out = cv;
  if (cv.width > 1440) { out = document.createElement("canvas"); out.width = 1440; out.height = Math.round(cv.height * 1440 / cv.width); out.getContext("2d").drawImage(cv, 0, 0, out.width, out.height); }
  const blob = await new Promise(r => out.toBlob(r, "image/jpeg", 0.84));
  const image = blob ? await imageMettre("cap-" + uid(), blob) : null;
  return {
    type: "capture", image, largeur: out.width, hauteur: out.height, ecran: L + " × " + H, photo: !!raster,
    zones: formes.filter(f => f.n).map(f => ({ n: f.n, forme: f.t === "rect" ? "cadre" : "zone", consigne: f.consigne || "", elements: f.elements || [], boite: (b => ({ x: Math.round(b.x), y: Math.round(b.y), l: Math.round(b.w), h: Math.round(b.h) }))(boite(f)) })),
    textes: formes.filter(f => f.t === "texte").map(f => f.txt),
    fleches: formes.filter(f => f.t === "fleche").length,
    masques: formes.filter(f => f.t === "flou").length
  };
}
