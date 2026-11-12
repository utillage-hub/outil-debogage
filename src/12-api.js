/* =====================================================================
   API publique : window.Debogage
   ===================================================================== */
let demarre = false;
async function init(options) {
  if (demarre) { Object.assign(CFG, options || {}); rendre(); return API; }
  demarre = true;
  Object.assign(CFG, options || {});
  if (!CFG.projet) CFG.projet = (document.title || location.hostname || "projet").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  Object.assign(PREFS, local.lire("prefs", {}) || {});
  chargerInterface();
  if (PREFS.bulle == null) PREFS.bulle = !!CFG.bulle;
  if (/[?&#]debug(=1|ogage)?\b/.test(location.search + location.hash)) PREFS.bulle = true;
  installerContexte();
  const go = () => {
    construireUI();
    ST.abonnes.add(() => rendre());
    rendre();
    stockageInit();
    dicteePreparer();
    addEventListener("keydown", e => {
      if (CFG.raccourci && (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault(); if (!PREFS.bulle) afficherBulle(true);
        if (q("#pnl").hidden) ouvrirPanneau("note"); else fermerPanneau();
      } else if (e.key === "Escape" && IF.fenetre.echap && !OUTIL.actif && !q("#pnl").hidden && q("#menu3").hidden) { fermerPanneau(); }
    }, true);
    addEventListener("online", viderAttente);
  };
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  return API;
}

const API = {
  __charge: true,
  version: VERSION_OUTIL,
  init,
  /** Afficher / masquer la bulle (à relier au menu de l'appli). */
  afficher: () => afficherBulle(true),
  masquer: () => { fermerPanneau(); afficherBulle(false); },
  basculer: () => afficherBulle(!PREFS.bulle),
  estAffichee: () => !!PREFS.bulle,
  /** Ouvrir la fenêtre : "note" | "liste" | "reglages" | "interface". */
  /** Remettre l'interface d'origine (apparence, disposition des outils, éléments masqués). */
  reinitialiserInterface: () => { Object.assign(IF, INTERFACE_DEFAUT()); sauverInterface(); rendre(); },
  ouvrir: vue => { if (!PREFS.bulle) afficherBulle(true); ouvrirPanneau(vue || "note"); },
  fermer: () => fermerPanneau(),
  /** Ajouter une note par programme (ex. depuis un bouton « Signaler » de l'appli). */
  noter: (texte, pieces) => creerNote(texte, "appli", pieces || []),
  /** Notes (copie) et abonnement aux changements. */
  notes: () => JSON.parse(JSON.stringify(ST.notes)),
  aTraiter: () => aTraiter().length,
  surChangement: f => { ST.abonnes.add(f); return () => ST.abonnes.delete(f); },
  /** Exports. */
  texteClaude: (tout) => promptClaude(tout ? ST.notes : aTraiter()),
  exporterZip, exporterJson,
  /** Changer la version de l'appli (la version de correction des notes validées). */
  definirVersion: v => { CFG.version = String(v || ""); rendre(); }
};
window.Debogage = API;
// Démarrage automatique : <script src="debogage.js" data-projet="mon-appli" data-version="1.2"></script>
(() => {
  const s = document.currentScript;
  if (s && s.dataset && (s.dataset.projet || s.hasAttribute("data-auto"))) init({ projet: s.dataset.projet || "", version: s.dataset.version || "", bulle: s.dataset.bulle !== "non" });
})();
})();
