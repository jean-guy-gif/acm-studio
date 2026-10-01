# MISSION 65 — La recherche : le conseiller filtre, ACM lit ce qu'il voit

**Date** : 1er octobre 2026 · **Origine** : plan de déblocage §2-B, confirmé à l'écran le 01/10 : la
recherche automatique (Nice, 4P 80 m², 400–480 k€) ne propose aucun vrai 4P, alors que la même
recherche faite à la main sur SeLoger (Nice, appartement, 400–480 k€, 4 pièces, 75–90 m²) affiche
**56 appartements**. Mesure faite sur les vraies pages
de Nice : environ 80 annonces non filtrées par passe. Pour un 4P de 80 m² entre 400 et 480 k€, on
trouve **un seul** vrai 4 pièces. La recherche automatique ne peut lire que la 1re page sans filtre
(robots.txt) et aucun réglage n'y changera rien. Le conseiller, lui, filtre son portail en 20
secondes.

## Préalable (toi, 5 min)

Sur SeLoger, Bien'ici, Green Acres et Maisons & Appartements, lance une recherche **filtrée** :
appartement, 4 pièces, 75–85 m², ta fourchette, ta commune. Pour chaque page : DevTools (Cmd+Option+I)
→ onglet Elements → clic droit sur `<html>` → Copy → Copy outerHTML, puis colle le tout dans un
fichier de `src/features/competitor-search/__fixtures__/filtre/`. Nomme les fichiers
`seloger.html`, `bienici.html`, `green-acres.html` et `maisons-appartements.html`, et note l'adresse
de chaque page.

## Objectif

Le conseiller fait sa recherche filtrée sur le portail, dans son navigateur. Dans ACM, un bouton
« Lire ma recherche » récupère les cartes de l'onglet qu'il a laissé ouvert, **sans aucune nouvelle
requête au portail**. La suite existe déjà : lecture des cartes (M50), les quatre filtres (M61),
retenir ou écarter, import.

## Mesure d'abord (puis arrête-toi si un point est rouge)

Les lecteurs de cartes actuels lisent-ils les pages **filtrées** ? Donne, par portail, le nombre de
cartes lues, et le nombre de candidats admis au cran 1 pour 4P 80 m².

## Critères d'acceptation

1. Extension (version suivante) : une fonction `readOpenTab` trouve les onglets ouverts sur une page
   de résultats d'un portail autorisé et lit `document.documentElement.outerHTML`. Elle ne recharge
   rien, ne navigue pas et ne clique pas. S'il y a plusieurs onglets, elle renvoie la liste (titre et
   portail) et le conseiller choisit. Permissions inchangées.
2. Écran de recherche : « Lire ma recherche » devient le bouton principal, avec l'aide « Faites votre
   recherche filtrée sur le portail (pièces, surface, prix, secteur), laissez l'onglet ouvert, puis
   cliquez ici. » La recherche automatique reste disponible en second, sans changement.
3. Les cartes lues suivent le même chemin que la recherche automatique : `extractSearchResults` →
   `filterAndDedupeCandidates` → `rankCandidates` (filtres et mentions de desserrage de M61).
4. Sans extension, le collage du code de la page de résultats (déjà existant) reste le repli, et
   l'écran l'indique.
5. Corrige la phrase de l'écran devenue fausse avec M61 (`competitor-search-panel.tsx` : « Rien n'est
   masqué : une annonce éloignée descend dans la liste, elle ne disparaît pas »), ainsi que le
   commentaire de `types.ts` qui dit la même chose.
6. Tests sur les 4 fixtures filtrées : au moins une carte lue par portail, et les chiffres du cran 1
   pour 4P 80 m² dans le rapport. Ne force rien.

## Hors périmètre

Pagination, recherche au quartier (chantier en suspens), leboncoin, nouvel extracteur d'annonce.

## Essai sur l'URL d'essai

SeLoger filtré sur 4P 75–85 m² dans ta commune → « Lire ma recherche » → la liste ne contient que
des 4P entre 76 et 84 m², sauf mention d'élargissement → retenir 3 annonces → importer → elles
apparaissent dans les concurrents du dossier. Recommence avec Bien'ici.
