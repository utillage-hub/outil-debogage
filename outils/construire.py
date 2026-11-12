#!/usr/bin/env python3
"""Assemble dist/debogage.js (et sa version minifiée légère) à partir de src/.

Usage : python3 outils/construire.py
Aucune dépendance : tout tient dans un seul fichier à inclure dans les projets.
"""
import json, pathlib, re

RACINE = pathlib.Path(__file__).resolve().parent.parent
SRC = RACINE / "src"
version = (RACINE / "VERSION").read_text(encoding="utf-8").strip()

css = (SRC / "styles.css").read_text(encoding="utf-8")
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)           # commentaires
css = re.sub(r"\s*\n\s*", "", css)                         # retours à la ligne
vendor = (RACINE / "vendor" / "html-to-image.js").read_text(encoding="utf-8")
vendor = re.sub(r"//# sourceMappingURL=.*", "", vendor)

morceaux = []
fichiers = sorted(p for p in SRC.glob("*.js"))
for p in fichiers:
    txt = p.read_text(encoding="utf-8")
    if p.name.startswith("00-"):
        morceaux.append(txt)
        morceaux.append("/* ---------- html-to-image 1.11 (MIT) : captures d'écran ---------- */\n"
                        "const htmlToImage = (function () { var exports = {}, module = { exports: exports }, define; "
                        + vendor.strip() + "\n return exports; })();\n")
        morceaux.append("const CSS_OUTIL = " + json.dumps(css, ensure_ascii=False) + ";\n")
    else:
        morceaux.append(f"\n/* ===== {p.name} ===== */\n" + txt)

js = "".join(morceaux).replace("__VERSION__", version)
sortie = RACINE / "dist" / "debogage.js"
sortie.parent.mkdir(exist_ok=True)
sortie.write_text(js, encoding="utf-8")
print(f"dist/debogage.js  v{version}  {len(js.encode('utf-8')) / 1024:.0f} Ko  ({len(fichiers)} modules)")

# Tableau de bord multi-projets : une seule page, avec l'outil intégré
source = (RACINE / "tableau-de-bord" / "source.html").read_text(encoding="utf-8")
page = source.replace("/*OUTIL_DEBOGAGE*/", js.replace("</script", "<\\/script"))
(RACINE / "tableau-de-bord" / "index.html").write_text(page, encoding="utf-8")
print(f"tableau-de-bord/index.html  {len(page.encode('utf-8')) / 1024:.0f} Ko")

# Page d'essai en un seul fichier (publiable comme artifact)
exemple = (RACINE / "exemple" / "index.html").read_text(encoding="utf-8")
exemple = exemple.replace('<script src="../dist/debogage.js"></script>', "<script>" + js.replace("</script", "<\\/script") + "</script>")
(RACINE / "exemple" / "autonome.html").write_text(exemple, encoding="utf-8")
print(f"exemple/autonome.html  {len(exemple.encode('utf-8')) / 1024:.0f} Ko")
