# MISSION 74 — Des chiffres lisibles et plus aucun bouton inutile

**Date** : 06/10/2026 · **Origine** : relecture de Laurent sur l'URL d'essai (captures du 06/10).
« -1.7000000000000028 m² » dans l'analyse, et des boutons d'anciennes versions encore à l'écran.
« Je veux retirer ce qui ne sert plus, pour que ce soit le plus clair possible pour les
utilisateurs. »

## Objectif

Chaque nombre affiché suit le format français, avec 2 décimales au plus, et l'application ne montre
plus que ce qui sert.

## Étape 1 — inventaire, puis arrête-toi

Fais un tableau de tout ce qui, à l'écran, est hérité, en double ou inutile depuis M65, M69, M71 et
M73 : boutons, zones, pages, textes d'aide. Une ligne par élément, avec 4 colonnes : écran, élément,
pourquoi il ne sert plus, recommandation (retirer ou garder). Rends-le et attends ma réponse. Sont
déjà décidés, à retirer sans redemander :

- le favori « Envoyer vers ACM Studio », partout, avec sa page et son code s'ils ne servent plus qu'à
  lui ;
- « Lancer la recherche automatique », et « Lire un seul onglet » ;
- le long paragraphe gris d'explication sous les boutons de « Trouver des concurrents » (une ligne
  d'aide au plus).

À trancher dans le tableau : les zones « coller la page ». L'extension est désormais obligatoire
(M73). Ma préférence : les retirer et afficher, si l'extension manque, un seul message clair pour
l'installer.

## Critères d'acceptation (après ma réponse)

1. **Un seul formateur de nombres** (`src/lib/format`), en `fr-FR`, utilisé partout où un nombre
   s'affiche : analyse, positionnement, Live, présentation, Suivi, cartes, %.
   - Format : virgule décimale, espace des milliers, 2 décimales au plus, aucun zéro inutile
     (« 64,7 m² », « −1,7 m² », « 4 739 €/m² », « 300 000 € »).
   - Un test empêche le retour d'un nombre brut (par exemple `-1.7000000000000028`).
2. « Analyse des prix » décrit le moins cher et le plus cher à partir des champs du bien (pièces,
   surface, quartier ou commune, prix, prix au m²), et plus avec le titre brut de l'annonce.
3. Les éléments décidés sont retirés, code mort compris, sans casser l'import par l'extension ni
   « Chercher les concurrents ».
4. `npm run e2e` est vert. Si un libellé du test disparaît, adapte le test.

## Hors périmètre

Toute nouvelle fonctionnalité, et tout changement de calcul (seul l'affichage change).

## Essai sur l'URL d'essai

Le dossier de test de Saint-Laurent : l'analyse ne montre que des nombres propres. Sur « Trouver des
concurrents », il ne reste que « Chercher les concurrents » et, en option, les deux boutons des
portails.
