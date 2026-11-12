/* =====================================================================
   Stockage des notes
   - base de l'appli (artifact Claude : claude.use("db"), ou objet compatible
     fourni par l'appli, comme le stockage en fichiers de l'APK Android) ;
   - sinon cet appareil (localStorage).
   Les notes prises hors ligne attendent sur l'appareil puis partent dans la base.
   Les captures sont gardées dans IndexedDB (et envoyées dans les fichiers
   de l'artifact quand la capacité « assets » est déclarée).
   ===================================================================== */
const ST = { db: null, assets: null, mode: "local", notes: [], pret: false, abonnes: new Set() };

function notifier() { ST.abonnes.forEach(f => { try { f(ST.notes); } catch (e) {} }); }
// ordre = priorité (plus grand = plus haut) ; par défaut la date, donc les plus récentes en haut
const trierNotes = () => ST.notes.sort((a, b) => (b.ordre || 0) - (a.ordre || 0));
function normaliser(n) {
  // compatibilité avec les notes au format simple (texte, ecran, at, statut/valide)
  if (!n.uid) n.uid = n.id || uid();
  if (n.valide === undefined) n.valide = n.statut === "done" ? (n.modifie || n.at) : null;
  delete n.statut;
  if (!Array.isArray(n.pieces)) n.pieces = [];
  if (!Array.isArray(n.rouvertes)) n.rouvertes = [];
  if (typeof n.ordre !== "number") n.ordre = Date.parse(n.at) || Date.now();
  return n;
}
const sansId = n => { const { id, ...r } = n; return JSON.parse(JSON.stringify(r)); };

async function capacite(nom, delai) {
  try { if (!window.claude || !window.claude.use) return null; return await Promise.race([window.claude.use(nom), attendre(delai || 4000).then(() => null)]); }
  catch (e) { return null; }
}

async function stockageInit() {
  // 1. ce qui est déjà sur l'appareil (affichage immédiat)
  ST.notes = (local.lire("notes", []) || []).map(normaliser); trierNotes(); notifier();
  // 2. la base
  let db = CFG.db;
  if (db === "auto") db = await capacite("db", 6000);
  if (db && typeof db.collection === "function") {
    ST.db = db; ST.mode = "base";
    const col = db.collection(CFG.collection);
    const appliquer = docs => {
      const enAttente = local.lire("attente", []) || [];
      const deBase = docs.map(d => normaliser({ id: d.id, ...d.data() }));
      const connus = new Set(deBase.map(n => n.uid));
      ST.notes = deBase.concat(enAttente.filter(n => !connus.has(n.uid)).map(normaliser));
      trierNotes(); notifier();
    };
    try {
      if (typeof col.onSnapshot === "function") {
        await new Promise(res => {
          const t = setTimeout(res, 8000);
          col.onSnapshot(s => { clearTimeout(t); appliquer(s.docs || []); res(); }, () => { clearTimeout(t); res(); });
        });
      } else if (typeof col.get === "function") { const s = await col.get(); appliquer(s.docs || []); }
    } catch (e) {}
    local.ecrire("notes", null); // la base fait foi
    viderAttente();
  }
  ST.assets = await capacite("assets", 3000);
  ST.pret = true; notifier();
}

function sauverLocal() { if (ST.mode === "local") local.ecrire("notes", ST.notes.slice(0, 500)); }
function mettreEnAttente(n) { const a = local.lire("attente", []) || []; if (!a.some(x => x.uid === n.uid)) a.unshift(sansId(n)); local.ecrire("attente", a.slice(0, 300)); }
async function viderAttente() {
  const a = local.lire("attente", []) || []; if (!a.length || !ST.db) return;
  const reste = [];
  for (const n of a) { if (!(await ecrireBase(n))) reste.push(n); }
  local.ecrire("attente", reste.length ? reste : null);
}
async function ecrireBase(n) {
  const col = ST.db.collection(CFG.collection), data = sansId(n);
  try { if (typeof col.doc === "function") { const d = col.doc(n.uid); if (d && typeof d.set === "function") { await d.set(data); n.id = n.uid; return true; } } } catch (e) {}
  try { const r = await col.add(data); if (r && r.id) n.id = r.id; return true; } catch (e) { return false; }
}
const docDe = n => ST.db.collection(CFG.collection).doc(n.id || n.uid);

async function noteAjouter(n) {
  normaliser(n); ST.notes.unshift(n); trierNotes(); notifier();
  if (ST.db) { if (!(await ecrireBase(n))) { mettreEnAttente(n); toast("Note gardée sur cet appareil : elle partira dans la base dès que possible."); } }
  sauverLocal(); notifier();
  if (typeof CFG.surNote === "function") { try { CFG.surNote(n); } catch (e) {} }
  return n;
}
async function noteModifier(n, champs) {
  Object.assign(n, champs); notifier();
  if (ST.db) { try { await docDe(n).update(JSON.parse(JSON.stringify(champs))); } catch (e) { mettreEnAttente(n); } }
  sauverLocal();
}
async function noteSupprimer(n) {
  ST.notes = ST.notes.filter(x => x !== n); notifier();
  if (ST.db) { try { await docDe(n).delete(); } catch (e) {} }
  const a = (local.lire("attente", []) || []).filter(x => x.uid !== n.uid); local.ecrire("attente", a.length ? a : null);
  sauverLocal();
}

/* ---------- Images (captures) : IndexedDB + fichiers de l'artifact ---------- */
let idbP = null;
function idb() {
  if (idbP) return idbP;
  idbP = new Promise(res => {
    try {
      const r = indexedDB.open("outil-debogage", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("images");
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
  return idbP;
}
async function imageMettre(cleImg, blob) {
  const base = await idb();
  if (base) await new Promise(res => { try { const t = base.transaction("images", "readwrite"); t.objectStore("images").put(blob, cleImg); t.oncomplete = res; t.onerror = res; } catch (e) { res(); } });
  let asset = "";
  if (ST.assets) { try { const r = await ST.assets.upload(blob); asset = r && r.id || ""; } catch (e) {} }
  return { cle: cleImg, asset };
}
async function imageBlob(ref) {
  if (!ref) return null;
  const base = await idb();
  if (base) { const b = await new Promise(res => { try { const q = base.transaction("images").objectStore("images").get(ref.cle); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); if (b) return b; }
  if (ref.asset) { try { const r = await fetch("/_blob/" + ref.asset); if (r.ok) return await r.blob(); } catch (e) {} }
  if (ref.data) { try { return await (await fetch(ref.data)).blob(); } catch (e) {} }
  return null;
}
const urlsImages = new Map();
async function imageUrl(ref) {
  if (!ref) return "";
  if (urlsImages.has(ref.cle)) return urlsImages.get(ref.cle);
  const b = await imageBlob(ref); if (!b) return ref.asset ? "/_blob/" + ref.asset : "";
  const u = URL.createObjectURL(b); urlsImages.set(ref.cle, u); return u;
}
