/* =====================================================================
   Interface : bulle, fenêtre de note, liste, vérification, réglages
   ===================================================================== */
const ICO = {
  bulle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  capture: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8.5 12.5c0-2.2 1.6-3.8 3.6-3.8s3.4 1.3 3.4 3c0 2.4-2.6 3.6-4.6 3.3-1.4-.2-2.4-1.2-2.4-2.5z"/></svg>',
  element: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5l13 6.2-5.6 1.8-1.9 5.7z"/><path d="M13 13l5.5 5.5"/></svg>',
  texte: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7V5h11v2M10.5 5v13M8 18h5"/><path d="M15 12h5M17.5 12v7M16 19h3"/></svg>',
  mesure: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 16.5l13-13 4 4-13 13z"/><path d="M7.5 12.5l2 2M10.5 9.5l1.5 1.5M13.5 6.5l2 2"/></svg>',
  micro: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  fermer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  points: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
  reglages: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  export: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>',
  liste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  crayon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'
};

let HOTE = null, RACINE = null;
const PREFS = { bulle: null, contexte: true, filtre: "todo" };
// Réglages d'interface (onglet Interface), communs à tous les projets de cet appareil
const OUTILS_ORDRE = ["capture", "element", "texte", "mesure", "dicter"];
const INTERFACE_DEFAUT = () => ({
  fermeture: "vague",                                       // bande | vague | cible | coin | aucune
  fenetre: { glisser: true, cote: true, echap: true, apresEnreg: true },
  outils: { barre: OUTILS_ORDRE.slice(), pied: [], masques: [] },
  masques: [],                                              // autres éléments masqués
  tailleBulle: "normale",
  couleurs: "appli"                                         // appli | neutre | clair | sombre
});
const IF = INTERFACE_DEFAUT();
function chargerInterface() {
  let v = null; try { v = JSON.parse(localStorage.getItem("debogage:interface") || "null"); } catch (e) {}
  if (!v) return;
  Object.assign(IF, v, { fenetre: Object.assign(INTERFACE_DEFAUT().fenetre, v.fenetre || {}), outils: Object.assign(INTERFACE_DEFAUT().outils, v.outils || {}) });
  // un outil ajouté dans une nouvelle version apparaît dans la barre
  const connus = new Set([].concat(IF.outils.barre, IF.outils.pied, IF.outils.masques));
  OUTILS_ORDRE.forEach(o => { if (!connus.has(o)) IF.outils.barre.push(o); });
  ["barre", "pied", "masques"].forEach(k => IF.outils[k] = IF.outils[k].filter(o => OUTILS_ORDRE.includes(o)));
}
function sauverInterface() { try { localStorage.setItem("debogage:interface", JSON.stringify(IF)); } catch (e) {} appliquerInterface(); }
const UI = { verifPile: [], verifForce: null, vue: "note", ouverts: new Set(), edition: null, verif: false, saut: new Set(), refs: new Map(), via: "texte", fermeT: 0 };
const q = s => RACINE.querySelector(s);
const estLarge = () => innerWidth >= 720;

function construireUI() {
  HOTE = document.createElement("div");
  HOTE.setAttribute("data-outil-debogage", VERSION_OUTIL);
  HOTE.style.cssText = "position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:block;";
  RACINE = HOTE.attachShadow({ mode: "open" });
  RACINE.innerHTML = `<style>${CSS_OUTIL}</style><div class="r">
    <button type="button" class="bulle" id="bulle" hidden aria-label="Outil de débogage : toucher pour noter, appui long pour dicter">${ICO.bulle}<i class="compte" data-masquable="compteur"></i><b class="etat"></b></button>
    <div class="zf" id="zoneFerm" hidden aria-hidden="true"></div>
    <style id="stMasques"></style>
    <section class="pnl" id="pnl" hidden role="dialog" aria-label="Outil de débogage">
      <header class="tete" id="tete">
        <div class="poignee" aria-hidden="true"></div>
        <div class="titres"><b id="titre">Nouvelle note</b><small id="ou" data-masquable="ecran"></small></div>
        <nav class="onglets" role="tablist" aria-label="Sections">
          <button type="button" role="tab" data-vue="note" aria-selected="true" aria-label="Nouvelle note">${ICO.crayon}</button>
          <button type="button" role="tab" data-vue="liste" aria-selected="false" aria-label="Notes">${ICO.liste}<i id="nbTodo"></i></button>
          <button type="button" role="tab" data-vue="reglages" aria-selected="false" aria-label="Export et réglages">${ICO.export}</button>
          <button type="button" role="tab" data-vue="interface" aria-selected="false" aria-label="Interface">${ICO.reglages}</button>
        </nav>
        <button type="button" class="ic" id="fermer" aria-label="Fermer la fenêtre">${ICO.fermer}</button>
      </header>
      <div class="zoneMasquer" id="zoneMasquer" hidden>Glisse ici pour masquer l'outil</div>
      <div class="vue" id="v-note">
        <div class="outils" id="outilsBarre" role="toolbar" aria-label="Outils d'annotation"></div>
        <ul class="pieces" id="pieces"></ul>
        <textarea id="saisie" rows="3" placeholder="Ce qui ne va pas, ce qu'il faut changer…" aria-label="Texte de la note"></textarea>
        <p class="msg" id="msg" role="status" aria-live="polite"></p>
        <div class="pied"><div class="outils-pied" id="outilsPied" role="toolbar" aria-label="Outils à côté d'Enregistrer"></div><button type="button" class="btn prim" id="enreg">Enregistrer la note</button></div>
      </div>
      <div class="vue" id="v-liste" hidden></div>
      <div class="vue" id="v-reglages" hidden></div>
      <div class="vue" id="v-interface" hidden></div>
    </section>
    <div class="menu3" id="menu3" hidden role="menu"></div>
    <div class="calque" id="calque" hidden></div>
    <div class="toast" id="toast" hidden role="status" aria-live="polite"><span></span><button type="button" hidden></button></div>
  </div>`;
  document.documentElement.appendChild(HOTE);
  // si l'appli remplace le contenu de la page, on se remet en place
  new MutationObserver(() => { if (!HOTE.isConnected) document.documentElement.appendChild(HOTE); }).observe(document.documentElement, { childList: true });
  brancherBulle(); brancherPanneau(); brancherListe(); brancherPerso(); appliquerInterface();
}

