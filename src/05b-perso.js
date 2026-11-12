/* =====================================================================
   Personnalisation de l'interface
   - apparence de la zone qui ferme la bulle (bande, vague, cible, coin, aucune),
     avec aperçus animés dans l'onglet Interface ;
   - façons de fermer la fenêtre ;
   - outils déplaçables (appui long) dans la barre ou à côté d'« Enregistrer » ;
   - clic droit (ou appui long) pour masquer un outil ou un élément, que l'on
     retrouve ensuite dans l'onglet Interface.
   ===================================================================== */
const DEF_OUTILS = {
  capture: { lib: "Capture", titre: "Figer l'écran et entourer ce qu'il faut modifier", ico: () => ICO.capture },
  element: { lib: "Élément", titre: "Désigner un bouton, un bloc, une image…", ico: () => ICO.element },
  texte: { lib: "Texte", titre: "Sélectionner un texte à changer", ico: () => ICO.texte },
  mesure: { lib: "Mesure", titre: "Règle, écart, couleur, grille", ico: () => ICO.mesure },
  dicter: { lib: "Dicter", titre: "Dicter la note", ico: () => ICO.micro }
};
const MASQUABLES = {
  ecran: "Nom de l'écran, sous le titre",
  compteur: "Compteur sur la bulle",
  "aide-liste": "Aide au-dessus des notes",
  verifier: "Bouton « Vérifier une par une »",
  "aide-export": "Explication sous les boutons d'export"
};
const STYLES_FERMETURE = [
  ["vague", "Vague", "Une vague monte du bas quand la bulle approche ; elle rougit au-dessus de la zone."],
  ["bande", "Bande", "Un dégradé sur toute la largeur du bas de l'écran, avec une croix au centre."],
  ["cible", "Cible", "Un rond à viser au centre, en bas : la bulle s'y pose pour se fermer."],
  ["coin", "Coin", "Un quart de cercle dans le coin en bas à droite, à l'écart du pouce gauche."],
  ["aucune", "Désactivée", "Glisser la bulle la déplace seulement ; on la masque depuis Interface ou le menu de l'appli."]
];

/* ---------- Zone de fermeture ---------- */
function zoneHTML(style) {
  const croix = `<div class="zf-in"><span>✕</span><b>Fermer la bulle</b></div>`;
  if (style === "vague") return `<svg viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 160V60C60 60 80 0 200 0s140 60 200 60v100z"/></svg>` + croix;
  if (style === "bande") return croix;
  if (style === "cible") return `<div class="zf-cible">✕</div><b class="zf-lib">Lâche ici pour fermer</b>`;
  if (style === "coin") return `<div class="zf-coin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg><b>Fermer</b></div>`;
  return "";
}
const CIBLE = () => ({ x: innerWidth / 2, y: innerHeight - 106 });
function proximite(style, x, y) {
  if (style === "bande" || style === "vague") return borne((220 - (innerHeight - y)) / 120, 0, 1);
  if (style === "cible") { const c = CIBLE(); return borne((320 - Math.hypot(x - c.x, y - c.y)) / 220, 0, 1); }
  if (style === "coin") return borne((360 - Math.hypot(innerWidth - x, innerHeight - y)) / 200, 0, 1);
  return 0;
}
function estChaud(style, x, y) {
  if (style === "bande" || style === "vague") return y > innerHeight - 110;
  if (style === "cible") { const c = CIBLE(); return Math.hypot(x - c.x, y - c.y) < 70; }
  if (style === "coin") return Math.hypot(innerWidth - x, innerHeight - y) < 150;
  return false;
}

