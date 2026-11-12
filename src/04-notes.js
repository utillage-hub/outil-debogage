/* =====================================================================
   Notes : création, validation avec version de correction, réouverture
   ===================================================================== */
const OUTIL = { actif: null };       // outil d'annotation en cours (capture, pointer…)
const COMPO = { pieces: [] };        // pièces jointes de la note en cours d'écriture

const aTraiter = () => ST.notes.filter(n => !n.valide);

async function creerNote(texte, via, pieces) {
  texte = String(texte || "").trim(); pieces = pieces || [];
  if (!texte && !pieces.length) return null;
  if (!texte) texte = resumePieces(pieces);
  const n = {
    uid: uid(), at: iso(), ordre: Date.now(), texte, ecran: ecranCourant(), via: via || "texte",
    projet: CFG.projet, version: CFG.version, outil: VERSION_OUTIL,
    valide: null, corrigeeEn: "", rouvertes: [], pieces,
    contexte: PREFS.contexte === false ? null : contexteNote(),
    appareil: navigator.userAgent.slice(0, 160)
  };
  return noteAjouter(n);
}
function validerNote(n) { return noteModifier(n, { valide: iso(), corrigeeEn: CFG.version || "" }); }
function rouvrirNote(n) {
  const r = (n.rouvertes || []).concat([{ at: iso(), version: CFG.version || "", corrigeeEn: n.corrigeeEn || "" }]);
  return noteModifier(n, { valide: null, rouvertes: r });
}

// Une ligne qui résume les pièces jointes (pour les puces et quand la note n'a pas de texte)
function resumePiece(p) {
  if (p.type === "capture") { const z = (p.zones || []).length; return "Capture" + (z ? " · " + z + " zone" + (z > 1 ? "s" : "") : ""); }
  if (p.type === "element") return "Élément : " + tronquer(p.texte ? p.balise + " « " + p.texte + " »" : p.selecteur, 50);
  if (p.type === "texte") return "Texte : « " + tronquer(p.texte, 30) + " »" + (p.remplacement ? " → « " + tronquer(p.remplacement, 30) + " »" : "");
  if (p.type === "mesure") return "Mesure : " + tronquer(p.resume, 60);
  return p.type;
}
const resumePieces = ps => ps.map(resumePiece).join(" ; ");