/* ---------- Message en bas de l'écran, avec action facultative (Annuler…) ---------- */
let toastT = 0;
function toast(texte, action, duree) {
  if (!RACINE) return;
  const t = q("#toast"), b = t.querySelector("button");
  t.querySelector("span").textContent = texte;
  b.hidden = !action; if (action) { b.textContent = action.libelle; b.onclick = () => { t.hidden = true; action.faire(); }; }
  t.classList.toggle("haut", !!OUTIL.actif); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, duree || (action ? 6000 : 3200));
}

/* ---------- Bulle ---------- */
function afficherBulle(v) { PREFS.bulle = v; local.ecrire("prefs", PREFS); rendreBulle(); }
function rendreBulle() {
  const b = q("#bulle"); if (!b) return;
  b.hidden = !PREFS.bulle || !!OUTIL.actif;
  b.querySelector(".compte").textContent = aTraiter().length || "";
  b.classList.toggle("rec", !!DICT.mode);
  b.querySelector(".etat").textContent = DICT.mode === "ecoute" ? "ÉCOUTE" : DICT.mode ? "REC" : "";
}
function brancherBulle() {
  const b = q("#bulle"), vague = q("#zoneFerm");
  const xy = local.lire("bulleXY", null);
  const placer = (x, y) => { const t = b.offsetWidth || 56; b.style.left = borne(x, 4, innerWidth - t - 4) + "px"; b.style.top = borne(y, 4, innerHeight - t - 4) + "px"; b.style.right = "auto"; };
  if (xy) placer(xy.x, xy.y);
  addEventListener("resize", () => { if (b.style.left) placer(parseFloat(b.style.left), parseFloat(b.style.top)); });
  let g = null;
  const surVague = (x, y) => estChaud(IF.fermeture, x, y);
  b.addEventListener("pointerdown", e => {
    if (e.button > 0) return;
    const r = b.getBoundingClientRect();
    g = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, bouge: false, long: false };
    try { b.setPointerCapture(e.pointerId); } catch (er) {}
    g.timer = setTimeout(() => { if (g && !g.bouge) { g.long = true; try { navigator.vibrate && navigator.vibrate(18); } catch (er) {} ouvrirPanneau("note"); dicteeBasculer("dictee"); } }, 550);
  });
  b.addEventListener("pointermove", e => {
    if (!g) return; const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.bouge && Math.hypot(dx, dy) < 8) return;
    if (!g.bouge) { g.bouge = true; clearTimeout(g.timer); b.classList.add("glisse"); vague.hidden = IF.fermeture === "aucune"; if (!estLarge()) fermerPanneau(); }
    placer(g.l + dx, g.t + dy);
    const p = proximite(IF.fermeture, e.clientX, e.clientY);
    vague.classList.toggle("pres", p > 0); vague.style.setProperty("--p", String(p));
    vague.classList.toggle("chaud", surVague(e.clientX, e.clientY));
  });
  const fin = e => {
    if (!g) return; const s = g; g = null; clearTimeout(s.timer);
    b.classList.remove("glisse"); vague.hidden = true; vague.classList.remove("pres", "chaud");
    if (s.long) return;
    if (!s.bouge) { if (q("#pnl").hidden) ouvrirPanneau("note"); else fermerPanneau(); return; }
    if (surVague(e.clientX, e.clientY)) {
      b.style.left = b.style.top = b.style.right = ""; local.ecrire("bulleXY", null); fermerPanneau(); afficherBulle(false);
      toast("Bulle masquée.", { libelle: "Annuler", faire: () => afficherBulle(true) });
    } else local.ecrire("bulleXY", { x: parseFloat(b.style.left), y: parseFloat(b.style.top) });
  };
  b.addEventListener("pointerup", fin); b.addEventListener("pointercancel", fin);
  b.addEventListener("click", e => e.preventDefault());
  b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (q("#pnl").hidden) ouvrirPanneau("note"); else fermerPanneau(); } });
}

