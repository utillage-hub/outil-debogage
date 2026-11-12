/* =====================================================================
   Voix : dictée d'une note (le texte s'affiche pendant qu'on parle, la
   dictée continue fenêtre fermée) et écoute continue (chaque phrase
   devient une note). Trois moteurs, dans l'ordre :
   1. reconnaissance native de l'appli (CFG.ecouter, ex. APK Android) ;
   2. capacité « dictation » d'un artifact Claude (micro autorisé) ;
   3. reconnaissance vocale du navigateur (Chrome, Edge…).
   ===================================================================== */
const DICT = { mode: null, cap: null, rec: null, base: "", cible: null };

async function dicteePreparer() {
  DICT.cap = await capacite("dictation", 4000);
  if (DICT.cap) {
    try {
      DICT.cap.onPartial(({ text }) => DICT.cible && DICT.cible.partiel(text));
      DICT.cap.onFinal(({ text }) => DICT.cible && DICT.cible.final(text));
      DICT.cap.onState(({ state }) => { if (state === "idle" && DICT.mode && DICT.moteur === "cap") { const m = DICT.mode; DICT.mode = null; DICT.cible = null; if (m === "dictee") finDictee(); rendre(); } });
    } catch (e) { DICT.cap = null; }
  }
}

function cibleDictee() {
  const s = q("#saisie");
  DICT.base = s.value ? s.value.trimEnd() + " " : "";
  return {
    partiel: t => { s.value = DICT.base + String(t || "").trim(); suivreTexte(s); },
    final: t => { t = String(t || "").trim(); if (!t) return; DICT.base = (DICT.base + t).trimEnd() + " "; s.value = DICT.base.trimEnd(); UI.via = "voix"; suivreTexte(s); }
  };
}
const cibleEcoute = () => ({ partiel: () => {}, final: t => { t = String(t || "").trim(); if (t) creerNote(t, "voix", []).then(() => toast("Note dictée : « " + tronquer(t, 50) + " »")); } });

// Appelé directement depuis le clic (la capacité « dictation » l'exige)
function dicteeBasculer(mode) {
  if (DICT.mode === mode) return dicteeArreter();
  if (DICT.mode) dicteeArreter();
  DICT.mode = mode; DICT.cible = mode === "dictee" ? cibleDictee() : cibleEcoute();
  const msg = t => { if (q("#msg")) q("#msg").textContent = t; };
  const echec = t => { DICT.mode = null; DICT.cible = null; msg(t); toast(t); rendre(); };

  if (typeof CFG.ecouter === "function") {
    DICT.moteur = "natif";
    (async () => {
      while (DICT.mode === mode) {
        try { const t = await CFG.ecouter(); if (DICT.mode !== mode) break; DICT.cible.final(t); }
        catch (e) { if (/permission|refus|not-allowed|denied/i.test(String(e && e.message))) { echec("Autorise le micro pour cette appli dans les réglages."); return; } await attendre(400); }
      }
    })();
  } else if (DICT.cap) {
    DICT.moteur = "cap";
    DICT.cap.start().catch(e => echec(e && e.code === "not_granted" ? "Micro refusé : tu peux écrire la note, ou utiliser le micro du clavier." : "Le micro n'a pas pu démarrer."));
  } else {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { echec("Dictée indisponible ici : touche le cadre puis le micro de ton clavier."); if (mode === "dictee") q("#saisie").focus(); return; }
    DICT.moteur = "web";
    const lancer = () => {
      if (DICT.mode !== mode) return;
      const r = new SR(); DICT.rec = r; r.lang = CFG.langue; r.continuous = true; r.interimResults = true;
      let base = "";
      r.onresult = e => {
        let partiel = "";
        for (let k = e.resultIndex; k < e.results.length; k++) {
          const x = e.results[k];
          if (x.isFinal) DICT.cible.final(x[0].transcript); else partiel += x[0].transcript;
        }
        if (partiel) DICT.cible.partiel(partiel);
      };
      r.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") echec("Micro bloqué ici : touche le cadre puis le micro de ton clavier."); };
      r.onend = () => { if (DICT.mode === mode) setTimeout(lancer, 250); };
      try { r.start(); } catch (e) { echec("Le micro n'a pas pu démarrer."); }
    };
    lancer();
  }
  if (DICT.mode === "dictee") msg("J'écoute… tu peux fermer la fenêtre, la bulle reste rouge tant que je note.");
  if (DICT.mode === "ecoute") toast("Écoute continue activée : parle en naviguant.");
  rendre();
}
async function dicteeArreter() {
  const m = DICT.mode; if (!m) return;
  DICT.mode = null;
  try { DICT.rec && DICT.rec.stop(); } catch (e) {} DICT.rec = null;
  if (DICT.moteur === "cap" && DICT.cap) { try { await DICT.cap.stop(); } catch (e) {} }
  DICT.cible = null;
  if (m === "dictee") finDictee(); else if (m === "ecoute") toast("Écoute continue arrêtée.");
  rendre();
}
function finDictee() { const s = q("#saisie"); if (q("#msg")) q("#msg").textContent = s && s.value.trim() ? "Dictée arrêtée. Relis puis « Enregistrer la note »." : ""; }

// pendant la dictée, la zone de texte garde sa taille : le texte remonte et la fin reste visible
function suivreTexte(ta) {
  if (ta.tagName === "INPUT") ta.scrollLeft = ta.scrollWidth; else ta.scrollTop = ta.scrollHeight;
}
