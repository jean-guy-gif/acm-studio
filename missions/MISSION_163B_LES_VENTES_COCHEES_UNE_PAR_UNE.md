# MISSION 163 B — Le conseiller choisit, vente par vente, les ventes réelles que verra le vendeur

**Date** : 20/11/2026 · **Origine** : décision de Jean-Guy (20/11) : « il peut cocher ou décocher une
par une les ventes réalisées ». Les 6 plus proches sont cochées d'avance, le conseiller décoche, sans
limite : « dans le cas d'un appartement sur une grosse copro, toutes les données peuvent être
importantes ». Après la 163 A.

## Objectif

Sur « Avant le rendez-vous », le bloc « Ventes réelles autour du bien » coché déplie la liste des
ventes. Le Live, l'Étude de marché et la synthèse ne listent que celles que le conseiller a cochées.

## Maquette

Validée par Jean-Guy le 20/11/2026 : `missions/maquettes/M163-fil-conducteur/ecran-ventes-a-cocher.png`
(ordinateur, tablette, téléphone) et `NOTES.md`.

## Critères d'acceptation (testables à l'écran)

1. **Le bloc coché dans `neighbourhood-choice-panel` déplie la liste** :
   - le titre « Les ventes que verra le vendeur : 6 sur 24 » ;
   - une case par vente : date, rue, pièces, surface, distance, prix ;
   - rangées de la plus proche du bien (surface, puis pièces) à la plus lointaine ;
   - deux liens : « Les 6 plus proches de votre bien » et « Tout décocher ».
2. **Le choix par défaut.** Au premier choix du bloc, les 6 plus proches sont cochées d'avance. Le conseiller coche ou décoche librement, sans limite. Aucune vente cochée : le bloc reste montré, la frise seule, sans tableau.
3. **L'enregistrement.** « Enregistrer le choix » (inchangé, en contour, M146) garde les ventes cochées dans l'instantané (M159). Elles sont relues au serveur dans la vue du jour : jamais une vente qu'envoie le navigateur sans qu'Academia la donne. Avant toute migration, l'architecte dit si la contrainte de `project_neighbourhood_snapshots` l'admet dans le bloc `ventes` ; sinon, migration relue par le gardien-sql.
4. **Ce que voit le vendeur, aux trois endroits** (Live, Étude de marché, synthèse) :
   - la frise montre toutes les ventes ;
   - les ventes cochées y sont numérotées et listées, dans le même ordre ;
   - les autres restent des points sans prix.
5. **Le Live.** L'écran des ventes réelles liste les ventes cochées. Au-delà de ce qui tient sans défiler aux trois fenêtres de M148 B, la liste défile en elle-même, jamais la page.
6. **Les verrous.** Le choix se verrouille comme les blocs : Live commencé, dossier conclu ou archivé (M159), à l'écran, au serveur et en base. Un instantané d'avant la mission se lit comme « les 6 plus proches ».
7. **Rien d'Academia n'est réécrit.** La rue de démonstration reste masquée (Correctifs 161).

## Décisions à respecter

M146 (un seul bouton plein), M148 B (le Live ne défile pas), M159 (instantané, verrous, relu au
serveur), Correctifs 161 (titre des ventes, rue de démonstration), M162 (tableau sur plusieurs pages).

## Hors périmètre

- Ajouter une vente qu'Academia ne donne pas.
- Changer le rayon ou la fourchette de surface (règle de Laurent).

## Essai sur l'URL d'essai

E2E au premier plan, démo remise à zéro, dossier de Mme Garcia :
- cocher « Ventes réelles », lire « 6 sur 24 », décocher une vente, en cocher deux, enregistrer ;
- le Live montre 7 ventes listées ;
- l'Étude de marché et la synthèse montrent les mêmes 7 ventes.
