# MISSION 144 — Le vendeur ne voit jamais un écran vide ni un chargement entre deux écrans du Live

**Date** : 07/11/2026 · **Origine** : audit UX/UI du 07/11, B2 ; mesure `M144-mesure-du-live.md`. Le cas
réel : le Live chez le vendeur, sur la 4G du conseiller, souvent faible dans une maison.

## Objectif

L'écran suivant est prêt avant qu'on le demande : photos chargées d'avance, aucune attente du
serveur hors des révélations, aucun écran transparent.

## Maquette

Dispensée : la 144 ne change aucune disposition (C8, l'accueil, passe à la 146 avec sa maquette).

## Critères d'acceptation (testables à l'écran)

1. Toutes les photos du Live se préchargent dès son lancement, pendant l'introduction, si leurs
   adresses peuvent être données au navigateur sans rien révéler d'autre (aucun prix, aucune donnée
   gardée) ; sinon les deux écrans suivants. Rien ne bloque : l'introduction se quitte quand on
   veut, les photos arrivent ensuite.
2. Les adresses signées des photos restent valables bien plus longtemps qu'un Live : 2 h au moins.
3. Le préchargement terminé, plus aucun cadre photo vide après l'introduction.
4. « Votre bien », la valeur perçue et « Un sérieux concurrent ? » sont enregistrés en fond,
   enchaînés dans l'ordre ; une révélation attend les enregistrements qui la précèdent (M89) ;
   un échec garde « Réessayer » (M92).
5. Après un rechargement de page, le Live reprend au dernier écran dont la réponse est enregistrée
   en base, jamais plus loin.
6. Révélations (prix, durée, marché) : livrées après la réponse, jamais avant (M51, M82, M95, M96) ;
   l'écran reste en place, le bouton montre tout de suite qu'il est pressé, puis on avance à
   l'arrivée. Le serveur ne relit que ce qu'il livre. L'autre façon (passer tout de suite à la
   révélation, le prix en animation d'attente) va dans `docs/IDEES.md`.
7. Fondu : aucun entre deux écrans du même concurrent ; au changement de concurrent, 150 ms au plus,
   depuis 60 % d'opacité.
8. Un e2e chronométré, tablette, en 4G rapide ET en 4G lente : < 300 ms hors révélations, aucune
   image sans contenu lisible au-delà de 150 ms, aucun cadre photo vide après le préchargement.

## Décisions à respecter

M112 (contrôle serveur de `/live/{id}`), M107 (rien de l'annonce devant le vendeur), M110 et M112
(ordre et concurrents montrés figés), M109 (dossier conclu verrouillé), M95 (rythme), M92 (réponses
figées), M104 (« Non » n'envoie aucune devinette), M89 (le Live ne se fige jamais).

## Hors périmètre

C8 (mission 146), le contenu des écrans, les photos des portails (jamais copiées), une migration.

## Réponses de Jean-Guy (07/11)

Les 3-4 s de l'audit venaient d'un navigateur simulant une tablette : on ne cherche pas plus loin.
