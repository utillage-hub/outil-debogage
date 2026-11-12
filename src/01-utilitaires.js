/* =====================================================================
   Utilitaires communs
   ===================================================================== */

// Réglages de l'intégration (complétés par Debogage.init)
const CFG = {
  projet: "",            // nom court du projet : « mon-appli »…
  version: "",           // version de l'appli testée : « 2.19 »
  ecran: null,           // () => "Saisie › étape montant" ; sinon détection automatique
  etat: null,            // () => ({ periode, filtre… }) : instantané joint à chaque note
  db: "auto",            // "auto" (base de l'artifact si dispo) | objet base | false (appareil seulement)
  collection: "debugnotes",
  bulle: true,           // bulle visible au démarrage (sauf si l'utilisateur l'a fermée)
  langue: "fr-FR",
  raccourci: true,       // Ctrl+Maj+D
  partager: null,        // (nomFichier, texte) => … : partage natif (Android)
  telecharger: null,     // (nomFichier, blob) => … : remplace le téléchargement par défaut
  ecouter: null,         // async () => texte : reconnaissance vocale native (Android)
  ignorer: "[data-debogage-ignorer]", // éléments jamais capturés (données sensibles)
  surNote: null          // (note) => … : appelé après chaque nouvelle note
};

const iso = () => new Date().toISOString();
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tronquer = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
const attendre = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function fmtQuand(s) {
  const d = new Date(s); if (isNaN(d)) return "";
  const auj = new Date(); const memeJour = d.toDateString() === auj.toDateString();
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return memeJour ? "Aujourd'hui " + h : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " + h;
}
const fmtNb = n => String(Math.round(n * 10) / 10).replace(".", ",");

// Stockage local, rangé par projet
const cle = k => "debogage:" + (CFG.projet || location.pathname) + ":" + k;
const local = {
  lire(k, defaut) { try { const v = localStorage.getItem(cle(k)); return v == null ? defaut : JSON.parse(v); } catch (e) { return defaut; } },
  ecrire(k, v) { try { if (v == null) localStorage.removeItem(cle(k)); else localStorage.setItem(cle(k), JSON.stringify(v)); } catch (e) {} }
};

