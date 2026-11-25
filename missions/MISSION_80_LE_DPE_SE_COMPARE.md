# MISSION 80 — Le DPE se compare, et prépare le vendeur au passage du diagnostiqueur

**Date** : 08/10/2026 · **Origine** : Laurent. « La note DPE doit être un élément de comparaison :
on l'a dans les annonces des concurrents. Si on l'a aussi pour le bien vendeur, on compare. Sinon,
on dit au client qu'après le passage du diagnostiqueur il faudra être dans telle lettre, et que si
sa lettre est moins bonne, il faudra peut-être réajuster la stratégie prix. »
Aujourd'hui : la recherche de concurrents ignore le DPE ; « Classe DPE » est un texte libre.

## Étape 1 — mesurer

Part des annonces Stream Estate et des concurrents importés qui portent une classe DPE. On ne
modifie pas l'extension (en examen sur le Chrome Web Store).

## Critères d'acceptation (testables à l'écran)

1. « Classe DPE » du bien vendeur devient une liste A à G ; vide = pas encore de DPE.
2. Recherche : chaque carte affiche la lettre en couleur (A vert → G rouge) et, si le bien
   vendeur en a une, l'écart : « DPE D, comme le vôtre », « DPE F, deux classes de moins ».
3. % de correspondance : DPE sur 10 points (même classe 10, une d'écart 5, au-delà 0), seulement
   si les deux sont connus. Le DPE ne filtre jamais et ne crée aucun cran.
4. Préparation : sous les concurrents retenus, « DPE de vos concurrents : 2 C, 4 D, 1 E,
   3 non indiqués ».
5. Live, un écran « Le DPE face au marché », après le dernier concurrent. Repère = la lettre
   médiane des concurrents qui en affichent une.
   - DPE du vendeur connu, meilleur que le repère : « Votre DPE est un atout face à vos concurrents. »
   - Égal : « Votre DPE est dans la moyenne de vos concurrents. »
   - Moins bon : « Votre DPE est moins bon que celui de la plupart de vos concurrents : les
     acheteurs compareront. À intégrer dans la stratégie de prix. »
   - Inconnu : « Vos concurrents affichent surtout D. Après le passage du diagnostiqueur, votre
     bien devra être en D ou mieux pour rester dans la course ; au-delà, il faudra peut-être
     ajuster la stratégie de prix. »
   - Aucun concurrent avec DPE : l'écran n'apparaît pas.
6. Jamais de montant ni de prix calculé sur cet écran (l'outil ne produit aucune estimation).
7. Grille de comparaison du Live : le DPE passe juste après la surface, en lettre colorée.

## Décisions à respecter

- M36 (aucune estimation), M51 (bouton du Live), M70 et M71 (le % et les critères inconnus),
  M72 (le Live tient sur tablette : `npm run e2e` vert).

## Hors périmètre

- La base ADEME : la mission 79 est abandonnée, la lettre du bien vendeur est saisie par le
  conseiller. L'extension, les règles légales de location.

## Essai sur l'URL d'essai

Dossier de Saint-Laurent-du-Var, « Classe DPE » vide : les cartes montrent leur lettre ; dans le
Live, l'écran dit « Vos concurrents affichent surtout … ». Mettre G : il dit « moins bon… ».
Mettre A : « un atout ».