/* ---------- Appliquer les réglages ---------- */
function rendreOutils() {
  const btn = id => { const d = DEF_OUTILS[id]; return `<button type="button" data-outil="${id}" data-masquable="outil:${id}" title="${esc(d.titre)}" aria-label="${esc(d.lib)}">${d.ico()}<span>${esc(d.lib)}</span></button>`; };
  q("#outilsBarre").innerHTML = IF.outils.barre.map(btn).join("");
  q("#outilsPied").innerHTML = IF.outils.pied.map(btn).join("");
  q("#outilsBarre").classList.toggle("vide", !IF.outils.barre.length);
  q("#outilsPied").classList.toggle("vide", !IF.outils.pied.length);
}
function appliquerInterface() {
  if (!RACINE) return;
  rendreOutils();
  q("#stMasques").textContent = IF.masques.length ? IF.masques.map(m => `[data-masquable="${m}"]`).join(",") + "{display:none!important}" : "";
  const z = q("#zoneFerm"); z.dataset.style = IF.fermeture; z.innerHTML = zoneHTML(IF.fermeture);
  q("#bulle").dataset.taille = IF.tailleBulle;
  appliquerTheme();
  rendre();
}
const libelleMasquable = m => m.startsWith("outil:") ? "Outil " + DEF_OUTILS[m.slice(6)].lib : MASQUABLES[m] || m;
function masquer(m) {
  const avant = JSON.stringify(IF);
  if (m.startsWith("outil:")) { const id = m.slice(6); IF.outils.barre = IF.outils.barre.filter(x => x !== id); IF.outils.pied = IF.outils.pied.filter(x => x !== id); if (!IF.outils.masques.includes(id)) IF.outils.masques.push(id); }
  else if (!IF.masques.includes(m)) IF.masques.push(m);
  sauverInterface();
  toast("« " + libelleMasquable(m) + " » masqué. Tu le retrouves dans Interface.", { libelle: "Annuler", faire: () => { Object.assign(IF, JSON.parse(avant)); sauverInterface(); } });
}
function reafficher(m) {
  if (m.startsWith("outil:")) { const id = m.slice(6); IF.outils.masques = IF.outils.masques.filter(x => x !== id); if (!IF.outils.barre.includes(id) && !IF.outils.pied.includes(id)) IF.outils.barre.push(id); }
  else IF.masques = IF.masques.filter(x => x !== m);
  sauverInterface();
}
function placerOutil(id, zone, index) {
  ["barre", "pied", "masques"].forEach(k => IF.outils[k] = IF.outils[k].filter(x => x !== id));
  const l = IF.outils[zone]; l.splice(index == null ? l.length : borne(index, 0, l.length), 0, id);
  sauverInterface();
}

