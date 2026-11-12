/* =====================================================================
   Export : texte « prêt pour Claude », ZIP (texte + JSON + captures),
   JSON pour le tableau de bord multi-projets
   ===================================================================== */
const FORMAT = "outil-debogage";
const nomCapture = ref => "captures/" + String(ref.cle).replace(/[^a-z0-9_-]/gi, "_") + ".jpg";

function promptClaude(notes, opts) {
  opts = opts || {};
  // ordre de priorité choisi dans la liste (la note du haut d'abord)
  const liste = notes.slice().sort((a, b) => (b.ordre || Date.parse(b.at) || 0) - (a.ordre || Date.parse(a.at) || 0));
  const L = [];
  L.push(`# Notes de débogage — ${CFG.projet || "projet"}${CFG.version ? " v" + CFG.version : ""}`);
  L.push(`${liste.length} note${liste.length > 1 ? "s" : ""} · exportées le ${new Date().toLocaleString("fr-FR")} · outil-debogage ${VERSION_OUTIL}`);
  L.push("");
  L.push("Corrige chaque point ci-dessous dans le code de l'appli, dans l'ordre (le premier est le plus prioritaire). Les sélecteurs CSS indiquent les éléments concernés ; les numéros ①②… renvoient aux zones entourées sur les captures" + (opts.avecImages ? " (dossier captures/)" : "") + ". Quand un point est corrigé, dis-moi dans quelle version, pour que je le marque « corrigé ».");
  const parEcran = new Map();
  liste.forEach(n => { const k = n.ecran || "Écran inconnu"; if (!parEcran.has(k)) parEcran.set(k, []); parEcran.get(k).push(n); });
  let i = 0;
  for (const [ecran, ns] of parEcran) {
    L.push("", `## Écran : ${ecran}`);
    for (const n of ns) {
      i++;
      const titre = String(n.texte || "").split("\n")[0];
      L.push("", `### ${i}. ${tronquer(titre, 110)}`);
      const meta = [fmtQuand(n.at), n.version ? "v" + n.version : "", n.via === "voix" ? "dictée" : "", n.valide ? "corrigée" + (n.corrigeeEn ? " en v" + n.corrigeeEn : "") : "",
        (n.rouvertes || []).length ? "rouverte " + n.rouvertes.length + " fois" + (n.rouvertes[n.rouvertes.length - 1].corrigeeEn ? " (avait été corrigée en v" + n.rouvertes[n.rouvertes.length - 1].corrigeeEn + ")" : "") : ""].filter(Boolean).join(" · ");
      L.push(`_${meta}_`);
      if (String(n.texte || "").includes("\n") || titre.length > 110) L.push("", n.texte);
      for (const p of n.pieces || []) {
        if (p.type === "capture") {
          L.push(`- **Capture** ${p.image ? "`" + nomCapture(p.image) + "`" : ""}${p.photo === false ? " (annotations seules, sans photo de l'écran)" : ""}`);
          for (const z of p.zones || []) L.push(`  - Zone ${NUM[z.n - 1] || z.n} : ${z.consigne ? "« " + z.consigne + " »" : "(pas de consigne)"}${z.elements && z.elements.length ? " — contient " + z.elements.map(e => e.t + " `" + e.s + "`").join(", ") : ""}`);
          if (p.textes && p.textes.length) L.push(`  - Textes écrits sur la capture : ${p.textes.map(t => "« " + t + " »").join(", ")}`);
        } else if (p.type === "element") {
          L.push(`- **Élément** ${p.balise}${p.texte ? " « " + p.texte + " »" : ""} — \`${p.selecteur}\` — ${p.taille} — police ${p.styles.police}, ${p.styles.couleur} sur ${p.styles.fond}${p.styles.contraste ? ", contraste " + p.styles.contraste : ""}${p.styles.retraits && p.styles.retraits !== "0px" ? ", padding " + p.styles.retraits : ""}${p.styles.marges && p.styles.marges !== "0px" ? ", margin " + p.styles.marges : ""}`);
        } else if (p.type === "texte") {
          L.push(p.remplacement ? `- **Texte à remplacer** : « ${p.texte} » → « ${p.remplacement} » (dans \`${p.element}\`)` : `- **Texte signalé** : « ${p.texte} » (dans \`${p.element}\`)`);
        } else if (p.type === "mesure") {
          L.push(`- **Mesure** (${p.genre}) : ${p.resume}${p.details ? " — " + p.details : ""}`);
        }
      }
      const c = n.contexte;
      if (c) {
        if (c.erreurs && c.erreurs.length) { L.push(`- **Erreurs JavaScript juste avant** :`); c.erreurs.slice(-5).forEach(e => L.push(`  - ${e.type} : ${e.message}${e.source ? " (" + e.source + ")" : ""}${e.pile ? "\n    ```\n    " + e.pile.split("\n").slice(0, 4).join("\n    ") + "\n    ```" : ""}`)); }
        if (c.parcours && c.parcours.length) L.push(`- **Parcours** : ${c.parcours.slice(-8).map(x => x.type === "écran" ? "→ " + x.ecran : x.type + " " + x.cible).join(" · ")}`);
        if (c.appareil) { const a = c.appareil; L.push(`- **Appareil** : ${[a.systeme, a.navigateur + (a.webview ? " (appli)" : ""), a.ecran + " ×" + a.densite, a.orientation, "thème " + a.theme, a.zoom && a.zoom !== "100 %" ? "zoom " + a.zoom : ""].filter(Boolean).join(", ")}`); }
        if (c.etat) L.push(`- **État de l'appli** : \`${c.etat}\``);
      }
    }
  }
  return L.join("\n");
}

