# MISSION 77 — Le bien vendeur s'enregistre en un geste et mène tout droit aux concurrents

**Date** : 08/10/2026 · **Origine** : essai de Laurent. « Il ne me met pas le type de bien, il y a
5 boutons pour enregistrer, et "Trouver les concurrents" me dit de remplir le bien vendeur. »
Causes lues dans le code : `map-listing-to-property.ts` force `property_type` et `floor` à null ;
« Trouver des concurrents → » est un lien placé AVANT le bouton d'enregistrement ; l'erreur
d'enregistrement s'affiche en haut de page, hors de vue ; diagnostics et copropriété ont leur bouton.

## Objectif

Après un import, le conseiller relit, saisit sa fourchette, clique sur un seul bouton : tout est
enregistré et la recherche de concurrents démarre, sans message « renseignez d'abord ».

## Critères d'acceptation (testables à l'écran)

1. Une annonce remplit le type de bien (titre, adresse de la page ou données de l'annonce, via
   `normalizePropertyType`) et, quand elle les publie, l'étage et le nombre d'étages.
2. « Type de bien » devient une liste : Appartement, Maison, Terrain, Immeuble, Local commercial,
   Parking. Libellé français enregistré ; une valeur en texte libre s'affiche dans le bon choix.
   Pas de migration.
3. Un seul bouton « Enregistrer », fixé en bas de la fenêtre (comme M51), enregistre en une fois
   bien, diagnostics et copropriété ; leurs boutons propres disparaissent, les sections sont
   visibles dès le départ. La barre dit « Modifications non enregistrées » ou « Enregistré ».
4. Dans la même barre, « Trouver des concurrents → » enregistre puis ouvre la recherche ;
   « ← Retour au dossier » enregistre aussi avant de partir.
5. Ville ou type manquant : on ne part pas, la barre dit « Il manque : type de bien » et un clic
   amène sur le champ. Une erreur de saisie se lit dans la barre (« 2 champs à corriger »).
6. Arrivé sur la recherche sans ville ou sans type, le message nomme le champ et son lien ouvre la
   fiche sur ce champ.
7. `tests/e2e/parcours.spec.ts` suit le nouveau bouton ; `npm run e2e` est vert.

## Décisions à respecter

- M38 (prix lu jamais dans un champ, fourchette jamais pré-remplie), M51 (bouton unique fixé),
  M52 (bascule automatique dans le Live), M54 (le type est un filtre dur : il doit être juste).

## Hors périmètre

- L'extension (en examen sur le Chrome Web Store), le plafond de 20 photos, le Live.

## Essai sur l'URL d'essai

Nouveau dossier, import de l'annonce Bien'ici de la mission 76 (Cagnes-sur-Mer, maison 9 pièces) :
« Maison » est choisi. Saisir une fourchette, cliquer directement sur « Trouver des concurrents »
(jamais sur « Enregistrer ») : la recherche démarre ; revenir : tout est là. Annonce SeLoger
d'appartement : « Appartement ». Vider la ville : la barre dit ce qui manque.