/* ---------- Fenêtre ---------- */
function ouvrirPanneau(vue) {
  const p = q("#pnl"); clearTimeout(UI.fermeT);
  if (vue) changerVue(vue);
  q("#ou").textContent = ecranCourant();
  appliquerTheme();
  p.hidden = false; placerPanneau();
  if (UI.vue === "note" && !DICT.mode && estLarge()) setTimeout(() => q("#saisie").focus({ preventScroll: true }), 60);
  rendre();
}
function fermerPanneau() { q("#pnl").hidden = true; q("#menu3").hidden = true; }
function changerVue(v) {
  UI.vue = v;
  RACINE.querySelectorAll(".onglets [data-vue]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.vue === v)));
  ["note", "liste", "reglages", "interface"].forEach(k => { q("#v-" + k).hidden = k !== v; });
  q("#titre").textContent = { note: "Nouvelle note", liste: "Notes", reglages: "Export et réglages", interface: "Interface" }[v];
  if (v !== "liste") UI.verif = false;
  rendre();
}
function placerPanneau() {
  const p = q("#pnl"), pos = local.lire("pnlXY", null);
  if (!estLarge() || !pos) { p.style.left = p.style.top = p.style.right = p.style.bottom = ""; return; }
  const w = p.offsetWidth || 420, h = Math.min(p.offsetHeight || 400, 160);
  Object.assign(p.style, { left: borne(pos.x, 8, innerWidth - w - 8) + "px", top: borne(pos.y, 8, innerHeight - h) + "px", right: "auto", bottom: "auto" });
}
function brancherPanneau() {
  const p = q("#pnl"), tete = q("#tete");
  q("#fermer").onclick = fermerPanneau;
  RACINE.querySelectorAll(".onglets [data-vue]").forEach(b => b.onclick = () => changerVue(b.dataset.vue));
  // déplacer (PC) ou glisser vers le bas pour fermer (téléphone)
  let d = null;
  tete.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; const r = p.getBoundingClientRect(); d = { x: e.clientX, y: e.clientY, l: r.left, t: r.top }; try { tete.setPointerCapture(e.pointerId); } catch (er) {} });
  tete.addEventListener("pointermove", e => {
    if (!d) return;
    if (estLarge()) Object.assign(p.style, { left: borne(d.l + e.clientX - d.x, 8, innerWidth - p.offsetWidth - 8) + "px", top: borne(d.t + e.clientY - d.y, 8, innerHeight - 120) + "px", right: "auto", bottom: "auto" });
    else if (IF.fenetre.glisser) { const dy = Math.max(0, e.clientY - d.y); p.style.transform = "translateY(" + dy + "px)"; }
  });
  const fin = e => {
    if (!d) return; const s = d; d = null;
    if (estLarge()) { const r = p.getBoundingClientRect(); if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 4) local.ecrire("pnlXY", { x: r.left, y: r.top }); }
    else { p.style.transform = ""; if (IF.fenetre.glisser && e.clientY - s.y > 90) fermerPanneau(); }
  };
  tete.addEventListener("pointerup", fin); tete.addEventListener("pointercancel", fin);
  tete.addEventListener("dblclick", e => { if (e.target.closest("button")) return; local.ecrire("pnlXY", null); placerPanneau(); });
  addEventListener("resize", () => { if (!p.hidden) placerPanneau(); });

  // outils
  q("#v-note").addEventListener("click", e => {
    const b = e.target.closest("[data-outil]"); if (!b || UI.ignoreClic) return;
    const o = b.dataset.outil;
    if (o === "dicter") return dicteeBasculer("dictee");
    if (DICT.mode === "dictee") dicteeArreter();
    ({ capture: outilCapture, element: outilElement, texte: outilTexte, mesure: outilMesure })[o]();
  });
  // enregistrer
  const saisie = q("#saisie");
  q("#enreg").onclick = enregistrer;
  saisie.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enregistrer(); } });
  saisie.addEventListener("input", () => { if (!DICT.mode) q("#msg").textContent = ""; ajusterHauteur(saisie); });
  q("#pieces").addEventListener("click", e => { const x = e.target.closest("[data-retirer]"); if (!x) return; COMPO.pieces.splice(+x.dataset.retirer, 1); rendrePieces(); });
}
async function enregistrer() {
  if (DICT.mode === "dictee") await dicteeArreter();
  const s = q("#saisie"), txt = s.value;
  if (!txt.trim() && !COMPO.pieces.length) { q("#msg").textContent = "Écris, dicte ou ajoute une capture avant d'enregistrer."; s.focus(); return; }
  const n = await creerNote(txt, UI.via, COMPO.pieces.slice());
  if (!n) return;
  s.value = ""; COMPO.pieces = []; UI.via = "texte"; rendrePieces();
  q("#msg").textContent = "Note enregistrée.";
  toast("Note enregistrée · " + aTraiter().length + " à traiter.", { libelle: "Voir", faire: () => ouvrirPanneau("liste") });
  clearTimeout(UI.fermeT); UI.fermeT = setTimeout(() => { if (IF.fenetre.apresEnreg && UI.vue === "note" && !s.value) fermerPanneau(); q("#msg").textContent = ""; }, 900);
}

