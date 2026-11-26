# MISSION 84 — Un clic sur un concurrent à prospecter, et son dossier PDF est prêt

**Date** : 09/10/2026 · **Origine** : Laurent. « Un dossier que j'ai plus qu'à télécharger pour le
présenter aux concurrents : mon bien face au leur, puis mutualiser nos forces plutôt que les
diviser. Généré automatiquement, modifiable par le collaborateur, aux couleurs de l'agence. »
**Maquette validée** : `missions/maquettes/M84-maquette-dossier-prospection.html` (+ `.pdf`).
Reprends sa mise en page et ses textes ; les données d'exemple deviennent les vraies.
**Prérequis** : mission 83 validée (exclusivité, vendu par).

## Critères d'acceptation (testables à l'écran)

1. Liste de tournée (M75) : bouton « Préparer le dossier » par concurrent. Version choisie seule :
   exclusivité → **confrère** (1 page A4) ; particulier ou mandat simple → **propriétaire**
   (A4 recto-verso) ; inconnu → le conseiller choisit. Pas de dossier propriétaire sans adresse
   confirmée par le Localisateur (sinon : « Adresse à confirmer avant d'envoyer »).
2. Page d'édition pré-remplie, chaque texte modifiable (titre, lettre, message clé, 3 points de la
   proposition, accroche du contact) ; « Télécharger le PDF ». Le texte modifié est gardé par
   concurrent. Migration soumise avant d'être appliquée.
3. Aux couleurs, logo et police de l'agence (Administration) ; nom, photo, téléphone, e-mail du
   conseiller ; QR code vers sa carte de contact (vCard).
4. **Selon le type** de bien : accords (« Votre maison et la nôtre », « Votre appartement et le
   nôtre », « Votre terrain et le nôtre »…) et lignes comparées (maison : surface, pièces,
   terrain, piscine, garage ; appartement : étage, ascenseur, extérieur, parking, charges ;
   terrain : surface, viabilisation, constructibilité ; local/immeuble : surface, affectation),
   DPE et prix. Seuls les champs connus des deux côtés s'affichent, jamais « — ».
   Appartement : en-tête « Aux copropriétaires du … » (l'immeuble est connu, pas le lot).
5. « Ce qui les rapproche » (même secteur + distance, même gamme de prix, surface proche) et
   « Ce qui les distingue » dans les deux sens, faits seulement. Jamais « mieux », « moins bien »,
   « plus cher », « moins cher ».
6. **Prix** : interrupteur « Afficher les prix ». Par défaut allumé si notre prix est inférieur,
   égal ou au plus 5 % au-dessus du leur ; éteint au-delà, et la ligne devient « Même gamme de
   prix » sans chiffre.
7. Version propriétaire : le mot « mandat » n'apparaît nulle part. Proposition en 3 points :
   « Découvrir votre projet et votre bien plus en détail, et vous montrer précisément le bien
   concurrent et l'analyse de ce marché » ; « Présenter votre bien à mes acquéreurs dont le projet
   correspond » ; « Vous rendre compte de chaque visite ». Version confrère : honoraires partagés
   par accord inter-cabinet écrit, sans taux.
   Page 1 : la photo de NOTRE bien qui le met le plus en valeur (la photo principale de
   l'annonce par défaut, le conseiller en choisit une autre parmi les photos du bien vendeur) ;
   à côté, la carte du concurrent sans photo.
8. Garde-fous : seulement les infos publiques de NOTRE annonce (jamais nom du vendeur, valeur
   perçue, analyse, fourchette) ; jamais les photos du concurrent ; jamais le nom de son
   propriétaire ; mention « Pour ne plus être sollicité » ; dossier disponible seulement si
   notre bien a une annonce publiée (lien renseigné). Un test vérifie chaque interdit.

## Décisions à respecter

- M75 (adresses jamais côté vendeur), M74 (formateur de nombres), M80 (lettre DPE colorée).

## Hors périmètre

- Envoi automatique (courrier, e-mail), suivi des relances, tableau de bord de prospection.

## Essai sur l'URL d'essai

Dossier conclu « mandat signé » avec 3 concurrents (une exclusivité, un particulier, un appartement) :
chacun ouvre la bonne version ; modifier le titre, télécharger : le PDF est aux couleurs de
l'agence, avec le texte modifié ; rouvrir : la modification est gardée. Un bien plus cher de
plus de 5 % : « Même gamme de prix », sans chiffre.
