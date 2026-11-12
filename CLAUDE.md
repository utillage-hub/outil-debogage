# Consignes pour Claude

Ce dépôt est **l'outil de débogage commun** à tous les projets. L'utilisateur écrit en français ; l'interface et la documentation restent en français, tutoiement dans l'interface.

Aucune donnée réelle dans ce dépôt : la démo, les tests et la documentation n'utilisent que des données inventées.

## Modifier l'outil
- Le code source est dans `src/` (modules numérotés, concaténés dans une seule fonction : les `const` d'un module sont visibles des suivants). Ne jamais modifier `dist/` ni `tableau-de-bord/index.html` à la main : lancer `python3 outils/construire.py`.
- Après chaque changement : `python3 tests/test_navigateur.py`, puis regarder les captures dans `tests/captures/` (téléphone 390 px et ordinateur 1440 px).
- Mettre à jour `VERSION` et `CHANGELOG.md` à chaque version publiée.
- Priorité au téléphone : cibles de 44 px au moins, gestes simples, rien qui dépende du survol. Look neutre (graphite + ambre) pour ne jamais se confondre avec l'appli testée. Jamais la couleur seule pour porter un sens.

## Intégrer l'outil dans un projet
1. Copier le contenu de `dist/debogage.js` dans le projet (dans un `<script>` à la fin de la page pour un artifact en un seul fichier).
2. Appeler `Debogage.init({ projet, version, ecran, etat })` : `ecran` doit renvoyer un nom d'écran lisible (« Saisie › étape montant »), `etat` les quelques variables utiles pour reproduire un problème.
3. Artifact : déclarer `db`, `assets`, `downloads`, `dictation` (et `user` avec `db`).
4. Relier l'entrée « Débogage » du menu de l'appli à `Debogage.ouvrir()`.
5. Retirer l'ancien code de débogage propre au projet ; garder la collection `debugnotes` (les anciennes notes sont relues).

## Traiter des notes de débogage
- Lire les notes (texte collé, ZIP, ou collection `debugnotes` de l'artifact), corriger, puis indiquer pour chaque note la version qui la corrige.
- Les sélecteurs CSS et les zones numérotées ①②… pointent l'endroit exact ; les erreurs JavaScript et le parcours aident à reproduire.