function rendrePieces() {
  const ul = q("#pieces");
  ul.innerHTML = COMPO.pieces.map((p, i) => {
    const ico = p.type === "capture" ? "" : `<span class="pic">${ICO[p.type] || ICO.mesure}</span>`;
    const img = p.type === "capture" ? `<img alt="" data-img="${esc(p.image && p.image.cle)}">` : "";
    const sous = p.type === "capture" ? (p.zones || []).map(z => "① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨".split(" ")[z.n - 1] + " " + (z.consigne || "zone")).join(" · ") || "Sans zone entourée"
      : p.type === "element" ? p.selecteur : p.type === "texte" ? (p.remplacement ? "Remplacer par « " + p.remplacement + " »" : "Texte sélectionné") : p.details || "";
    return `<li class="piece">${img}${ico}<span class="pt"><b>${esc(resumePiece(p))}</b><small>${esc(tronquer(sous, 90))}</small></span><button type="button" class="ic" data-retirer="${i}" aria-label="Retirer cette pièce">${ICO.fermer}</button></li>`;
  }).join("");
  COMPO.pieces.forEach(p => { if (p.image) UI.refs.set(p.image.cle, p.image); });
  chargerImages(ul);
}
async function chargerImages(racine) {
  for (const im of racine.querySelectorAll("img[data-img]")) {
    const ref = UI.refs.get(im.dataset.img); if (!ref || im.src) continue;
    const u = await imageUrl(ref); if (u) im.src = u;
  }
}

/* ---------- Rendu général ---------- */
function rendre() {
  if (!RACINE) return;
  rendreBulle();
  q("#nbTodo").textContent = aTraiter().length || "";
  const pnl = q("#pnl"); if (pnl.hidden) return;
  if (UI.vue === "liste") rendreListe();
  else if (UI.vue === "reglages") rendreReglages();
  else if (UI.vue === "interface") rendreInterface();
  RACINE.querySelectorAll('[data-outil="dicter"]').forEach(d => {
    d.classList.toggle("on", DICT.mode === "dictee");
    d.innerHTML = DICT.mode === "dictee" ? ICO.stop + "<span>Arrêter</span>" : ICO.micro + "<span>Dicter</span>";
  });
}