/* ---------- ZIP minimal (sans compression), lisible partout ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function creerZip(fichiers) {
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  const d = new Date(), heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of fichiers) {
    const nom = enc.encode(f.nom), data = f.data instanceof Uint8Array ? f.data : typeof f.data === "string" ? enc.encode(f.data) : new Uint8Array(await f.data.arrayBuffer());
    const crc = crc32(data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, heure, true); h.setUint16(12, jour, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, nom.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nom, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, heure, true); c.setUint16(14, jour, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nom.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nom);
    offset += 30 + nom.length + data.length;
  }
  const tailleCentral = central.reduce((s, x) => s + x.length, 0), fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true); fin.setUint32(12, tailleCentral, true); fin.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(fin.buffer)], { type: "application/zip" });
}

const horodatage = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "_" + p(d.getHours()) + "h" + p(d.getMinutes()); };
const nomBase = () => "debogage_" + (CFG.projet || "projet").replace(/[^a-z0-9_-]+/gi, "-") + "_" + horodatage();
function paquet(notes) { return { format: FORMAT, formatVersion: 1, outil: VERSION_OUTIL, projet: CFG.projet || "", versionApp: CFG.version || "", exporteLe: iso(), notes: notes.map(sansId) }; }
const blobVersDataUrl = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.onerror = () => r(""); f.readAsDataURL(b); });

async function exporterZip() {
  toast("Préparation du ZIP…");
  const notes = ST.notes, fichiers = [], vus = new Set();
  fichiers.push({ nom: "notes_a_traiter.md", data: promptClaude(notes.filter(n => !n.valide), { avecImages: true }) });
  fichiers.push({ nom: "toutes_les_notes.md", data: promptClaude(notes, { avecImages: true }) });
  fichiers.push({ nom: "notes.json", data: JSON.stringify(paquet(notes), null, 1) });
  for (const n of notes) for (const p of n.pieces || []) {
    if (!p.image || vus.has(p.image.cle)) continue; vus.add(p.image.cle);
    const b = await imageBlob(p.image); if (b) fichiers.push({ nom: nomCapture(p.image), data: b });
  }
  const ok = await telecharger(nomBase() + ".zip", await creerZip(fichiers));
  if (ok !== false) toast("ZIP prêt : " + notes.length + " note(s), " + (fichiers.length - 3) + " image(s).");
}
async function exporterJson() {
  toast("Préparation de l'export…");
  const p = paquet(ST.notes);
  for (const n of p.notes) for (const pc of n.pieces || []) {
    if (!pc.image) continue; const b = await imageBlob(pc.image); if (b) pc.image.data = await blobVersDataUrl(b);
  }
  const ok = await telecharger(nomBase() + ".json", new Blob([JSON.stringify(p)], { type: "application/json" }));
  if (ok !== false) toast("Export prêt : à importer dans le tableau de bord.");
}