// Couleurs
function versHex(c) {
  const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return c;
  const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
  const hex = "#" + p.slice(0, 3).map(x => Math.round(x).toString(16).padStart(2, "0")).join("");
  return p.length > 3 && p[3] < 1 ? hex + " (" + Math.round(p[3] * 100) + " %)" : hex;
}
function rgbDe(c) {
  const h = String(c || "").trim().match(/^#([0-9a-f]{6})$/i);
  if (h) return { r: parseInt(h[1].slice(0, 2), 16), g: parseInt(h[1].slice(2, 4), 16), b: parseInt(h[1].slice(4, 6), 16), a: 1 };
  const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
function luminance({ r, g, b }) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function contraste(c1, c2) { const a = rgbDe(c1), b = rgbDe(c2); if (!a || !b) return null; const l1 = luminance(a), l2 = luminance(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }

// Fond réellement visible derrière un élément
function fondEffectif(el) {
  let n = el;
  while (n && n.nodeType === 1) {
    const c = getComputedStyle(n).backgroundColor, v = rgbDe(c);
    if (v && v.a > 0.05) return c;
    n = n.parentElement;
  }
  return "rgb(255, 255, 255)";
}

/* ---------- Décrire un élément de la page (pour Claude) ---------- */
const idStable = id => id && !/\d{5,}|^[a-f0-9-]{16,}$/i.test(id);
function selecteur(el) {
  if (!el || el.nodeType !== 1) return "";
  if (idStable(el.id)) return "#" + CSS.escape(el.id);
  const parts = []; let n = el;
  while (n && n.nodeType === 1 && n !== document.body && n !== document.documentElement && parts.length < 5) {
    if (idStable(n.id)) { parts.unshift("#" + CSS.escape(n.id)); break; }
    let p = n.tagName.toLowerCase();
    const cls = [...n.classList].filter(c => c.length < 32 && !/^(on|active|open|hover|focus|is-|has-|js-)/.test(c)).slice(0, 2);
    if (cls.length) p += "." + cls.map(c => CSS.escape(c)).join(".");
    const par = n.parentElement;
    if (par) { const memes = [...par.children].filter(c => c.tagName === n.tagName); if (memes.length > 1) p += ":nth-of-type(" + (memes.indexOf(n) + 1) + ")"; }
    parts.unshift(p); n = n.parentElement;
  }
  return parts.join(" > ");
}
function texteDe(el, n) {
  if (!el || el.nodeType !== 1) return "";
  const a = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("placeholder") || el.getAttribute("alt");
  const t = a || (el.tagName === "INPUT" || el.tagName === "TEXTAREA" ? "" : (el.innerText || el.textContent || ""));
  return tronquer(t.replace(/\s+/g, " ").trim(), n || 80);
}
function decrireCourt(el) {
  if (!el || el.nodeType !== 1) return "";
  const t = texteDe(el, 50);
  return el.tagName.toLowerCase() + (t ? " « " + t + " »" : "") + (idStable(el.id) ? " #" + el.id : "");
}
function decrireElement(el) {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el), fond = fondEffectif(el);
  const ct = contraste(cs.color, fond);
  return {
    selecteur: selecteur(el), balise: el.tagName.toLowerCase(), texte: texteDe(el, 120),
    role: el.getAttribute("role") || "",
    taille: Math.round(r.width) + " × " + Math.round(r.height) + " px",
    position: "x " + Math.round(r.left) + ", y " + Math.round(r.top),
    styles: {
      police: cs.fontSize + " " + cs.fontWeight + " " + cs.fontFamily.split(",")[0].replace(/["']/g, ""),
      couleur: versHex(cs.color), fond: versHex(fond),
      contraste: ct ? fmtNb(ct) + ":1" + (ct < 4.5 ? " (insuffisant, viser 4,5:1)" : "") : "",
      marges: cs.margin, retraits: cs.padding,
      bordure: cs.borderTopWidth !== "0px" ? cs.borderTopWidth + " " + cs.borderTopStyle + " " + versHex(cs.borderTopColor) : "",
      rayon: cs.borderRadius !== "0px" ? cs.borderRadius : ""
    }
  };
}

/* ---------- Ce qui se trouve dans une zone de l'écran ---------- */
function elementSous(x, y) {
  const liste = document.elementsFromPoint(x, y) || [];
  return liste.find(e => e !== HOTE && !(HOTE && HOTE.contains(e)) && e !== document.documentElement && e !== document.body) || null;
}
function elementsDansZone(r) {
  const vus = new Map(), pas = 6;
  for (let i = 0; i <= pas; i++) for (let j = 0; j <= pas; j++) {
    const x = r.x + r.w * (0.05 + 0.9 * i / pas), y = r.y + r.h * (0.05 + 0.9 * j / pas);
    let e = elementSous(x, y); if (!e) continue;
    // on remonte au premier élément qui porte du texte ou un rôle
    let k = e; while (k && k !== document.body && !texteDe(k, 40) && !/^(BUTTON|A|INPUT|SELECT|IMG|SVG|CANVAS)$/.test(k.tagName)) k = k.parentElement;
    if (k && k !== document.body) vus.set(k, (vus.get(k) || 0) + 1);
  }
  // les plus présents d'abord, sans garder un parent et son enfant
  const tri = [...vus.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const garde = [];
  for (const e of tri) { if (garde.some(g => g.contains(e) || e.contains(g))) continue; garde.push(e); if (garde.length >= 6) break; }
  return garde.map(e => ({ s: selecteur(e), t: decrireCourt(e) }));
}

// Téléchargement : hook de l'appli, capacité « downloads » d'un artifact, ou lien classique
async function telecharger(nom, blob) {
  if (CFG.telecharger) return CFG.telecharger(nom, blob);
  try {
    const dl = window.claude && window.claude.use ? await Promise.race([window.claude.use("downloads"), attendre(1500).then(() => null)]) : null;
    if (dl) { await dl.save({ filename: nom, data: blob }); return true; }
  } catch (e) { if (e && e.code === "declined") return false; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  return true;
}
async function copier(texte) {
  try { await navigator.clipboard.writeText(texte); return true; }
  catch (e) {
    const t = document.createElement("textarea"); t.value = texte; t.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (er) {} t.remove(); return ok;
  }
}