/* ---------- Liste des notes ---------- */
const NUM = "① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ⑪ ⑫".split(" ");
function noteLi(n) {
  const ouvert = UI.ouverts.has(n.uid), edit = UI.edition === n.uid;
  const tags = [];
  if (n.valide) tags.push(`<span class="tag ok">✓ corrigée${n.corrigeeEn ? " en v" + esc(n.corrigeeEn) : ""}</span>`);
  if ((n.rouvertes || []).length) tags.push(`<span class="tag re">↺ rouverte${n.rouvertes.length > 1 ? " ×" + n.rouvertes.length : ""}</span>`);
  if (n.via === "voix") tags.push(`<span title="Dictée">🎤</span>`);
  if (n.version && n.version !== CFG.version) tags.push(`<span class="mono">v${esc(n.version)}</span>`);
  const caps = (n.pieces || []).filter(p => p.type === "capture" && p.image);
  caps.forEach(p => UI.refs.set(p.image.cle, p.image));
  const autres = (n.pieces || []).filter(p => p.type !== "capture");
  const mini = caps.length || autres.length ? `<div class="mini">${caps.map(p => `<img alt="Capture" data-img="${esc(p.image.cle)}">`).join("")}${autres.map(p => `<span class="tag">${esc(tronquer(resumePiece(p), 34))}</span>`).join("")}</div>` : "";
  const corps = edit
    ? `<div class="edition"><textarea data-edit rows="5" aria-label="Modifier la note">${esc(n.texte)}</textarea><div class="pied"><button type="button" class="btn" data-a="annulerEdit">Annuler</button><button type="button" class="btn prim" data-a="sauverEdit">Enregistrer</button></div></div>`
    : `<div class="txt">${esc(n.texte)}</div>`;
  return `<li class="note${n.valide ? " val" : ""}${edit ? " en-edition" : ""}" data-u="${esc(n.uid)}">
    <div class="meta"><b class="quand">${esc(fmtQuand(n.at))}</b><span>·</span><span>${esc(n.ecran || "")}</span>${tags.join("")}</div>
    ${corps}${edit ? "" : mini}
    ${edit ? "" : `<button type="button" class="ic act" data-a="menu" aria-label="Options de la note" aria-haspopup="menu">${ICO.points}</button>`}
    ${ouvert && !edit ? detailsNote(n) : ""}
  </li>`;
}
function detailsNote(n) {
  const b = [];
  for (const p of n.pieces || []) {
    if (p.type === "capture") b.push(`<div class="bloc"><img alt="Capture annotée" data-img="${esc(p.image && p.image.cle)}">${(p.zones || []).map(z => `<div style="margin-top:6px"><span class="numero">${z.n}</span>${esc(z.consigne || "(sans consigne)")}${z.elements && z.elements.length ? `<br><small>${z.elements.map(e => esc(e.t)).join(" · ")}</small>` : ""}</div>`).join("")}${p.textes && p.textes.length ? `<div style="margin-top:6px"><small>Textes écrits sur la capture : ${p.textes.map(t => "« " + esc(t) + " »").join(", ")}</small></div>` : ""}</div>`);
    else if (p.type === "element") b.push(`<div class="bloc"><b>Élément</b> ${esc(p.balise)}${p.texte ? " « " + esc(p.texte) + " »" : ""}<br><code>${esc(p.selecteur)}</code><br><small>${esc(p.taille)} · ${esc(p.styles.police)} · ${esc(p.styles.couleur)} sur ${esc(p.styles.fond)}${p.styles.contraste ? " · contraste " + esc(p.styles.contraste) : ""}</small>${p.image ? `<br><img alt="Élément" data-img="${esc(p.image.cle)}" style="margin-top:6px;max-height:120px">` : ""}</div>`);
    else if (p.type === "texte") b.push(`<div class="bloc"><b>Texte</b> « ${esc(p.texte)} »${p.remplacement ? ` → « ${esc(p.remplacement)} »` : ""}<br><code>${esc(p.element)}</code></div>`);
    else if (p.type === "mesure") b.push(`<div class="bloc"><b>Mesure</b> ${esc(p.resume)}${p.details ? `<br><small>${esc(p.details)}</small>` : ""}</div>`);
    if (p.image) UI.refs.set(p.image.cle, p.image);
  }
  const c = n.contexte;
  if (c) {
    if (c.erreurs && c.erreurs.length) b.push(`<div class="bloc"><b>${c.erreurs.length} erreur${c.erreurs.length > 1 ? "s" : ""} JavaScript</b> avant la note<br>${c.erreurs.slice(-3).map(e => `<code>${esc(e.type)} : ${esc(tronquer(e.message, 140))}</code>`).join("<br>")}</div>`);
    if (c.parcours && c.parcours.length) b.push(`<div class="bloc"><b>Parcours</b><br><small>${c.parcours.slice(-6).map(x => esc(x.type === "écran" ? "→ " + x.ecran : x.type + " " + x.cible)).join("<br>")}</small></div>`);
    if (c.appareil) b.push(`<div class="bloc"><small>${esc(c.appareil.systeme)} · ${esc(c.appareil.navigateur)} · ${esc(c.appareil.ecran)} ×${c.appareil.densite} · ${esc(c.appareil.orientation)} · thème ${esc(c.appareil.theme)}${n.version ? " · appli v" + esc(n.version) : ""}</small></div>`);
  }
  (n.rouvertes || []).forEach(r => b.push(`<div class="bloc"><small>↺ Rouverte le ${esc(fmtQuand(r.at))}${r.version ? " en v" + esc(r.version) : ""}${r.corrigeeEn ? " (avait été corrigée en v" + esc(r.corrigeeEn) + ")" : ""}</small></div>`));
  return `<div class="det">${b.join("") || '<small>Pas de détail joint.</small>'}</div>`;
}
// la zone de texte garde sa taille (la fenêtre ne bouge pas) : c'est le texte qui défile,
// et la fin reste toujours sous les yeux
function ajusterHauteur(ta) { ta.scrollTop = ta.scrollHeight; }
function rendreListe() {
  if (UI.priseNote) return; // pas de redessin pendant qu'on déplace une note
  const v = q("#v-liste"), todo = aTraiter().length, total = ST.notes.length, f = PREFS.filtre;
  if (UI.verif) return rendreVerif(v);
  const st = v.scrollTop;
  const filtres = [["todo", "À traiter", todo], ["ok", "Corrigées", total - todo], ["all", "Toutes", total]]
    .map(([k, t, n]) => `<button type="button" class="puce" data-f="${k}" aria-pressed="${f === k}">${t} (${n})</button>`).join("");
  const liste = ST.notes.filter(n => f === "all" || (f === "todo" ? !n.valide : !!n.valide));
  const vide = !total ? `<li class="vide"><b>Aucune note pour l'instant</b>Touche la bulle en naviguant pour noter ce qui ne va pas.</li>`
    : !liste.length ? `<li class="vide"><b>${f === "todo" ? "Tout est corrigé 🎉" : "Rien ici"}</b>${f === "todo" ? "Aucune note à traiter." : ""}</li>` : "";
  v.innerHTML = `<div class="filtres">${filtres}</div>
    <small data-masquable="aide-liste">Touche une note pour voir le détail · appui long puis glisser pour changer sa priorité · appui long sans bouger pour la modifier · ⋯ pour plus d'actions.</small>
    <ul class="liste">${liste.map(noteLi).join("") || vide}</ul>
    ${todo ? `<div class="barre-fixe" data-masquable="verifier"><button type="button" class="btn prim large" data-a="verifier">▶ Vérifier une par une · ${todo} à traiter</button></div>` : ""}`;
  v.scrollTop = st; chargerImages(v);
  const ta = v.querySelector("textarea[data-edit]"); if (ta && !ta.dataset.f) { ta.dataset.f = 1; ajusterHauteur(ta); ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); ta.addEventListener("input", () => ajusterHauteur(ta)); ta.closest(".note").scrollIntoView({ block: "nearest" }); }
}
function noteDe(el) { const li = el.closest("[data-u]"); return li ? ST.notes.find(n => n.uid === li.dataset.u) : null; }
function brancherListe() {
  const v = q("#v-liste"), m3 = q("#menu3");
  v.addEventListener("click", async e => {
    const f = e.target.closest("[data-f]"); if (f) { PREFS.filtre = f.dataset.f; local.ecrire("prefs", PREFS); return rendreListe(); }
    const a = e.target.closest("[data-a]");
    if (a) {
      const k = a.dataset.a, n = noteDe(a);
      if (k === "verifier") { UI.verif = true; UI.saut.clear(); UI.verifPile = []; UI.verifForce = null; return rendreListe(); }
      if (k === "menu" && n) return ouvrirMenu3(a, n);
      if (k === "annulerEdit") { UI.edition = null; return rendreListe(); }
      if (k === "sauverEdit" && n) { const t = v.querySelector("textarea[data-edit]").value.trim(); UI.edition = null; if (t && t !== n.texte) { await noteModifier(n, { texte: t, modifie: iso() }); toast("Note modifiée."); } return rendreListe(); }
      if (k.startsWith("v-")) return actionVerif(k.slice(2));
      return;
    }
    if (e.target.closest("textarea,button,a")) return;
    const n = noteDe(e.target); if (!n || UI.edition) return;
    UI.ouverts.has(n.uid) ? UI.ouverts.delete(n.uid) : UI.ouverts.add(n.uid); rendreListe();
  });
  // appui long : glisser pour changer la priorité, ou relâcher sans bouger pour modifier
  let lp = null;
  const bloqueDefil = e => { if (lp && lp.actif) e.preventDefault(); };
  v.addEventListener("touchmove", bloqueDefil, { passive: false });
  v.addEventListener("pointerdown", e => {
    const li = e.target.closest(".note"); if (!li || e.button > 0 || e.target.closest("button,textarea") || UI.edition || UI.verif) return;
    lp = { li, x: e.clientX, y: e.clientY, actif: false, bouge: false, pid: e.pointerId };
    lp.t = setTimeout(() => {
      if (!lp) return; lp.actif = true; UI.priseNote = true;
      try { navigator.vibrate && navigator.vibrate(18); } catch (er) {}
      try { v.setPointerCapture(lp.pid); } catch (er) {}
      li.classList.add("prise"); v.classList.add("tri");
    }, 450);
  });
  v.addEventListener("pointermove", e => {
    if (!lp) return;
    if (!lp.actif) { if (Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) { clearTimeout(lp.t); lp = null; } return; }
    if (Math.abs(e.clientY - lp.y) > 6) lp.bouge = true;
    // la note suit le doigt : on l'insère avant la première note dont le milieu est plus bas
    const autres = [...v.querySelectorAll(".liste > .note")].filter(x => x !== lp.li);
    const avant = autres.find(x => { const r = x.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
    lp.li.parentNode.insertBefore(lp.li, avant || null);
    const r = v.getBoundingClientRect();
    if (e.clientY < r.top + 50) v.scrollTop -= 12; else if (e.clientY > r.bottom - 50) v.scrollTop += 12;
  });
  const finTri = async () => {
    if (!lp) return; clearTimeout(lp.t); const s = lp; lp = null; if (!s.actif) return;
    UI.priseNote = false; s.li.classList.remove("prise"); v.classList.remove("tri");
    const n = noteDe(s.li); if (!n) return rendreListe();
    if (!s.bouge) { UI.edition = n.uid; return rendreListe(); }
    const voisin = el => el && el.classList && el.classList.contains("note") ? noteDe(el) : null;
    const haut = voisin(s.li.previousElementSibling), bas = voisin(s.li.nextElementSibling);
    const ordre = haut && bas ? (haut.ordre + bas.ordre) / 2 : haut ? haut.ordre - 60000 : bas ? bas.ordre + 60000 : n.ordre;
    if (ordre !== n.ordre) { await noteModifier(n, { ordre }); trierNotes(); toast("Priorité changée : l'export pour Claude suit cet ordre."); }
    rendreListe();
  };
  v.addEventListener("pointerup", finTri); v.addEventListener("pointercancel", finTri);
  v.addEventListener("contextmenu", e => { const li = e.target.closest(".note"); if (li && !e.target.closest("textarea")) { e.preventDefault(); const n = noteDe(li), b = li.querySelector("[data-a=menu]"); if (n) ouvrirMenu3(b, n); } });
  v.addEventListener("keydown", e => { if (e.target.matches("textarea[data-edit]")) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) v.querySelector("[data-a=sauverEdit]").click(); if (e.key === "Escape") { e.stopPropagation(); UI.edition = null; rendreListe(); } } });

  // menu ⋯
  RACINE.addEventListener("pointerdown", e => { if (!m3.hidden && !e.composedPath().some(x => x === m3 || (x.dataset && x.dataset.a === "menu"))) m3.hidden = true; }, true);
  m3.addEventListener("click", async e => {
    const b = e.target.closest("[data-m]"); if (!b) return; const n = ST.notes.find(x => x.uid === m3.dataset.u); if (!n) { m3.hidden = true; return; }
    const k = b.dataset.m;
    if (k === "suppr" && !b.dataset.c) { b.dataset.c = 1; b.textContent = "Confirmer la suppression"; return; }
    m3.hidden = true;
    if (k === "modifier") { UI.edition = n.uid; rendreListe(); }
    else if (k === "dupliquer") { const c = await creerNote(n.texte, "copie", JSON.parse(JSON.stringify(n.pieces || []))); if (c) { c.ecran = n.ecran; c.copieDe = n.uid; await noteModifier(c, { ecran: n.ecran, copieDe: n.uid }); UI.edition = c.uid; PREFS.filtre = "todo"; rendreListe(); } }
    else if (k === "valider") { await validerNote(n); toast("Note marquée corrigée" + (CFG.version ? " en v" + CFG.version : "") + ".", { libelle: "Annuler", faire: () => noteModifier(n, { valide: null, corrigeeEn: "" }) }); }
    else if (k === "rouvrir") { await rouvrirNote(n); toast("Note rouverte : le problème est revenu."); }
    else if (k === "copier") { const ok = await copier(promptClaude([n])); toast(ok ? "Note copiée, prête à coller dans Claude." : "Copie impossible ici."); }
    else if (k === "suppr") {
      const sauve = JSON.parse(JSON.stringify(n)); await noteSupprimer(n);
      toast("Note supprimée.", { libelle: "Annuler", faire: async () => { delete sauve.id; await noteAjouter(sauve); } });
    }
  });
}
function ouvrirMenu3(bouton, n) {
  const m3 = q("#menu3"), r = bouton.getBoundingClientRect();
  m3.dataset.u = n.uid;
  m3.innerHTML = `<button type="button" role="menuitem" data-m="modifier">Modifier</button>
    <button type="button" role="menuitem" data-m="dupliquer">Dupliquer et modifier</button>
    ${n.valide ? `<button type="button" role="menuitem" data-m="rouvrir">↺ Rouvrir (le problème revient)</button>` : `<button type="button" role="menuitem" data-m="valider">✓ Marquer corrigée${CFG.version ? " en v" + esc(CFG.version) : ""}</button>`}
    <button type="button" role="menuitem" data-m="copier">Copier pour Claude</button>
    <button type="button" role="menuitem" data-m="suppr" class="danger">Supprimer</button>`;
  m3.hidden = false;
  const h = m3.offsetHeight, w = m3.offsetWidth;
  m3.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + "px";
  m3.style.left = borne(r.right - w, 8, innerWidth - w - 8) + "px";
  m3.querySelector("button").focus({ preventScroll: true });
}

