#!/usr/bin/env python3
"""Tests de bout en bout de l'outil de débogage dans Chrome (téléphone et ordinateur).

Usage : python3 tests/test_navigateur.py   (captures d'écran dans tests/captures/)
"""
import pathlib, sys, json, zipfile, io
from playwright.sync_api import sync_playwright

RACINE = pathlib.Path(__file__).resolve().parent.parent
PAGE = (RACINE / "exemple" / "index.html").as_uri()
SORTIE = RACINE / "tests" / "captures"; SORTIE.mkdir(exist_ok=True)
erreurs, ok = [], []

def verif(cond, msg):
    (ok if cond else erreurs).append(msg)
    print(("  ✓ " if cond else "  ✗ ") + msg)

def ombre(page, sel):
    return page.locator("[data-outil-debogage]").locator(sel)

def scenario(nav, nom, ctx_opts):
    print(f"\n== {nom} ==")
    ctx = nav.new_context(accept_downloads=True, **ctx_opts)
    page = ctx.new_page()
    journal = []
    page.on("pageerror", lambda e: journal.append(str(e)))
    page.on("dialog", lambda d: d.dismiss())
    page.goto(PAGE); page.wait_for_timeout(600)
    S = lambda sel: ombre(page, sel)
    tap = lambda loc: loc.tap() if ctx_opts.get("has_touch") else loc.click()

    verif(S(".bulle").is_visible(), "la bulle est visible")
    acc = page.evaluate("getComputedStyle(document.querySelector('[data-outil-debogage]').shadowRoot.querySelector('.r')).getPropertyValue('--acc').trim()")
    verif(acc.replace(" ", "") in ("rgb(61,107,224)",), "l'outil reprend la couleur de l'appli : " + acc)
    page.screenshot(path=str(SORTIE / f"{nom}_01_accueil.png"))

    # erreur JS volontaire puis note simple
    page.click("#bug"); page.wait_for_timeout(100)
    tap(S(".bulle")); page.wait_for_timeout(300)
    verif(S("#pnl").is_visible(), "toucher la bulle ouvre la fenêtre")
    page.screenshot(path=str(SORTIE / f"{nom}_02_fenetre.png"))
    S("#saisie").fill("Le bouton Relancer est trop près du bouton principal")
    tap(S("#enreg")); page.wait_for_timeout(400)
    n = page.evaluate("Debogage.notes()")
    verif(len(n) == 1, "la note est enregistrée")
    verif(n and n[0]["ecran"].startswith("Planning"), "l'écran est noté : " + (n[0]["ecran"] if n else "?"))
    verif(n and n[0]["contexte"] and any("echeance" in e["message"] for e in n[0]["contexte"]["erreurs"]), "l'erreur JavaScript est jointe")
    verif(n and any(p["type"] == "clic" for p in n[0]["contexte"]["parcours"]), "le parcours (clics) est joint")
    verif(n and '"onglet"' in n[0]["contexte"]["etat"], "l'état de l'appli est joint")

    # capture annotée : zone entourée + consigne
    page.evaluate("document.getElementById('nouveau').scrollIntoView({block:'center'})"); page.wait_for_timeout(200)
    if S("#pnl").is_hidden(): tap(S(".bulle")); page.wait_for_timeout(250)
    tap(S('[data-outil="capture"]')); page.wait_for_timeout(300)
    verif(S("#toile").is_visible(), "l'outil Capture s'ouvre")
    box = page.locator("#nouveau").bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(cx - 90, cy - 30); page.mouse.down()
    for k in range(0, 40):
        import math
        a = k / 39 * 2 * math.pi
        page.mouse.move(cx + 95 * math.cos(a), cy + 34 * math.sin(a))
    page.mouse.up(); page.wait_for_timeout(300)
    verif(S("#cons").is_visible(), "une consigne est demandée pour la zone")
    S("#consIn").fill("Mettre ce bouton en évidence, plus grand")
    page.screenshot(path=str(SORTIE / f"{nom}_03_capture_zone.png"))
    tap(S('[data-cs="ok"]')); page.wait_for_timeout(200)
    # flèche
    tap(S('[data-forme="fleche"]'))
    page.mouse.move(cx + 160, cy + 120); page.mouse.down(); page.mouse.move(cx + 60, cy + 30, steps=6); page.mouse.up()
    page.wait_for_timeout(5000)  # laisse la photo se faire
    etat = S("#cEtat").inner_text()
    verif("figé" in etat, "la photo de l'écran est prise : " + etat)
    page.screenshot(path=str(SORTIE / f"{nom}_04_capture_dessin.png"))
    tap(S('[data-c="ok"]')); page.wait_for_timeout(1500)
    verif(S(".piece").count() == 1, "la capture est jointe à la note en cours")
    page.screenshot(path=str(SORTIE / f"{nom}_05_piece.png"))

    # élément
    tap(S('[data-outil="element"]')); page.wait_for_timeout(250)
    k = page.locator(".kpi").nth(1)
    if ctx_opts.get("has_touch"): k.tap()
    else: k.hover(); page.wait_for_timeout(100); k.click()
    page.wait_for_timeout(200)
    verif(S("#eChoix").is_visible(), "un élément touché est encadré")
    page.screenshot(path=str(SORTIE / f"{nom}_06_element.png"))
    tap(S('[data-e="ok"]')); page.wait_for_timeout(1500)
    verif(page.locator("#modale").is_hidden(), "l'appli n'a pas réagi au toucher pendant l'outil")

    # texte
    tap(S('[data-outil="texte"]')); page.wait_for_timeout(250)
    page.evaluate("""() => { const el = document.querySelector('.sous'); const r = document.createRange(); r.setStart(el.firstChild, 0); r.setEnd(el.firstChild, 13); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }""")
    page.wait_for_timeout(200)
    garde = page.evaluate("() => { const e = new MouseEvent('contextmenu', {bubbles:true, cancelable:true}); document.querySelector('.sous').dispatchEvent(e); return !e.defaultPrevented; }")
    verif(garde, "outil Texte : l'appui long natif (menu de sélection) n'est plus bloqué")
    page.evaluate("getSelection().removeAllRanges()")  # le toucher sur « Utiliser » efface la sélection…
    page.wait_for_timeout(150)
    verif(S('[data-x="prendre"]').is_enabled(), "…mais la dernière sélection reste utilisable")
    page.screenshot(path=str(SORTIE / f"{nom}_07a_texte_selection.png"))
    tap(S('[data-x="prendre"]')); page.wait_for_timeout(200)
    S("#tNouv").fill("Bonjour Camille !")
    page.screenshot(path=str(SORTIE / f"{nom}_07_texte.png"))
    tap(S('[data-x="ok"]')); page.wait_for_timeout(300)

    # mesure : couleur
    tap(S('[data-outil="mesure"]')); page.wait_for_timeout(250)
    g = S(".barre.haut .poigneeB").bounding_box()
    page.mouse.move(g["x"]+g["width"]/2, g["y"]+g["height"]/2); page.mouse.down(); page.mouse.move(g["x"]+40, g["y"]+300, steps=8); page.mouse.up(); page.wait_for_timeout(200)
    pos = page.evaluate("JSON.parse(localStorage.getItem('debogage:fenetres')||'{}')['mesure-haut']")
    verif(pos is not None and pos["y"] > 200, "la fenêtre de Mesure se déplace et retient sa place")
    tap(S('[data-mode="couleur"]'))
    sm = page.locator(".ligne small").first.bounding_box()
    page.mouse.click(sm["x"] + 10, sm["y"] + sm["height"] / 2); page.wait_for_timeout(200)
    txt = S("#mRes").inner_text()
    verif("Contraste" in txt, "la pipette donne couleurs et contraste")
    tap(S('[data-m="grille"]')); tap(S('[data-m="grille"]'))
    page.screenshot(path=str(SORTIE / f"{nom}_08_mesure.png"))
    tap(S('[data-m="ajouter"]')); page.wait_for_timeout(300)

    verif(S(".piece").count() == 4, f"4 pièces jointes (capture, élément, texte, mesure) : {S('.piece').count()}")
    page.screenshot(path=str(SORTIE / f"{nom}_09_note_complete.png"))
    h0 = S("#saisie").bounding_box()["height"]
    S("#saisie").fill("Phrase dictée assez longue pour dépasser la hauteur de départ. " * 8)
    page.wait_for_timeout(100)
    hs = page.evaluate("(() => { const t = document.querySelector('[data-outil-debogage]').shadowRoot.querySelector('#saisie'); return [t.getBoundingClientRect().height, t.scrollTop + t.clientHeight >= t.scrollHeight - 2]; })()")
    verif(abs(hs[0] - h0) < 2 and hs[1], "texte long : la zone garde sa taille, le texte remonte et la fin reste visible")
    S("#saisie").fill("Accueil à reprendre")
    tap(S("#enreg")); page.wait_for_timeout(600)

    # liste, détail, validation
    page.evaluate("Debogage.ouvrir('liste')"); page.wait_for_timeout(500)
    verif(S(".note").count() == 2, "2 notes dans la liste")
    tap(S(".note .txt").first); page.wait_for_timeout(600)
    page.screenshot(path=str(SORTIE / f"{nom}_10_liste_detail.png"), full_page=False)
    tap(S('[data-a="verifier"]')); page.wait_for_timeout(300)
    page.screenshot(path=str(SORTIE / f"{nom}_11_verification.png"))
    verif(S('[data-a="v-fin"]').bounding_box()["y"] < S(".verif .txt").bounding_box()["y"], "vérification : « ‹ Notes » est en haut")
    tap(S('[data-a="v-ok"]')); page.wait_for_timeout(400)
    n = page.evaluate("Debogage.notes()")
    val = [x for x in n if x["valide"]]
    verif(len(val) == 1 and val[0]["corrigeeEn"] == "0.3", "la note vérifiée est corrigée en v0.3")
    tap(S('[data-a="v-precedente"]')); page.wait_for_timeout(300)
    verif(S('[data-a="v-nonok"]').count() == 1, "« ‹ Précédente » revient à la note qu'on vient de valider")
    tap(S('[data-a="v-fin"]')); page.wait_for_timeout(300)

    # date en gras, modification pleine largeur
    tap(S('.puce[data-f="all"]')); page.wait_for_timeout(200)
    verif(page.evaluate("getComputedStyle(document.querySelector('[data-outil-debogage]').shadowRoot.querySelector('.note .quand')).fontWeight") >= "700", "date et heure en gras")
    page.evaluate("Debogage.notes()")
    S(".note .act").first.click(); page.wait_for_timeout(200); tap(S('#menu3 [data-m="modifier"]')); page.wait_for_timeout(300)
    lt, ll = S("textarea[data-edit]").bounding_box()["width"], S(".liste").bounding_box()["width"]
    verif(lt > ll - 40, f"modification sur toute la largeur ({lt:.0f} px sur {ll:.0f})")
    page.screenshot(path=str(SORTIE / f"{nom}_11b_modification.png"))
    tap(S('[data-a="annulerEdit"]')); page.wait_for_timeout(200)

    # réordonner : appui long sur la 2e note puis glisser au-dessus de la 1re
    premiere = page.evaluate("Debogage.notes()[0].uid")
    b2 = S(".note .meta").nth(1).bounding_box(); b1 = S(".note .meta").nth(0).bounding_box()
    page.evaluate("""([x,y1,y2]) => { const r = document.querySelector('[data-outil-debogage]').shadowRoot; const v = r.querySelector('#v-liste'); const cible = r.querySelectorAll('.note .meta')[1];
      const ev = (t, y, el) => (el||v).dispatchEvent(new PointerEvent(t, {bubbles:true, composed:true, clientX:x, clientY:y, pointerId:9, pointerType:'mouse', isPrimary:true, button:0}));
      ev('pointerdown', y1, cible); return new Promise(res => setTimeout(() => { for (let k=1;k<=10;k++) ev('pointermove', y1 + (y2-y1)*k/10); ev('pointerup', y2); res(); }, 600)); }""",
      [b2["x"]+40, b2["y"]+b2["height"]/2, b1["y"]-6])
    page.wait_for_timeout(500)
    verif(page.evaluate("Debogage.notes()[0].uid") != premiere, "appui long + glisser : la note change de place")
    t2 = page.evaluate("Debogage.texteClaude(true)")
    verif(t2.find(page.evaluate("Debogage.notes()[0].texte").split("\n")[0][:20]) < t2.find(page.evaluate("Debogage.notes()[1].texte").split("\n")[0][:20]), "l'export pour Claude suit le nouvel ordre")
    page.screenshot(path=str(SORTIE / f"{nom}_11c_liste_triee.png"))

    # export
    texte = page.evaluate("Debogage.texteClaude(true)")
    (SORTIE / f"{nom}_prompt.md").write_text(texte, encoding="utf-8")
    verif("Zone ①" in texte and "Mettre ce bouton en évidence" in texte, "le texte pour Claude contient la zone et sa consigne")
    verif("→ « Bonjour Camille ! »" in texte, "le texte pour Claude contient le remplacement de texte")
    with page.expect_download() as dl:
        page.evaluate("Debogage.ouvrir('reglages')"); page.wait_for_timeout(300)
        page.screenshot(path=str(SORTIE / f"{nom}_12_reglages.png"))
        tap(S('[data-r="zip"]'))
    dl.value.save_as(str(SORTIE / f"{nom}_export.zip"))
    z = zipfile.ZipFile(io.BytesIO(open(dl.value.path(), "rb").read()))
    noms = z.namelist()
    verif(any(x.startswith("captures/cap-") for x in noms) and "notes.json" in noms, "le ZIP contient notes + captures : " + ", ".join(noms))
    if any(x.startswith("captures/cap-") for x in noms):
        (SORTIE / f"{nom}_capture_exportee.jpg").write_bytes(z.read([x for x in noms if x.startswith("captures/cap-")][0]))

    # interface : déplacer, masquer, apparences
    page.evaluate("Debogage.ouvrir('note')"); page.wait_for_timeout(300)
    b = S('#outilsBarre [data-outil="mesure"]').bounding_box(); cible = S("#enreg").bounding_box()
    if ctx_opts.get("has_touch"):
        # appui long tactile simulé par des événements pointeur
        page.evaluate("""([x1,y1,x2,y2]) => { const h = document.querySelector('[data-outil-debogage]').shadowRoot; const b = h.querySelector('#outilsBarre [data-outil="mesure"]');
          const ev = (t, x, y, el) => (el||b).dispatchEvent(new PointerEvent(t, {bubbles:true, composed:true, clientX:x, clientY:y, pointerId:7, pointerType:'touch', isPrimary:true, button:0}));
          ev('pointerdown', x1, y1); return new Promise(r => setTimeout(() => { for (let k=1;k<=8;k++) ev('pointermove', x1+(x2-x1)*k/8, y1+(y2-y1)*k/8); ev('pointerup', x2, y2); r(); }, 600)); }""",
          [b["x"]+b["width"]/2, b["y"]+b["height"]/2, cible["x"]-30, cible["y"]+cible["height"]/2])
    else:
        page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2); page.mouse.down(); page.wait_for_timeout(600)
        page.mouse.move(cible["x"]-30, cible["y"]+cible["height"]/2, steps=10); page.screenshot(path=str(SORTIE / f"{nom}_13_deplacement.png")); page.mouse.up()
    page.wait_for_timeout(400)
    verif(S('#outilsPied [data-outil="mesure"]').count() == 1, "appui long + glisser : l'outil Mesure est à côté d'Enregistrer")
    page.screenshot(path=str(SORTIE / f"{nom}_14_outil_en_bas.png"))
    S('#outilsBarre [data-outil="texte"]').click(button="right") if not ctx_opts.get("has_touch") else S('#outilsBarre [data-outil="texte"]').dispatch_event("contextmenu")
    page.wait_for_timeout(200)
    verif(S('#menu3 [data-p="masquer"]').is_visible(), "clic droit : menu pour masquer")
    tap(S('#menu3 [data-p="masquer"]')); page.wait_for_timeout(300)
    verif(S('[data-outil="texte"]').count() == 0, "l'outil Texte est masqué")
    page.evaluate("Debogage.ouvrir('interface')"); page.wait_for_timeout(1200)
    page.screenshot(path=str(SORTIE / f"{nom}_15_interface.png"))
    verif(S('[data-i="reafficher"][data-v="outil:texte"]').count() == 1, "l'outil masqué se retrouve dans Interface")
    tap(S('[data-i="fermeture"][data-v="cible"]')); page.wait_for_timeout(700)
    page.screenshot(path=str(SORTIE / f"{nom}_16_demo_cible.png"))
    tap(S('[data-i="reafficher"][data-v="outil:texte"]')); page.wait_for_timeout(200)
    verif(page.evaluate("JSON.parse(localStorage.getItem('debogage:interface')).fermeture") == "cible", "apparence « cible » enregistrée")
    # fermer la bulle en la glissant sur la cible
    page.evaluate("Debogage.fermer()"); page.wait_for_timeout(200)
    bb = S(".bulle").bounding_box(); vw = page.viewport_size
    page.mouse.move(bb["x"]+bb["width"]/2, bb["y"]+bb["height"]/2); page.mouse.down()
    page.mouse.move(vw["width"]/2, vw["height"]-150, steps=8); page.mouse.move(vw["width"]/2, vw["height"]-106, steps=4)
    page.screenshot(path=str(SORTIE / f"{nom}_17_bulle_sur_cible.png")); page.mouse.up(); page.wait_for_timeout(300)
    verif(not S(".bulle").is_visible(), "la bulle se ferme sur la cible")
    page.evaluate("Debogage.afficher()")

    # persistance après rechargement
    page.reload(); page.wait_for_timeout(800)
    verif(page.evaluate("Debogage.notes().length") == 2, "les notes restent après rechargement")
    verif(not journal or all("echeance" in j for j in journal), "aucune erreur JavaScript de l'outil" + (": " + "; ".join(journal) if journal else ""))
    ctx.close()

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    scenario(nav, "telephone", dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True))
    scenario(nav, "ordinateur", dict(viewport={"width": 1440, "height": 900}))
    # tableau de bord : import du ZIP du téléphone
    print("\n== tableau de bord ==")
    ctx = nav.new_context(viewport={"width": 1440, "height": 900}); page = ctx.new_page(); journal = []
    page.on("pageerror", lambda e: journal.append(str(e)))
    page.goto((RACINE / "tableau-de-bord" / "index.html").as_uri()); page.wait_for_timeout(500)
    page.screenshot(path=str(SORTIE / "tdb_01_vide.png"))
    page.set_input_files("#fichier", str(SORTIE / "telephone_export.zip")); page.wait_for_timeout(1500)
    verif(page.locator(".note").count() == 1, "le ZIP est importé (1 note à traiter)")
    page.click(".kpi[data-k=tout]"); page.wait_for_timeout(200)
    verif(page.locator(".note").count() == 2, "2 notes au total")
    page.locator(".note").first.click(); page.wait_for_timeout(400)
    page.screenshot(path=str(SORTIE / "tdb_02_detail.png"))
    verif(page.locator("#detail img.cap").count() >= 1 and page.evaluate("document.querySelector('#detail img.cap').naturalWidth") > 100, "la capture s'affiche dans le détail")
    page.set_input_files("#fichier", str(SORTIE / "ordinateur_export.zip")); page.wait_for_timeout(1500)
    verif(page.locator("#projets [data-p]").count() == 2, "un seul projet (même projet, notes fusionnées)")
    page.set_viewport_size({"width": 390, "height": 844}); page.wait_for_timeout(300)
    page.screenshot(path=str(SORTIE / "tdb_03_mobile_detail.png"))
    page.click("[data-d=fermer]"); page.wait_for_timeout(200)
    page.screenshot(path=str(SORTIE / "tdb_04_mobile.png"), full_page=True)
    verif(not journal, "aucune erreur JavaScript sur le tableau de bord" + (": " + "; ".join(journal) if journal else ""))
    ctx.close()
    nav.close()

print(f"\n{len(ok)} réussis, {len(erreurs)} en échec")
sys.exit(1 if erreurs else 0)