/* ---------- Gestes : appui long pour déplacer, clic droit pour masquer ---------- */
function brancherPerso() {
  const vn = q("#v-note"), m3 = q("#menu3"), pnl = q("#pnl");
  let g = null;
  const zones = () => [["masquer", q("#zoneMasquer")], ["barre", q("#outilsBarre")], ["pied", q("#outilsPied")]];
  const dedans = (el, x, y, marge) => { const r = el.getBoundingClientRect(); return r.width && x >= r.left - marge && x <= r.right + marge && y >= r.top - marge && y <= r.bottom + marge; };

  function debuter() {
    g.actif = true; try { navigator.vibrate && navigator.vibrate(20); } catch (e) {}
    pnl.classList.add("reorg"); q("#zoneMasquer").hidden = false;
    g.b.classList.add("enDeplacement");
    g.fantome = document.createElement("div"); g.fantome.className = "fantome"; g.fantome.innerHTML = g.b.innerHTML;
    q(".r").appendChild(g.fantome); g.repere = document.createElement("i"); g.repere.className = "repere";
    suivre(g.x, g.y);
  }
  function suivre(x, y) {
    g.fantome.style.left = x + "px"; g.fantome.style.top = y + "px";
    g.cible = null; q("#zoneMasquer").classList.remove("chaud"); g.repere.remove();
    for (const [nom, el] of zones()) {
      if (!dedans(el, x, y, nom === "masquer" ? 4 : 18)) continue;
      g.cible = nom;
      if (nom === "masquer") { q("#zoneMasquer").classList.add("chaud"); break; }
      const enfants = [...el.children].filter(c => c !== g.b && c.dataset.outil);
      const avant = enfants.find(c => { const r = c.getBoundingClientRect(); return x < r.left + r.width / 2; });
      el.insertBefore(g.repere, avant || null);
      g.index = avant ? enfants.indexOf(avant) : enfants.length;
      break;
    }
  }
  function finir(s) {
    pnl.classList.remove("reorg"); q("#zoneMasquer").hidden = true; q("#zoneMasquer").classList.remove("chaud");
    s.b.classList.remove("enDeplacement"); s.fantome && s.fantome.remove(); s.repere && s.repere.remove();
    if (!s.bouge) return ouvrirMenuPerso(s.b, s.x, s.y);           // appui long sans bouger : menu (téléphone)
    if (s.cible === "masquer") return masquer("outil:" + s.id);
    if (s.cible === "barre" || s.cible === "pied") { placerOutil(s.id, s.cible, s.index); toast(s.cible === "pied" ? "Outil placé à côté d'Enregistrer." : "Outil placé dans la barre."); }
  }
  vn.addEventListener("pointerdown", e => {
    const b = e.target.closest("[data-outil]"); if (!b || e.button > 0) return;
    g = { b, id: b.dataset.outil, x: e.clientX, y: e.clientY, actif: false, bouge: false };
    try { b.setPointerCapture(e.pointerId); } catch (er) {}
    g.t = setTimeout(() => { if (g) debuter(); }, 450);
  });
  vn.addEventListener("pointermove", e => {
    if (!g) return;
    if (!g.actif) { if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) { clearTimeout(g.t); g = null; } return; }
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.bouge = true;
    suivre(e.clientX, e.clientY);
  });
  const fin = () => { if (!g) return; clearTimeout(g.t); const s = g; g = null; if (!s.actif) return; UI.ignoreClic = true; setTimeout(() => { UI.ignoreClic = false; }, 400); finir(s); };
  vn.addEventListener("pointerup", fin); vn.addEventListener("pointercancel", fin);

  // clic droit (ou appui long natif) sur un élément masquable ou sur la bulle
  RACINE.addEventListener("contextmenu", e => {
    if (e.defaultPrevented || e.target.closest("textarea,input")) return;
    const cible = e.target.closest("[data-masquable]") || e.target.closest("#bulle"); if (!cible) return;
    e.preventDefault(); if (g) return;
    ouvrirMenuPerso(cible, e.clientX, e.clientY);
  });
  m3.addEventListener("click", e => {
    const b = e.target.closest("[data-p]"); if (!b) return; m3.hidden = true;
    const k = b.dataset.p, m = m3.dataset.perso;
    if (k === "masquer") masquer(m);
    else if (k === "pied" || k === "barre") { placerOutil(m.slice(6), k); toast(k === "pied" ? "Outil placé à côté d'Enregistrer." : "Outil remis dans la barre."); }
    else if (k === "interface") ouvrirPanneau("interface");
    else if (k === "bulle") { fermerPanneau(); afficherBulle(false); toast("Bulle masquée.", { libelle: "Annuler", faire: () => afficherBulle(true) }); }
  });
  // toucher à côté de la fenêtre pour la fermer
  document.addEventListener("pointerdown", e => {
    if (!IF.fenetre.cote || OUTIL.actif || !HOTE || q("#pnl").hidden || e.composedPath().includes(HOTE)) return;
    fermerPanneau();
  }, true);
}
function ouvrirMenuPerso(cible, x, y) {
  const m3 = q("#menu3"), m = cible.dataset.masquable || "bulle", items = [];
  if (m === "bulle") { items.push(["bulle", "Masquer la bulle"]); if (!IF.masques.includes("compteur")) items.push(["masquer", "Masquer le compteur"]); m3.dataset.perso = "compteur"; }
  else {
    m3.dataset.perso = m;
    if (m.startsWith("outil:")) { const id = m.slice(6); items.push(IF.outils.pied.includes(id) ? ["barre", "Remettre dans la barre d'outils"] : ["pied", "Placer à côté d'Enregistrer"]); }
    items.push(["masquer", "Masquer « " + (m.startsWith("outil:") ? DEF_OUTILS[m.slice(6)].lib : libelleMasquable(m)) + " »"]);
  }
  items.push(["interface", "Réglages de l'interface…"]);
  m3.dataset.u = "";
  const aide = m.startsWith("outil:") ? `<p class="menu-aide"><b>${esc(DEF_OUTILS[m.slice(6)].lib)}</b>${esc(DEF_OUTILS[m.slice(6)].titre)}. Appui long puis glisser pour le déplacer.</p>` : "";
  m3.innerHTML = aide + items.map(([k, t]) => `<button type="button" role="menuitem" data-p="${k}">${esc(t)}</button>`).join("");
  m3.hidden = false;
  const w = m3.offsetWidth, h = m3.offsetHeight;
  m3.style.left = borne(x - w / 2, 8, innerWidth - w - 8) + "px";
  m3.style.top = (y + h + 12 > innerHeight ? Math.max(8, y - h - 8) : y + 8) + "px";
  m3.querySelector("button").focus({ preventScroll: true });
}