/* ---------- Vérification une par une ---------- */
function noteAVerifier() { return ST.notes.filter(n => !n.valide && !UI.saut.has(n.uid)).slice(-1)[0]; } // la plus ancienne d'abord
function rendreVerif(v) {
  const force = UI.verifForce && ST.notes.find(x => x.uid === UI.verifForce);
  const n = force || noteAVerifier(), todo = aTraiter().length, total = ST.notes.length, faites = total - todo;
  const tete = `<div class="verif-tete"><button type="button" class="btn petit" data-a="v-fin" aria-label="Retour à la liste des notes">‹ Notes</button>
    <button type="button" class="btn petit" data-a="v-precedente"${UI.verifPile.length ? "" : " disabled"} aria-label="Revenir à la note précédente">‹ Précédente</button>
    <span class="verif-compte">${faites} / ${total} corrigée${faites > 1 ? "s" : ""}</span></div>
    <div class="barre-prog" aria-hidden="true"><i style="width:${total ? Math.round(faites / total * 100) : 0}%"></i></div>`;
  if (!n) {
    v.innerHTML = `<div class="verif">${tete}<b>${todo ? `Il reste ${todo} note${todo > 1 ? "s" : ""} pas encore corrigée${todo > 1 ? "s" : ""}.` : "Toutes les notes sont corrigées 🎉"}</b>
      ${todo ? `<button type="button" class="btn prim" data-a="v-revoir">Les revoir</button>` : ""}</div>`;
    v.dataset.u = ""; return;
  }
  (n.pieces || []).forEach(p => p.image && UI.refs.set(p.image.cle, p.image));
  const cap = (n.pieces || []).find(p => p.type === "capture" && p.image);
  v.innerHTML = `<div class="verif">${tete}
    <small><b>${esc(fmtQuand(n.at))}</b> · ${esc(n.ecran || "")}${n.valide ? ` · <span class="tag ok">✓ corrigée${n.corrigeeEn ? " en v" + esc(n.corrigeeEn) : ""}</span>` : ""}</small>
    <div class="txt">${esc(n.texte)}</div>
    ${cap ? `<img alt="Capture" data-img="${esc(cap.image.cle)}">` : ""}
    <small>Va vérifier sur l'appli, puis indique si c'est corrigé${CFG.version ? " dans la v" + esc(CFG.version) : ""}.</small>
    <div class="trois"><button type="button" class="btn" data-a="v-plustard">Pas encore</button><button type="button" class="btn" data-a="v-modifier">Modifier</button>${n.valide
      ? `<button type="button" class="btn" data-a="v-nonok">↺ Pas corrigée</button>`
      : `<button type="button" class="btn prim" data-a="v-ok">✓ Corrigé</button>`}</div>
  </div>`;
  v.dataset.u = n.uid; chargerImages(v);
}
async function actionVerif(k) {
  const n = ST.notes.find(x => x.uid === q("#v-liste").dataset.u);
  const suivante = () => { if (n) UI.verifPile.push(n.uid); UI.verifForce = null; };
  if (k === "ok" && n) { await validerNote(n); suivante(); toast("Corrigée" + (CFG.version ? " en v" + CFG.version : "") + ".", { libelle: "Annuler", faire: () => noteModifier(n, { valide: null, corrigeeEn: "" }) }); }
  else if (k === "nonok" && n) { await noteModifier(n, { valide: null, corrigeeEn: "" }); }
  else if (k === "plustard" && n) { UI.saut.add(n.uid); suivante(); }
  else if (k === "precedente" && UI.verifPile.length) { const u = UI.verifPile.pop(); UI.saut.delete(u); UI.verifForce = u; }
  else if (k === "modifier" && n) { UI.verif = false; UI.edition = n.uid; PREFS.filtre = "all"; }
  else if (k === "revoir") { UI.saut.clear(); UI.verifForce = null; }
  else if (k === "fin") UI.verif = false;
  rendreListe();
}

