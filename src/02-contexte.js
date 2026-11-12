/* =====================================================================
   Contexte technique joint automatiquement à chaque note :
   erreurs JavaScript, parcours récent, appareil, état de l'appli
   ===================================================================== */
const CTX = { erreurs: [], parcours: [], dernierEcran: "", installe: false };
const pousser = (tab, x, max) => { tab.push(x); if (tab.length > max) tab.splice(0, tab.length - max); };
const fmtArg = a => { if (a instanceof Error) return a.message; if (typeof a === "object") { try { return JSON.stringify(a); } catch (e) { return String(a); } } return String(a); };

function ecranCourant() {
  if (typeof CFG.ecran === "function") { try { const s = CFG.ecran(); if (s) return tronquer(s, 120); } catch (e) {} }
  // détection automatique : fenêtre ouverte, sinon onglet actif, sinon titre de la page
  const visible = e => e && e.offsetParent !== null && !e.closest("[hidden]");
  const dlg = [...document.querySelectorAll('[role="dialog"],[aria-modal="true"],dialog[open]')].filter(visible).pop();
  const titreDlg = dlg && dlg.querySelector("h1,h2,h3,[class*=title],[class*=titre]");
  const onglet = [...document.querySelectorAll('[role="tab"][aria-selected="true"],nav [aria-current="page"],.active[role="tab"]')].find(visible);
  const parts = [];
  if (onglet) parts.push(texteDe(onglet, 40));
  if (titreDlg) parts.push(texteDe(titreDlg, 50));
  if (!parts.length) { const h = [...document.querySelectorAll("h1,h2")].find(visible); if (h) parts.push(texteDe(h, 50)); }
  if (location.hash && location.hash.length > 1 && location.hash.length < 40) parts.push(location.hash);
  return parts.filter(Boolean).join(" › ") || document.title || "Accueil";
}

function appareil() {
  const ua = navigator.userAgent;
  const nav = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const mq = q => window.matchMedia && matchMedia(q).matches;
  return {
    ecran: innerWidth + " × " + innerHeight, densite: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    orientation: innerWidth > innerHeight ? "paysage" : "portrait",
    theme: mq("(prefers-color-scheme: dark)") ? "sombre" : "clair",
    zoom: window.visualViewport ? Math.round(visualViewport.scale * 100) + " %" : "",
    tactile: navigator.maxTouchPoints > 0, systeme: os, navigateur: nav,
    webview: /; wv\)/.test(ua) || !!window.AndroidBridge, enLigne: navigator.onLine,
    agent: ua.slice(0, 180)
  };
}

function etatApp() {
  if (typeof CFG.etat !== "function") return "";
  try { const v = CFG.etat(); return v == null ? "" : tronquer(typeof v === "string" ? v : JSON.stringify(v), 3000); }
  catch (e) { return "(lecture de l'état impossible : " + e.message + ")"; }
}

function contexteNote() {
  const depuis = Date.now() - 10 * 60 * 1000; // erreurs des 10 dernières minutes
  return {
    erreurs: CTX.erreurs.filter(e => Date.parse(e.at) > depuis).slice(-8),
    parcours: CTX.parcours.slice(-12),
    appareil: appareil(),
    etat: etatApp(),
    url: location.href.split("#")[0].slice(0, 200) + (location.hash ? location.hash.slice(0, 60) : "")
  };
}

function installerContexte() {
  if (CTX.installe) return; CTX.installe = true;
  addEventListener("error", e => {
    const t = e.target;
    if (t && t !== window && (t.src || t.href)) { pousser(CTX.erreurs, { at: iso(), type: "ressource", message: "Échec de chargement : " + tronquer(t.src || t.href, 160) }, 30); return; }
    pousser(CTX.erreurs, { at: iso(), type: "erreur", message: tronquer(e.message, 300), source: ((e.filename || "").split("/").pop() || "page") + ":" + (e.lineno || 0) + ":" + (e.colno || 0), pile: e.error && e.error.stack ? tronquer(e.error.stack, 700) : "" }, 30);
  }, true);
  addEventListener("unhandledrejection", e => {
    const r = e.reason;
    pousser(CTX.erreurs, { at: iso(), type: "promesse rejetée", message: tronquer(r && r.message || fmtArg(r), 300), pile: r && r.stack ? tronquer(r.stack, 700) : "" }, 30);
  });
  ["error", "warn"].forEach(k => {
    const orig = console[k];
    console[k] = function (...a) {
      try { pousser(CTX.erreurs, { at: iso(), type: "console." + k, message: tronquer(a.map(fmtArg).join(" "), 400) }, 30); } catch (e) {}
      return orig.apply(this, a);
    };
  });
  // parcours : clics et saisies (sans les valeurs tapées), changements d'écran
  const deMoi = e => HOTE && e.composedPath && e.composedPath().includes(HOTE);
  document.addEventListener("click", e => {
    if (deMoi(e) || OUTIL.actif) return;
    const t = e.target.closest ? (e.target.closest('button,a,[role="button"],[role="tab"],input,select,textarea,label,summary,[onclick],[data-go]') || e.target) : e.target;
    pousser(CTX.parcours, { at: iso(), type: "clic", cible: decrireCourt(t), ecran: ecranCourant() }, 30);
  }, true);
  document.addEventListener("change", e => {
    if (deMoi(e) || OUTIL.actif) return;
    pousser(CTX.parcours, { at: iso(), type: "saisie", cible: decrireCourt(e.target) }, 30);
  }, true);
  const suivreEcran = () => { const s = ecranCourant(); if (s !== CTX.dernierEcran) { CTX.dernierEcran = s; pousser(CTX.parcours, { at: iso(), type: "écran", ecran: s }, 30); } };
  setInterval(suivreEcran, 1000); addEventListener("hashchange", suivreEcran); addEventListener("popstate", suivreEcran);
}