/* ---------- Onglet Interface ---------- */
let apercuT = 0;
function rendreInterface() {
  const v = q("#v-interface");
  const st = v.scrollTop;
  const bascule = (k, titre, sous) => `<div class="ligne"><span><b>${titre}</b><small>${sous}</small></span><button type="button" class="bascule" role="switch" aria-label="${esc(titre)}" aria-checked="${!!IF.fenetre[k]}" data-i="fenetre" data-k="${k}"></button></div>`;
  const tousMasques = IF.outils.masques.map(id => "outil:" + id).concat(IF.masques);
  v.innerHTML = `
    <div class="sec"><h3>Fermer la bulle en la glissant vers le bas</h3>
      <div class="cartesF" role="radiogroup" aria-label="Apparence de la zone de fermeture">${STYLES_FERMETURE.map(([k, t, d]) => `
        <button type="button" class="carteF" role="radio" aria-checked="${IF.fermeture === k}" data-i="fermeture" data-v="${k}">
          <span class="apercu" data-style="${k}" data-phase="0" aria-hidden="true"><span class="faux"><i></i><i></i><i></i><i></i></span><span class="zf" data-style="${k}">${zoneHTML(k)}</span><span class="ab"></span></span>
          <span class="carteF-t"><b>${t}</b>${IF.fermeture === k ? '<em>✓ choisie</em>' : ""}</span><small>${d}</small>
        </button>`).join("")}</div>
      <small>Touche une apparence pour la choisir : elle s'affiche un instant en vrai, en bas de l'écran.</small>
    </div>
    <div class="sec"><h3>Fermer la fenêtre</h3>
      ${bascule("glisser", "Glisser vers le bas", "Sur téléphone, en tirant le haut de la fenêtre.")}
      ${bascule("cote", "Toucher à côté", "Un toucher sur l'appli ferme la fenêtre.")}
      ${bascule("echap", "Touche Échap", "Sur ordinateur.")}
      ${bascule("apresEnreg", "Après l'enregistrement d'une note", "La fenêtre se referme seule pour continuer à naviguer.")}
      <small>La croix ✕ en haut reste toujours disponible.</small>
    </div>
    <div class="sec"><h3>Outils de la note</h3>
      <small>Appui long sur une icône pour la déplacer : dans la barre, à côté d'« Enregistrer la note », ou sur « masquer ». Clic droit pour la masquer.</small>
      ${OUTILS_ORDRE.map(id => { const pos = IF.outils.pied.includes(id) ? "pied" : IF.outils.masques.includes(id) ? "masques" : "barre"; return `
        <div class="ligne ligneOutil"><span class="pic">${DEF_OUTILS[id].ico()}</span><b>${DEF_OUTILS[id].lib}</b>
          <span class="segment" role="radiogroup" aria-label="Place de l'outil ${DEF_OUTILS[id].lib}">${[["barre", "En haut"], ["pied", "En bas"], ["masques", "Masqué"]].map(([k, t]) => `<button type="button" role="radio" aria-checked="${pos === k}" data-i="outil" data-id="${id}" data-v="${k}">${t}</button>`).join("")}</span></div>`; }).join("")}
      <small>« En bas » = à côté du bouton « Enregistrer la note ».</small>
    </div>
    <div class="sec"><h3>Éléments masqués (${tousMasques.length})</h3>
      ${tousMasques.length ? tousMasques.map(m => `<div class="ligne"><span><b>${esc(libelleMasquable(m))}</b></span><button type="button" class="btn petit" data-i="reafficher" data-v="${esc(m)}">Réafficher</button></div>`).join("")
        : `<small>Aucun. Clic droit (ou appui long) sur un outil, le nom de l'écran, le compteur de la bulle… pour le masquer.</small>`}
    </div>
    <div class="sec"><h3>Couleurs</h3>
      <div class="ligne"><span><b>Apparence de l'outil</b><small>${themeCalcule && IF.couleurs === "appli" ? (themeCalcule.detectee ? "Couleur de l'appli détectée : <span class=\"nuance\"><i style=\"background:" + esc(themeCalcule.detectee) + "\"></i><b class=\"mono\">" + esc(themeCalcule.detectee) + "</b></span>" : "Pas de couleur principale détectée : ambre par défaut.") : "Reprend le fond, la couleur principale et la police de l'appli."}</small></span></div>
      <span class="segment large" role="radiogroup" aria-label="Couleurs de l'outil">${[["appli", "Comme l'appli"], ["neutre", "Neutre"], ["clair", "Clair"], ["sombre", "Sombre"]].map(([k, t]) => `<button type="button" role="radio" aria-checked="${(IF.couleurs || "appli") === k}" data-i="couleurs" data-v="${k}">${t}</button>`).join("")}</span>
    </div>
    <div class="sec"><h3>Bulle</h3>
      <div class="ligne"><span><b>Taille</b></span><span class="segment" role="radiogroup" aria-label="Taille de la bulle">${[["petite", "Petite"], ["normale", "Normale"], ["grande", "Grande"]].map(([k, t]) => `<button type="button" role="radio" aria-checked="${IF.tailleBulle === k}" data-i="taille" data-v="${k}">${t}</button>`).join("")}</span></div>
    </div>
    <div class="sec"><h3>Fenêtres des outils</h3>
      <small>Chaque fenêtre (Capture, Élément, Texte, Mesure) se déplace par sa poignée ⠿ ou par son fond, et retient sa place. Double-toucher la poignée la remet à sa place d'origine.</small>
      <button type="button" class="btn" data-i="fenetres"${Object.keys(FEN.lire()).length ? "" : " disabled"}>Remettre toutes les fenêtres à leur place</button>
    </div>
    <button type="button" class="btn" data-i="reinit">Rétablir l'interface d'origine</button>`;
  v.scrollTop = st;
  v.onclick = e => {
    const b = e.target.closest("[data-i]"); if (!b) return; const k = b.dataset.i;
    if (k === "fermeture") { IF.fermeture = b.dataset.v; sauverInterface(); demontrerFermeture(); }
    else if (k === "fenetre") { IF.fenetre[b.dataset.k] = !IF.fenetre[b.dataset.k]; sauverInterface(); }
    else if (k === "outil") placerOutil(b.dataset.id, b.dataset.v);
    else if (k === "reafficher") { reafficher(b.dataset.v); toast("Réaffiché."); }
    else if (k === "taille") { IF.tailleBulle = b.dataset.v; sauverInterface(); }
    else if (k === "couleurs") { IF.couleurs = b.dataset.v; sauverInterface(); }
    else if (k === "fenetres") { FEN.ecrire({}); toast("Fenêtres remises à leur place."); rendreInterface(); }
    else if (k === "reinit") { if (!b.dataset.c) { b.dataset.c = 1; b.textContent = "Confirmer : tout remettre comme au départ ?"; return; } Object.assign(IF, INTERFACE_DEFAUT()); FEN.ecrire({}); sauverInterface(); toast("Interface d'origine rétablie."); }
  };
  animerApercus();
}
// Aperçus : la mini-bulle descend, la zone apparaît, rougit, puis la bulle disparaît
function animerApercus() {
  clearInterval(apercuT);
  const reduit = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tous = () => RACINE.querySelectorAll("#v-interface .apercu");
  if (reduit) { tous().forEach(a => a.dataset.phase = "2"); return; }
  let ph = 0;
  apercuT = setInterval(() => {
    if (q("#pnl").hidden || UI.vue !== "interface") { clearInterval(apercuT); return; }
    ph = (ph + 1) % 4; tous().forEach(a => a.dataset.phase = String(ph));
  }, 900);
}
// Démonstration en vrai, en bas de l'écran
function demontrerFermeture() {
  const z = q("#zoneFerm"); if (IF.fermeture === "aucune") { toast("Fermeture désactivée : glisser la bulle la déplace seulement."); return; }
  z.hidden = false; z.classList.add("pres", "demo"); z.style.setProperty("--p", "1");
  setTimeout(() => z.classList.add("chaud"), 500);
  setTimeout(() => { z.classList.remove("pres", "chaud", "demo"); z.hidden = true; }, 1600);
}

/* ---------- Couleurs : s'adapter à l'appli ----------
   « appli »  : reprend la couleur principale, le fond (clair ou sombre) et la police de l'appli ;
   « neutre » : graphite et ambre, quelle que soit l'appli ;
   « clair » / « sombre » : surfaces imposées, couleur principale de l'appli.
   L'appli peut aussi imposer ses couleurs : Debogage.init({ couleurs: { accent, fond, texte } }). */
let ctxCouleur = null;
function normaliserCouleur(c) {
  if (!c) return null;
  ctxCouleur = ctxCouleur || document.createElement("canvas").getContext("2d");
  ctxCouleur.fillStyle = "#010203"; ctxCouleur.fillStyle = String(c).trim();
  const v = ctxCouleur.fillStyle; if (v === "#010203" && !/^#010203$/i.test(String(c).trim())) return null;
  if (v.startsWith("#")) return "rgb(" + parseInt(v.slice(1, 3), 16) + ", " + parseInt(v.slice(3, 5), 16) + ", " + parseInt(v.slice(5, 7), 16) + ")";
  const r = rgbDe(v); return r && r.a > 0.5 ? "rgb(" + r.r + ", " + r.g + ", " + r.b + ")" : null;
}
function saturation(c) { const r = rgbDe(c); if (!r) return 0; const mx = Math.max(r.r, r.g, r.b) / 255, mn = Math.min(r.r, r.g, r.b) / 255, l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); }
function couleursAppli() {
  const imp = CFG.couleurs || {}, root = getComputedStyle(document.documentElement);
  let acc = normaliserCouleur(imp.accent);
  for (const v of ["--accent", "--acc", "--primary", "--color-primary", "--primary-color", "--brand", "--brand-color", "--color-accent", "--couleur-principale", "--primaire", "--main-color", "--theme-color"]) {
    if (acc) break; const x = normaliserCouleur(root.getPropertyValue(v)); if (x && saturation(x) > 0.25) acc = x;
  }
  if (!acc) { const m = document.querySelector('meta[name="theme-color"]'); const x = m && normaliserCouleur(m.content); if (x && saturation(x) > 0.25) acc = x; }
  if (!acc) {
    // couleur de fond la plus présente sur les boutons et liens colorés de l'appli
    const poids = new Map();
    [...document.querySelectorAll('button,a,[role="button"],input[type="submit"]')].slice(0, 300).forEach(el => {
      if (HOTE && HOTE.contains(el)) return;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (!r.width) return;
      for (const c of [cs.backgroundColor, cs.color]) { const x = normaliserCouleur(c); if (x && saturation(x) > 0.35) { poids.set(x, (poids.get(x) || 0) + (c === cs.backgroundColor ? r.width * r.height : 200)); break; } }
    });
    acc = [...poids.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || null;
  }
  const fond = normaliserCouleur(imp.fond) || normaliserCouleur(fondPage()) || "rgb(255, 255, 255)";
  const texte = normaliserCouleur(imp.texte) || normaliserCouleur(getComputedStyle(document.body).color);
  return { acc, fond, texte, police: getComputedStyle(document.body).fontFamily };
}
// éclaircit ou fonce une couleur jusqu'à un contraste suffisant sur le fond donné
function ajusterContraste(c, fond, mini) {
  let r = rgbDe(c); const sombre = luminance(rgbDe(fond)) < 0.4;
  for (let k = 0; k < 20 && contraste("rgb(" + r.r + "," + r.g + "," + r.b + ")", fond) < mini; k++) {
    r = sombre ? { r: r.r + (255 - r.r) * 0.12, g: r.g + (255 - r.g) * 0.12, b: r.b + (255 - r.b) * 0.12 } : { r: r.r * 0.88, g: r.g * 0.88, b: r.b * 0.88 };
  }
  return "rgb(" + Math.round(r.r) + ", " + Math.round(r.g) + ", " + Math.round(r.b) + ")";
}
const SURFACES = {
  sombre: { fond: "#1D2024", fond2: "#262A2F", fond3: "#30353B", trait: "#3C434B", txt: "#EEF0F2", doux: "#AEB4BC" },
  clair: { fond: "#FFFFFF", fond2: "#F2F3F5", fond3: "#E5E8EC", trait: "#D3D8DE", txt: "#16181B", doux: "#5A616B" }
};
let themeCalcule = null;
function appliquerTheme() {
  if (!RACINE) return;
  const r = q(".r"), mode = IF.couleurs || "appli";
  const info = mode === "neutre" ? {} : couleursAppli();
  const lf = info.fond && rgbDe(info.fond);
  const clair = mode === "clair" || (mode === "appli" && !!lf && luminance(lf) > 0.4);
  const S = SURFACES[clair ? "clair" : "sombre"];
  let acc = mode === "neutre" || !info.acc ? "rgb(255, 178, 36)" : info.acc;
  acc = ajusterContraste(acc, S.fond2, 3);
  const enc = contraste(acc, "#ffffff") >= contraste(acc, "#16181b") ? "#FFFFFF" : "#16181B";
  Object.entries(S).forEach(([k, v]) => r.style.setProperty("--" + k, v));
  r.style.setProperty("--acc", acc); r.style.setProperty("--acc-enc", enc);
  r.style.setProperty("--police", mode === "appli" && info.police ? info.police : "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", sans-serif");
  r.dataset.theme = clair ? "clair" : "sombre";
  themeCalcule = { mode, acc: versHex(acc), clair, detectee: info.acc ? versHex(info.acc) : "" };
}
