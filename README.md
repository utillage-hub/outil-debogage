# Outil de débogage

Une bulle à poser dans n'importe quelle appli en cours de développement : on navigue, on note ce qui ne va pas (au clavier, à la voix, en entourant la zone sur une capture), et Claude reçoit des notes précises, rangées par écran, prêtes à corriger.

**Essayer** : ouvrir `exemple/autonome.html` (appli fictive équipée de l'outil).

Une seule brique réutilisable, à inclure dans chaque projet.

## Ce que ça fait

| | |
|---|---|
| **Bulle** | Toujours à l'écran, déplaçable, compteur des notes à traiter. Toucher = noter ; appui long = dicter directement ; glisser vers le bas = la masquer. |
| **Note** | Texte ou dictée (le texte s'affiche pendant qu'on parle, la dictée continue fenêtre fermée). L'écran en cours est noté automatiquement. |
| **Capture** | L'écran est figé : on entoure à main levée, on encadre, on fléche, on écrit, on masque les données sensibles. Chaque zone reçoit une **consigne** (« agrandir », « aligner »…) et la liste des éléments de l'appli qu'elle contient. |
| **Élément** | On touche un bouton, un bloc, une image : il s'encadre, « ↑ Parent » pour élargir. La note retient son sélecteur CSS, son texte, sa taille, sa police, ses couleurs et le contraste. |
| **Texte** | On sélectionne un texte de l'appli et on écrit son remplacement : « Mois » → « Mois en cours ». |
| **Mesure** | Règle en pixels, écart et alignement entre deux éléments, pipette (couleurs + contraste WCAG), grille de 4 à 24 px. |
| **Contexte automatique** | Erreurs JavaScript des 10 dernières minutes, 12 dernières actions et écrans, appareil (taille, orientation, thème, navigateur), état de l'appli. |
| **Suivi** | À traiter / Corrigées / Toutes, notes réordonnables par appui long (la priorité est reprise dans l'export), vérification une par une avec « ‹ Précédente », **version de correction** (« corrigée en v2.19 »), réouverture si le problème revient, annulation après suppression. |
| **Export** | Texte « prêt pour Claude » (copié en un geste), ZIP avec captures, JSON pour le tableau de bord. |
| **Interface** | Onglet dédié : apparence de la zone qui ferme la bulle (vague, bande, cible, coin ou désactivée), avec aperçus animés ; façons de fermer la fenêtre ; place de chaque outil ; éléments masqués ; taille de la bulle ; couleurs. |
| **Fenêtres d'outils** | Barres et panneaux de Capture, Élément, Texte et Mesure se déplacent (poignée ⠿ ou fond) et retiennent leur place. |
| **Outils déplaçables** | Appui long sur une icône puis glisser : dans la barre, à côté d'« Enregistrer la note », ou sur « masquer ». Clic droit (ou appui long sans bouger) : menu pour la déplacer ou la masquer. Les éléments masqués se retrouvent dans l'onglet Interface. |
| **Couleurs** | Par défaut, l'outil reprend le fond (clair ou sombre), la couleur principale et la police de l'appli, avec un contraste vérifié. Autres choix : neutre (graphite et ambre), clair, sombre. |
| **Tableau de bord** | `tableau-de-bord/index.html` réunit les notes de tous les projets importés. |

Tout est isolé dans un Shadow DOM : l'outil ne touche pas au style de l'appli, et l'appli ne touche pas au sien. Les éléments marqués `data-debogage-ignorer` ne sont jamais photographiés.

## Intégrer l'outil dans un projet

Copier `dist/debogage.js` dans le projet (ou coller son contenu dans un `<script>` pour un artifact Claude en un seul fichier), puis :

```html
<script src="debogage.js"></script>
<script>
  Debogage.init({
    projet: "mon-appli",            // nom court, sert à ranger les notes
    version: "0.7",                 // version de l'appli : devient la « version de correction »
    ecran: () => "Accueil › " + ongletActif,          // facultatif : sinon détection automatique
    etat: () => ({ periode, filtre, ficheOuverte }) // facultatif : instantané joint à chaque note
  });
</script>
```

Version courte, sans réglage : `<script src="debogage.js" data-projet="mon-appli" data-version="0.7"></script>`.

### Dans un artifact Claude

L'outil utilise tout seul ce que la page déclare :

| Capacité | Pour quoi |
|---|---|
| `db` | Notes enregistrées dans la base de l'appli (collection `debugnotes`, compatible avec les notes au format simple déjà prises). Sans elle : notes gardées sur l'appareil. |
| `assets` | Captures gardées dans les fichiers de l'appli (sinon sur l'appareil seulement). |
| `downloads` | Téléchargement du ZIP et du JSON. |
| `dictation` | Dictée avec le micro de l'appli Claude (le micro du navigateur y est souvent bloqué). |

### Dans l'APK Android (WebView)

```js
Debogage.init({
  projet: "mon-appli", version: "1.0",
  db: monStockage,                            // stockage de l'appli offrant collection().doc().set/update/delete et onSnapshot
  ecouter: () => maReconnaissanceVocale(),    // reconnaissance vocale native du téléphone : renvoie le texte dicté
  partager: (nom, texte) => monPartage(nom, texte) // partage natif (messagerie, mail…)
});
```

### Relier au menu de l'appli

```js
menuDebogage.onclick = () => Debogage.ouvrir();        // ouvre la fenêtre (et réaffiche la bulle)
Debogage.surChangement(() => badge.textContent = Debogage.aTraiter());
```

Sur ordinateur : **Ctrl + Maj + D** ouvre ou ferme l'outil, **Ctrl + Entrée** enregistre, **Échap** ferme. Ajouter `?debug=1` à l'adresse réaffiche la bulle.

### Options

| Option | Par défaut | Rôle |
|---|---|---|
| `projet` | titre de la page | Nom du projet. |
| `version` | `""` | Version de l'appli testée. |
| `ecran` | automatique | Fonction qui renvoie le nom de l'écran en cours. |
| `etat` | — | Fonction qui renvoie l'état de l'appli (objet ou texte, 3 000 caractères au plus). |
| `db` | `"auto"` | `"auto"` (base de l'artifact), un objet compatible (`collection().doc().set/update/delete`, `onSnapshot`), ou `false` (appareil seulement). |
| `collection` | `"debugnotes"` | Nom de la collection. |
| `bulle` | `true` | Bulle visible au premier lancement (ensuite, le choix de l'utilisateur est retenu). |
| `langue` | `"fr-FR"` | Langue de la dictée. |
| `ecouter` | — | `async () => texte` : reconnaissance vocale native. |
| `partager` | — | `(nomFichier, texte) => …` : bouton « Partager » dans l'export. |
| `telecharger` | — | `(nomFichier, blob) => …` : remplace le téléchargement par défaut. |
| `ignorer` | `[data-debogage-ignorer]` | Sélecteur des éléments jamais photographiés. |
| `surNote` | — | `(note) => …` : appelé après chaque nouvelle note. |
| `couleurs` | détection | `{ accent, fond, texte }` : impose les couleurs de l'appli au lieu de les détecter. |
| `raccourci` | `true` | Active Ctrl + Maj + D. |

### API

`Debogage.ouvrir(vue)` (`"note"`, `"liste"`, `"reglages"`, `"interface"`) · `reinitialiserInterface()` · `fermer()` · `afficher()` · `masquer()` · `basculer()` · `noter(texte)` · `notes()` · `aTraiter()` · `surChangement(f)` · `texteClaude(tout)` · `exporterZip()` · `exporterJson()` · `definirVersion(v)`.

## Le circuit avec Claude

1. On teste l'appli et on note au fil de l'eau (bulle, capture, dictée…).
2. Bulle › ⚙ › **Copier les notes à traiter** → coller dans la conversation avec Claude (ou le ZIP, pour joindre les captures). Dans un artifact, Claude peut aussi relire directement la collection `debugnotes`.
3. Claude corrige et publie une nouvelle version.
4. Notes › **Vérifier une par une** : « ✓ Corrigé » enregistre la version de correction ; si le problème revient plus tard, ⋯ › **Rouvrir**.

## Tableau de bord multi-projets

`tableau-de-bord/index.html` est une page autonome (à publier comme artifact avec les capacités `db`, `assets` et `downloads`). Dans chaque appli : bulle › ⚙ › **Pour le tableau de bord** (ou le ZIP), puis **Importer un export** sur le tableau de bord (ou glisser le fichier). Un nouvel import du même projet met à jour sans doublon. On y filtre par projet, statut et écran, on lit chaque note en détail (capture, zones, éléments, erreurs, parcours), on marque corrigé avec la version, et on copie le texte pour Claude.

## Développer

```
src/                 les modules (00 → 12) et styles.css
vendor/              html-to-image 1.11 (MIT), pour les captures
outils/construire.py assemble dist/debogage.js et tableau-de-bord/index.html
exemple/index.html   petite appli de démonstration (autonome.html : la même en un seul fichier)
tests/               tests Chrome (téléphone + ordinateur + tableau de bord)
```

```bash
python3 outils/construire.py        # après chaque modification de src/
python3 tests/test_navigateur.py    # 83 vérifications, captures dans tests/captures/
```

Aucune dépendance à installer pour utiliser l'outil ; les tests demandent Python, Playwright et Chrome.

## Format d'une note

```json
{
  "uid": "mwby…", "at": "2026-01-15T10:42:00Z", "texte": "…", "ecran": "Accueil › liste",
  "via": "texte | voix | copie | appli", "projet": "mon-appli", "version": "0.7",
  "valide": null, "corrigeeEn": "", "rouvertes": [{ "at": "…", "version": "0.8", "corrigeeEn": "0.7" }],
  "pieces": [
    { "type": "capture", "image": { "cle": "cap-…", "asset": "…" }, "zones": [{ "n": 1, "consigne": "…", "elements": [{ "s": "#nouveau", "t": "button « + Nouveau »" }] }] },
    { "type": "element", "selecteur": "…", "texte": "…", "taille": "…", "styles": { "police": "…", "couleur": "…", "fond": "…", "contraste": "…" } },
    { "type": "texte", "texte": "…", "remplacement": "…", "element": "…" },
    { "type": "mesure", "genre": "distance | ecart | couleur", "resume": "…", "details": "…" }
  ],
  "contexte": { "erreurs": [], "parcours": [], "appareil": {}, "etat": "…", "url": "…" }
}
```

Les notes au format simple (`texte`, `ecran`, `at`, `valide` ou `statut`) sont relues telles quelles.
