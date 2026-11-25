# MISSION 83 — Chaque concurrent dit s'il est en exclusivité, et qui le vend

**Date** : 09/10/2026 · **Origine** : Laurent. « Dans le cas de l'exclusivité, c'est génial pour la
collaboration, mais tu dois l'identifier dans l'annonce : le titre, le texte, ou le bandeau sur une
photo. » Prérequis du dossier de prospection : propriétaire (particulier ou mandat simple) →
dossier propriétaire ; exclusivité → dossier confrère. Aujourd'hui ACM ne lit ni l'un ni l'autre.

## Étape 1 — mesurer avant de coder (aucune écriture)

Sur 3 annonces réelles par portail (SeLoger, Bien'ici, Green Acres, Figaro Immobilier, Maisons et
Appartements, Stream Estate), dont au moins une exclusivité et un particulier quand c'est possible,
dire OÙ l'information se trouve : donnée structurée de la page, badge HTML (« Exclusivité »),
titre, description, nom de l'annonceur, ou seulement incrustée dans une photo. Arrête-toi et
rends le tableau avant de coder.

## Critères d'acceptation (testables à l'écran)

1. Deux nouveaux champs par concurrent : **Vendu par** (agence · particulier · inconnu) et
   **Exclusivité** (oui · non · inconnu), avec leur provenance (donnée de l'annonce, badge,
   titre, description, photo, conseiller). Migration soumise avant d'être appliquée.
2. Ordre de lecture : donnée structurée, puis badge, puis titre, puis description (« exclusivité »,
   « en exclusivité », « mandat exclusif », « exclusif »… sans faux positif : « exclusivement »,
   « quartier exclusif » ne comptent pas ; un test par cas).
3. Bandeau incrusté dans une photo : seulement si l'étape 1 montre que c'est fréquent ET qu'aucune
   autre source ne le dit ; lecture de texte sur la 1re photo uniquement, côté serveur, gratuite.
   Sinon, on s'en remet au conseiller.
4. Le conseiller corrige en un clic sur la carte et dans la liste de tournée ; sa correction prime
   et n'est jamais écrasée par une relecture.
5. Liste de tournée : chaque ligne porte « Exclusivité · appeler le confrère » ou « Mandat simple /
   particulier · aller voir le propriétaire », ou « À vérifier ».
6. Jamais côté vendeur (Live, présentation), comme les adresses (M75).

## Décisions à respecter

- M48 (lecture cadrée au bloc de l'annonce), M75 (rien côté vendeur), extension non modifiée.

## Hors périmètre

- Le dossier de prospection lui-même (mission 84, après validation de la maquette).

## Essai sur l'URL d'essai

Importer une exclusivité SeLoger et une annonce de particulier : la carte dit « Exclusivité » et
« Particulier ». Corriger l'une à la main, rouvrir le dossier : la correction est restée. Mandat
signé : la liste de tournée sépare « appeler le confrère » et « aller voir le propriétaire ».