/* ---------- Export et réglages ---------- */
function rendreReglages() {
  const v = q("#v-reglages"), todo = aTraiter().length, attente = (local.lire("attente", []) || []).length;
  const ok = ST.notes.length - todo;
  v.innerHTML = `
    <div class="sec"><h3>Transmettre à Claude</h3>
      <button type="button" class="btn prim" data-r="copier"${todo ? "" : " disabled"}>Copier les ${todo} note${todo > 1 ? "s" : ""} à traiter</button>
      <div class="grille2">
        <button type="button" class="btn" data-r="zip"${ST.notes.length ? "" : " disabled"}>⬇ ZIP avec captures</button>
        <button type="button" class="btn" data-r="json"${ST.notes.length ? "" : " disabled"}>⬇ Pour le tableau de bord</button>
      </div>
      ${CFG.partager ? `<button type="button" class="btn" data-r="partager"${todo ? "" : " disabled"}>Partager (WhatsApp, mail…)</button>` : ""}
      <small data-masquable="aide-export">Le texte copié est rangé par écran, avec les consignes de chaque zone, les éléments repérés et les erreurs. Le ZIP ajoute les captures.</small>
    </div>
    <div class="sec"><h3>Prise de notes</h3>
      <div class="ligne"><span><b>Écoute continue</b><small>Parle en naviguant : chaque phrase devient une note, avec l'écran en cours.</small></span><button type="button" class="bascule" role="switch" aria-label="Écoute continue" aria-checked="${DICT.mode === "ecoute"}" data-r="ecoute"></button></div>
      <div class="ligne"><span><b>Joindre le contexte technique</b><small>Erreurs JavaScript, parcours récent, appareil et état de l'appli.</small></span><button type="button" class="bascule" role="switch" aria-label="Joindre le contexte technique" aria-checked="${PREFS.contexte !== false}" data-r="contexte"></button></div>
      <div class="ligne"><span><b>Bulle à l'écran</b><small>Pour la remettre ensuite : ${CFG.raccourci ? "Ctrl + Maj + D, ou " : ""}le menu de l'appli.</small></span><button type="button" class="bascule" role="switch" aria-label="Bulle à l'écran" aria-checked="${!!PREFS.bulle}" data-r="bulle"></button></div>
    </div>
    <div class="sec"><h3>Ménage</h3>
      <div class="grille2">
        <button type="button" class="btn danger" data-r="viderOk"${ok ? "" : " disabled"}>Effacer les ${ok} corrigée${ok > 1 ? "s" : ""}</button>
        <button type="button" class="btn danger" data-r="viderTout"${ST.notes.length ? "" : " disabled"}>Tout effacer</button>
      </div>
    </div>
    <p class="info">${esc(CFG.projet || "projet")}${CFG.version ? " v" + esc(CFG.version) : ""} · ${ST.notes.length} note${ST.notes.length > 1 ? "s" : ""}<br>
    Rangement : ${ST.mode === "base" ? "base de l'appli" : "cet appareil seulement"}${attente ? " · " + attente + " en attente d'envoi" : ""}${ST.assets ? " · captures dans les fichiers de l'appli" : ""}<br>
    Outil de débogage v${VERSION_OUTIL}${estLarge() ? " · Ctrl+Maj+D ouvrir · Ctrl+Entrée enregistrer · Échap fermer" : ""}</p>`;
  v.onclick = async e => {
    const b = e.target.closest("[data-r]"); if (!b) return; const k = b.dataset.r;
    if (k === "copier") { const ok2 = await copier(promptClaude(aTraiter())); toast(ok2 ? todo + " note(s) copiée(s), prêtes à coller dans Claude." : "Copie impossible ici."); }
    else if (k === "zip") { b.disabled = true; try { await exporterZip(); } finally { b.disabled = false; } }
    else if (k === "json") { b.disabled = true; try { await exporterJson(); } finally { b.disabled = false; } }
    else if (k === "partager") { try { await CFG.partager("notes_debogage_" + (CFG.projet || "projet") + ".txt", promptClaude(aTraiter())); } catch (er) { toast("Partage impossible."); } }
    else if (k === "ecoute") { dicteeBasculer("ecoute"); }
    else if (k === "contexte") { PREFS.contexte = PREFS.contexte === false; local.ecrire("prefs", PREFS); rendreReglages(); }
    else if (k === "bulle") { afficherBulle(!PREFS.bulle); rendreReglages(); }
    else if (k === "viderOk" || k === "viderTout") {
      if (!b.dataset.c) { b.dataset.c = 1; b.textContent = "Confirmer ?"; return; }
      const cible = ST.notes.filter(n => k === "viderTout" || n.valide);
      for (const n of cible) await noteSupprimer(n);
      toast(cible.length + " note(s) effacée(s)."); rendreReglages();
    }
  };
}
